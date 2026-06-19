// Server-side only — called exclusively from /api/analyze route.
// Uses APP_OPENAI_KEY from server env. Never exposed to the client.
//
// Two-call pipeline:
//   Call 1 (extractReportData) — extracts a structured inventory from raw PDF text.
//     Pure data extraction: accounts, late counts per bureau, inquiries, personal info items.
//   Call 2 (analyzeReport) — receives the structured inventory and applies 5-pass dispute rules.
//     No "did I notice this?" ambiguity — all accounts are pre-enumerated by Call 1.
// This eliminates count variance caused by pdfjs text-ordering differences across runs.

import OpenAI from 'openai';
import {
  AnalysisResultSchema,
  AIAnalysisResultSchema,
  ExtractionResultSchema,
  type ExtractionResult,
  type ValidatedAnalysisResult,
} from './schemas';
import type { UserInfo } from '@/types';
import { computeReportingDeadline, monthsBetween } from './dateMath';
import { preprocessReportText } from './reportPreprocess';

// Strips newlines and excess whitespace from user-supplied fields before
// injecting them into the prompt, preventing newline-based prompt injection.
function sanitizeField(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, 200);
}

function getClient(): OpenAI {
  const apiKey = process.env.APP_OPENAI_KEY;
  if (!apiKey) throw new Error('OpenAI API key is not configured on the server.');
  return new OpenAI({ apiKey });
}

// ── JSON Schemas ──────────────────────────────────────────────────────────────

const EXTRACTION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['creditScores', 'personalInfoItems', 'hardInquiries', 'accounts'],
  properties: {
    creditScores: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['bureau', 'score', 'rating'],
        properties: {
          bureau: { type: 'string' },
          score: { anyOf: [{ type: 'number' }, { type: 'null' }] },
          rating: { type: 'string' },
        },
      },
    },
    personalInfoItems: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['errorType', 'value', 'bureaus'],
        properties: {
          errorType: { type: 'string', enum: ['alternate_name', 'unknown_address'] },
          value: { type: 'string' },
          bureaus: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    hardInquiries: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['creditor', 'bureau', 'date'],
        properties: {
          creditor: { type: 'string' },
          bureau: { type: 'string' },
          date: { type: 'string' },
        },
      },
    },
    accounts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['creditor', 'accountNumber', 'dofd', 'bureauData'],
        properties: {
          creditor: { type: 'string' },
          accountNumber: { type: 'string' },
          dofd: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          bureauData: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['bureau', 'status', 'late30', 'late60', 'late90', 'balance', 'lastActivity', 'remarks'],
              properties: {
                bureau: { type: 'string' },
                status: { type: 'string' },
                late30: { type: 'integer' },
                late60: { type: 'integer' },
                late90: { type: 'integer' },
                balance: { type: 'string' },
                lastActivity: { type: 'string' },
                remarks: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
};

// negativeItems properties sent to the AI. reportingDeadline/pastReportingLimit
// are deliberately absent — they're pure date arithmetic from `dofd`, computed
// server-side in dateMath.ts and injected after the AI's response is parsed.
// OpenAI's strict:true mode requires every `properties` key to also be in
// `required`, so these two fields cannot be merely optional here — they must
// not exist in this schema at all.
const AI_NEGATIVE_ITEM_PROPERTIES = {
  priority: { type: 'string', enum: ['High', 'Medium', 'Low'] },
  creditor: { type: 'string' },
  accountNumber: { type: 'string' },
  type: { type: 'string' },
  balance: { type: 'string' },
  status: { type: 'string' },
  dateReported: { type: 'string' },
  reasons: { type: 'array', items: { type: 'string' } },
  impact: { type: 'string', enum: ['High', 'Medium', 'Low'] },
  impactPoints: { type: 'string' },
  laws: { type: 'array', items: { type: 'string' } },
  recommendedAction: { type: 'string' },
  bureaus: { type: 'array', items: { type: 'string' } },
  primaryBureau: { type: 'string' },
  disputeCategory: {
    type: 'string',
    enum: [
      'Not Mine',
      'Inaccurate Information',
      'Balance/Status Error',
      'Obsolete (Past Reporting Limit)',
      'Unverifiable Debt',
      'Re-Aged Account',
      'Duplicate Entry',
      'Account Closed/Paid Incorrectly',
      'Unauthorized Inquiry',
      'Late Payment Error',
      'Collection Not Validated',
      'Personal Information Error',
      'Cross-Bureau Inconsistency',
    ],
  },
  dofd: { anyOf: [{ type: 'string' }, { type: 'null' }] },
  disputeStrength: { type: 'string', enum: ['Strong', 'Moderate', 'Weak'] },
  specificViolation: { type: 'string' },
};

const AI_NEGATIVE_ITEM_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: Object.keys(AI_NEGATIVE_ITEM_PROPERTIES),
  properties: AI_NEGATIVE_ITEM_PROPERTIES,
};

const ANALYSIS_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'summary', 'scores', 'overall', 'strengths', 'weaknesses',
    'negativeItems', 'actionPlan', 'stats',
  ],
  properties: {
    summary: { type: 'string' },
    scores: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['bureau', 'score', 'rating'],
        properties: {
          bureau: { type: 'string' },
          score: { anyOf: [{ type: 'number' }, { type: 'null' }] },
          rating: { type: 'string' },
        },
      },
    },
    overall: {
      type: 'object',
      additionalProperties: false,
      required: ['rating', 'health', 'summary'],
      properties: {
        rating: { type: 'string' },
        health: { type: 'number' },
        summary: { type: 'string' },
      },
    },
    strengths: { type: 'array', items: { type: 'string' } },
    weaknesses: { type: 'array', items: { type: 'string' } },
    negativeItems: {
      type: 'array',
      items: AI_NEGATIVE_ITEM_SCHEMA,
    },
    actionPlan: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'description', 'impact'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          impact: { type: 'string', enum: ['High', 'Medium', 'Low', 'Positive'] },
        },
      },
    },
    stats: {
      type: 'object',
      additionalProperties: false,
      required: [
        'totalAccounts', 'negativeItemCount', 'latePayments',
        'hardInquiries', 'utilization', 'estimatedImprovement',
      ],
      properties: {
        totalAccounts: { type: 'number' },
        negativeItemCount: { type: 'number' },
        latePayments: { type: 'number' },
        hardInquiries: { type: 'number' },
        utilization: { type: 'string' },
        estimatedImprovement: { type: 'string' },
      },
    },
  },
};

// ── System prompts ────────────────────────────────────────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `You are a credit report data extraction engine. Extract every data point from the raw credit report text exactly as written. Do not evaluate, classify, prioritize, or skip anything. Your only job is to produce a complete, accurate, flat inventory.

The report text may contain inserted markers like "--- SECTION: ACCOUNTS ---" or inline hints like "[late30/60/90 precomputed: 4/1/1]". These are best-effort hints to help you locate data faster — they are NOT ground truth. Always verify against the surrounding raw text; if a hint looks wrong or inconsistent with the text around it, trust the raw text instead.

EXTRACTION RULES:

creditScores — find the credit score summary section (usually near the top):
  - One entry per bureau: "experian", "equifax", "transunion" (lowercase keys)
  - score: the numeric FICO/VantageScore integer shown, or null if not listed
  - rating: the rating label shown in the report (e.g., "Fair", "Good", "Poor") or "" if none
  - Always produce exactly three entries (one per bureau), even if some scores are null

personalInfoItems — scan the Personal Information / Consumer Statement section:
  - Alternate names: each name listed with a CLEARLY DIFFERENT SURNAME from the consumer → errorType = "alternate_name", value = full name as written. Do NOT flag nicknames, middle-name variations, or names where the surname matches. Only flag if someone else's surname appears.
  - Unknown addresses: ONLY flag an address where BOTH the city AND state differ from the consumer's current city/state. Credit reports routinely list prior addresses — these are normal and must NOT be flagged. Do NOT flag any address in the same city or state as the consumer's current address. Only flag addresses that could belong to a completely different person.
  - Do NOT extract employers — employer data is not included in this analysis.
  - bureaus = lowercase bureau key(s) where this item appears
  - If nothing qualifies, return []

hardInquiries — find every entry in the Hard Inquiries section:
  - creditor = exact company name as written
  - bureau = lowercase bureau key ("experian", "equifax", or "transunion")
  - date = inquiry date as written in the report

accounts — list EVERY account (open, closed, charged off, in collections, paid, current — all of them):
  Include ALL account types without exception: credit cards, retail/charge accounts, auto loans, mortgages, personal loans, student loans, government obligations (child support, tax liens), collections, charge-offs, utility accounts. Do not skip any account based on its type.
  IMPORTANT: Many reports show a separate "Collections" section with different field labels than the main account tables (e.g. "Date Opened" instead of "Open Date", "Current Rating" instead of "Account Status", "Original Creditor" instead of the furnisher name). Every entry in a Collections section is STILL an account and MUST be added to accounts[] — map its fields onto the same bureauData shape (status = the Current Rating / Status text, balance = Unpaid Balance, etc.). Do not treat a Collections section as separate from or excluded from the accounts list.
  bureauData contains one entry per bureau where this account appears:
    - bureau: lowercase key
    - status: exact Account Status text from that bureau column
    - late30: integer from "Times 30/60/90 Days Late" field — the FIRST number (e.g., "4/1/1" → 4, "2/2/42" → 2). Use 0 if "--", "N/A", or not present.
    - late60: integer — the SECOND number from the same field (e.g., "4/1/1" → 1, "2/2/42" → 2). Use 0 if "--", "N/A", or not present.
    - late90: integer — the THIRD number from the same field (e.g., "4/1/1" → 1, "2/2/42" → 42). Use 0 if "--", "N/A", or not present.
    - balance: balance amount as written ("$0", "$450", "N/A" if not shown)
    - lastActivity: Last Activity or Last Payment date ("MM/YYYY" or "N/A" if not shown)
    - remarks: Remarks or Comments text — exact text, "" if none
  dofd: Date of First Delinquency for this account ("MM/YYYY") or null if not found.

ACCOUNT COUNT VERIFICATION: After extracting accounts[], count them. If the report contains an Account Summary table, your total should approximately match that table's account count. If your count is significantly lower, you likely missed accounts — scan the report again for additional tradelines.

Do not infer or assume values. If a field is missing from the report text, use 0 (numbers), "" (strings), or null (dofd).`;

const ANALYSIS_SYSTEM_PROMPT = `You are an expert credit analyst and consumer rights attorney specializing in FCRA disputes. You receive a pre-extracted, structured credit report inventory and produce a JSON dispute analysis.

BUREAU KEY RULE: All bureau values must be LOWERCASE. Always use "experian", "equifax", "transunion".

PRIMARY BUREAU SELECTION — deterministic (no judgment calls):
  Hard inquiry → the exact bureau from the inventory
  Personal info error → the bureau listed; if multiple, use "experian"
  Late payment 30-day tier → bureau with highest late30; tiebreaker: alphabetical (equifax → experian → transunion)
  Late payment 60-day tier → bureau with highest late60; tiebreaker: alphabetical
  Late payment 90-day tier → bureau with highest late90; tiebreaker: alphabetical
  Closed account with balance → bureau showing highest numeric balance; tiebreaker: alphabetical
  Collection/Charge Off → bureau with most damaging status (Charge Off > Open > Closed); tiebreaker: alphabetical
  Cross-bureau inconsistency → bureau showing more damaging data; tiebreaker: alphabetical
  All other → first bureau alphabetically

===== SCORES & HEALTH =====

scores[]: Use the CREDIT SCORES section of the inventory. Produce exactly three entries (experian, equifax, transunion). Copy the numeric score as-is; if listed as "N/A" set score to null. Ratings: "Exceptional" (800+), "Very Good" (740-799), "Good" (670-739), "Fair" (580-669), "Poor" (<580) — use the rating from the inventory or derive it from the score.
overall.health: Integer 0-100. Derive from the scores and negative item count. Weight: payment history 35%, utilization 30%, account age 15%, credit mix 10%, inquiries 10%.

===== EVIDENCE REQUIREMENT (applies to ALL passes) =====

Every negativeItem must satisfy ALL THREE conditions before you create it:
1. The disputable fact must appear explicitly in the inventory — not inferred, assumed, or interpolated.
2. specificViolation must cite at least one concrete data value from the inventory: a specific date, a specific count (e.g., "late30=3"), a specific balance string, a specific status string, or a specific bureau name. Writing vague phrases like "reported inaccurately" or "information is incorrect" without citing actual inventory values is PROHIBITED.
3. If you cannot write a specificViolation that quotes actual inventory data, DO NOT create the item. Omit it entirely.

This rule prevents fabrication. Do not pad negativeItems[] to reach any expected count.

===== FIVE-PASS DISPUTE RULES =====

ONE ISSUE = ONE ITEM: The same account MUST appear multiple times if it has multiple disputable issues. Never merge. Each distinct legal violation = its own negativeItem.

PASS A — PERSONAL INFORMATION:
For EACH item in personalInfoItems, create exactly one negativeItem ONLY IF the error is clearly attributable to a mistake — not to a legitimate prior address or known name variant:
  - Alternate names: flag ONLY if the surname is clearly different from the consumer's surname. Do NOT flag middle-name variations or nicknames with the same surname.
  - Unknown addresses: flag ONLY if the city AND state are both different from the consumer's current city/state. Prior addresses in the same metro area or state are normal in credit reports and must NOT be flagged. Only flag an address that shows no plausible connection to this consumer.
  creditor = descriptive label using the actual value (e.g., "Alternate Name: Chad E James", "Unrecognized Address: 123 Main St")
  type = "Personal Information", accountNumber = "N/A", balance = "N/A", status = "Reported (N/A)"
  dofd = null, reportingDeadline = null, pastReportingLimit = false
  disputeCategory = "Personal Information Error"
  laws = ["FCRA §1681e(b)", "FCRA §1681i"], disputeStrength = "Strong"
  bureaus = the bureaus[] from the inventory entry (lowercase)
  primaryBureau = bureaus[0] or "experian" if multiple

PASS B — HARD INQUIRIES:
For EACH item in hardInquiries, create exactly one negativeItem:
  creditor = the creditor name, type = "Hard Inquiry", accountNumber = "N/A", balance = "N/A", status = "Hard Inquiry"
  dofd = null, reportingDeadline = null, pastReportingLimit = false
  disputeCategory = "Unauthorized Inquiry", laws = ["FCRA §1681b"], disputeStrength = "Strong"
  bureaus = [the bureau from inventory], primaryBureau = that bureau

PASS C — COLLECTIONS / CHARGE-OFFS:
For each account where any bureauData entry has status containing "Charge Off", "Collection", "Settled", "Repossession", or "Foreclosure":
  - One negativeItem for the collection/charge-off itself (disputeCategory = "Collection Not Validated")
  - If statuses differ across bureauData entries (e.g., "Charge Off" on one, "Closed" on another) → a SECOND negativeItem (disputeCategory = "Cross-Bureau Inconsistency")
  - If remarks differ materially across bureauData entries → a SECOND negativeItem (disputeCategory = "Cross-Bureau Inconsistency")

PASS D — LATE PAYMENTS (check each account independently):
Pass D applies to ALL account types without exception: credit cards, auto loans, mortgages, personal loans, government obligations (child support, tax liens), collections, retail accounts, or any other type. Do not skip any account based on its type.
First, scan the ACCOUNTS list top to bottom and build a mental checklist of every account that has a "[HAS LATE PAYMENTS -- 30-day=X 60-day=Y 90-day=Z]" line — that line is precomputed and tells you exactly which tiers are nonzero for that account; you do not need to re-derive it from the per-bureau lines below it. Every account on that checklist gets at least one negativeItem per nonzero tier listed. Do not stop partway through a long account list — apply Pass D to every account on the checklist, not just the first few.
For each account, evaluate each tier separately using the bureauData:
  - If any bureauData entry has late30 > 0 → create ONE negativeItem for 30-day lates (disputeCategory = "Late Payment Error")
  - If any bureauData entry has late60 > 0 → create a SEPARATE negativeItem for 60-day lates (disputeCategory = "Late Payment Error")
  - If any bureauData entry has late90 > 0 → create a SEPARATE negativeItem for 90-day lates (disputeCategory = "Late Payment Error")
  - DO NOT merge tiers. Three different late tiers = three separate items, even for the same account.
  Also:
  - Balance/Status Error: if an account has a "[HAS NONZERO BALANCE ON CLOSED/CHARGE-OFF ...]" line, that is precomputed confirmation the rule below is satisfied — create one negativeItem (disputeCategory = "Balance/Status Error") using the quoted bureau/status/balance. This check is independent of and in addition to any late-tier items for the same account — never skip it just because the account already has Late Payment Error items. Full rule for reference: any account where ANY bureauData entry has balance NOT "$0" AND NOT "N/A" AND NOT "" AND the same entry's status contains "Closed" (any wording such as "Account Closed", "Account Closed By Credit Grantor", "Closed") OR "Charge Off". Note: "$0.00" counts as $0 (skip). A non-zero balance on a closed or charged-off account means the consumer may still owe disputed funds.
  laws = ["FCRA §1681e(b)", "FCRA §1681s-2(a)(1)"]

PASS E — CROSS-BUREAU CONSISTENCY (accounts with 2+ bureauData entries):
For each such account, check all three. Only create an item when the difference is MATERIAL and CONCRETE — both bureaus' actual values must be quoted in specificViolation:
  E1. lastActivity gap: if the inventory shows a precomputed "[lastActivity gap: N months -- bureau=date, bureau=date]" annotation for an account, that means the gap is already confirmed >= 3 months — create one negativeItem and quote the exact dates/bureaus from the annotation in specificViolation. Do NOT recompute the gap yourself. If no such annotation is present for an account, there is no qualifying gap — skip E1 for that account entirely.
  E2. status values differ SEMANTICALLY — "Open" vs "Closed", "Open" vs "Charge Off", "Current" vs "Delinquent". Do NOT flag cosmetically different strings that carry the same meaning: "Account Closed", "Closed", and "Account Closed By Credit Grantor" are ALL equivalent statuses — do NOT create an E2 item for these. Only flag when one bureau says Open/Current and another says Closed/Derogatory. Quote both actual status strings in specificViolation.
  E3. remarks differ materially: one bureau's remarks contain a derogatory keyword ("delinquent", "late", "past due", "charge off", "collection", "repossession") that another bureau's remarks do NOT contain, AND both remarks are non-empty. Do NOT flag when one bureau's remarks is "" (empty) and the other has any remarks — absence of remarks is not a conflict. Quote both remarks strings in specificViolation.
  (E2 and E3 also apply in Pass C — do not duplicate; skip if already created in Pass C)
  disputeCategory = "Cross-Bureau Inconsistency", laws = ["FCRA §1681e(b)", "FCRA §1681i(a)(4)"]
  bureaus = the two bureaus with conflicting data, primaryBureau = bureau with more damaging data

===== CLASSIFICATION (all items) =====

dateReported: Use the most recent lastActivity date from the account's bureauData entries. Skip any entry where lastActivity is "N/A" — only consider entries with a real MM/YYYY date. If multiple bureaus have real dates, pick the latest one. Only output "N/A" if every bureauData entry has lastActivity="N/A". For hard inquiries use the inquiry date from the inventory. For personal info items use "N/A".

dofd: Use the dofd from the inventory account. Hard inquiries and personal info items → null.

reasons: Exactly ONE string, max 20 words. Be specific — cite actual values from the inventory (e.g., "Experian reports 3 late payments at 30 days, Equifax reports 2"). Never write generic phrases like "Multiple late payments reported across all bureaus."

recommendedAction: One short imperative sentence, max 12 words (e.g., "Dispute the 30-day late payment with Experian and Equifax.").

disputeStrength:
  "Strong" — Obsolete, re-aged, status/balance contradiction, duplicate, unauthorized inquiry, cross-bureau inconsistency, personal info with different surname
  "Moderate" — Unverifiable debt, unvalidated collection, late payment with supporting counts
  "Weak" — Generic inaccuracy without specific supporting data

specificViolation: One concrete sentence, max 25 words, citing actual values from the inventory (dates, counts, balances, bureau names).

===== OTHER FIELDS =====

stats.negativeItemCount: Set LAST — must equal the exact count of objects in negativeItems[].
stats.latePayments: total number of accounts with any late payment count > 0.
stats.hardInquiries: count of items in hardInquiries inventory.
stats.totalAccounts: count of items in accounts inventory.
stats.utilization: a percentage string like "18%" — estimate from balances in accounts inventory relative to their statuses.
stats.estimatedImprovement: a point-range string ONLY — format exactly like "50-120" (digits, dash, digits). No word "points", no other text.
actionPlan[]: Ordered High → Medium → Low → Positive. Reference actual creditor names and FCRA sections.`;

// ── Call 1: Extract structured inventory from raw PDF text ────────────────────

async function extractReportData(
  client: OpenAI,
  pdfText: string,
  fullName: string,
  fullAddress: string,
): Promise<ExtractionResult> {
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0,
    seed: 42,
    max_tokens: 8192,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'ExtractionResult',
        strict: true,
        schema: EXTRACTION_JSON_SCHEMA,
      },
    },
    messages: [
      { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Extract all data points from this credit report.

CONSUMER (use this to identify unrecognized personal information):
Name: ${fullName}
Address: ${fullAddress}

--- CREDIT REPORT START ---
${pdfText}
--- CREDIT REPORT END ---

Extract every account, every inquiry, and every personal info entry. Do not skip anything. Do not classify — only extract.`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error('Extraction call returned an empty response. Please try again.');

  const parsed: unknown = JSON.parse(raw);
  return ExtractionResultSchema.parse(parsed);
}

// ── Format extraction as a readable inventory for Call 2 ─────────────────────

function formatInventory(ex: ExtractionResult): string {
  const scoreLines = ex.creditScores.length === 0
    ? '  (none found)'
    : ex.creditScores.map((s) =>
        `  - ${s.bureau}: ${s.score ?? 'N/A'} (${s.rating})`
      ).join('\n');

  const piLines = ex.personalInfoItems.length === 0
    ? '  (none)'
    : ex.personalInfoItems.map((p) =>
        `  - ${p.errorType}: "${p.value}" | bureaus: ${p.bureaus.join(', ')}`
      ).join('\n');

  const inqLines = ex.hardInquiries.length === 0
    ? '  (none)'
    : ex.hardInquiries.map((i) =>
        `  - ${i.creditor} | bureau: ${i.bureau} | date: ${i.date}`
      ).join('\n');

  const accLines = ex.accounts.map((a) => {
    const bdLines = a.bureauData.length === 0
      ? '    (no bureau data found)'
      : a.bureauData.map((b) => {
          // Flatten remarks to one line so embedded newlines don't break inventory format
          const remarks = b.remarks.replace(/[\r\n]+/g, ' ').trim();
          return `    ${b.bureau}: status="${b.status}" | 30-day=${b.late30} 60-day=${b.late60} 90-day=${b.late90} | balance=${b.balance} | lastActivity=${b.lastActivity} | remarks="${remarks}"`;
        }).join('\n');

    // Precompute the Pass E1 cross-bureau lastActivity gap so the AI doesn't
    // have to do multi-step date arithmetic itself. Only annotate when the
    // gap meets the materiality threshold (>= 3 months) -- omit otherwise so
    // the inventory doesn't get noisy with "no gap" lines.
    const datedEntries = a.bureauData.filter((b) => b.lastActivity !== 'N/A');
    let gapLine = '';
    let maxGap = -1;
    let gapPair: [typeof datedEntries[number], typeof datedEntries[number]] | null = null;
    for (let i = 0; i < datedEntries.length; i++) {
      for (let j = i + 1; j < datedEntries.length; j++) {
        const gap = monthsBetween(datedEntries[i]!.lastActivity, datedEntries[j]!.lastActivity);
        if (gap !== null && gap > maxGap) {
          maxGap = gap;
          gapPair = [datedEntries[i]!, datedEntries[j]!];
        }
      }
    }
    if (gapPair && maxGap >= 3) {
      gapLine = `\n    [lastActivity gap: ${maxGap} months -- ${gapPair[0].bureau}=${gapPair[0].lastActivity}, ${gapPair[1].bureau}=${gapPair[1].lastActivity}]`;
    }

    // Surface the max late-tier counts across bureaus as a single salient
    // line at the top of the account block. The per-bureau lines below
    // already contain this data; this is purely a visibility aid so Pass D
    // doesn't have to mentally scan 1-3 separate bureau lines per account
    // across a long account list to notice a nonzero tier exists.
    const maxLate30 = Math.max(0, ...a.bureauData.map((b) => b.late30));
    const maxLate60 = Math.max(0, ...a.bureauData.map((b) => b.late60));
    const maxLate90 = Math.max(0, ...a.bureauData.map((b) => b.late90));
    const lateFlagLine = maxLate30 > 0 || maxLate60 > 0 || maxLate90 > 0
      ? `\n    [HAS LATE PAYMENTS -- 30-day=${maxLate30} 60-day=${maxLate60} 90-day=${maxLate90}]`
      : '';

    // Same visibility aid for the Pass D Balance/Status Error rule: flag any
    // bureauData entry that is closed/charged-off with a nonzero balance,
    // using the exact same zero-detection logic as computeMinimumExpectedItems
    // below so the prompt hint and the code-side floor never disagree.
    const balanceFlagEntry = a.bureauData.find((b) => {
      const isClosedOrCO = /closed|charge.?off/i.test(b.status);
      const bal = b.balance.replace(/[$,\s]/g, '');
      const isNonZero = bal !== '0' && bal !== '0.00' && bal !== 'N/A' && bal !== '' && bal !== '--' && bal !== '-';
      return isClosedOrCO && isNonZero;
    });
    const balanceFlagLine = balanceFlagEntry
      ? `\n    [HAS NONZERO BALANCE ON CLOSED/CHARGE-OFF -- ${balanceFlagEntry.bureau}: status="${balanceFlagEntry.status}" balance=${balanceFlagEntry.balance}]`
      : '';

    return `  ACCOUNT: ${a.creditor} #${a.accountNumber} | DOFD: ${a.dofd ?? 'N/A'}${lateFlagLine}${balanceFlagLine}\n${bdLines}${gapLine}`;
  }).join('\n\n');

  return `CREDIT SCORES:\n${scoreLines}\n\nPERSONAL INFO ITEMS (${ex.personalInfoItems.length}):\n${piLines}\n\nHARD INQUIRIES (${ex.hardInquiries.length}):\n${inqLines}\n\nACCOUNTS (${ex.accounts.length}):\n${accLines}`;
}

// Derives the floor on how many negativeItems Call 2 must return, purely from
// the structured inventory. If the AI returns fewer, we know it collapsed items.
// This is report-agnostic — the formula is the same for any credit report.
function computeMinimumExpectedItems(ex: ExtractionResult): number {
  let min = 0;

  // Pass A: one item per personal info entry
  min += ex.personalInfoItems.length;

  // Pass B: one item per hard inquiry
  min += ex.hardInquiries.length;

  for (const acc of ex.accounts) {
    const hasChargeOffOrCollection = acc.bureauData.some((b) =>
      /charge.?off|collection|settled|repossession|foreclosure/i.test(b.status)
    );

    // Pass C: collection/charge-off itself
    if (hasChargeOffOrCollection) min += 1;

    // Pass D: one item per non-zero late tier
    if (acc.bureauData.some((b) => b.late30 > 0)) min += 1;
    if (acc.bureauData.some((b) => b.late60 > 0)) min += 1;
    if (acc.bureauData.some((b) => b.late90 > 0)) min += 1;

    // Pass D: closed/charge-off with non-zero balance
    const hasClosedWithBalance = acc.bureauData.some((b) => {
      const isClosedOrCO = /closed|charge.?off/i.test(b.status);
      const bal = b.balance.replace(/[$,\s]/g, '');
      // Treat as zero: "0", "0.00", "N/A", "", "--", "-"
      const isNonZero = bal !== '0' && bal !== '0.00' && bal !== 'N/A' && bal !== '' && bal !== '--' && bal !== '-';
      return isClosedOrCO && isNonZero;
    });
    if (hasClosedWithBalance) min += 1;
  }

  return min;
}

// ── Call 2: Apply dispute rules to the structured inventory ───────────────────

async function runAnalysisCall(
  client: OpenAI,
  inventory: string,
  fullName: string,
  fullAddress: string,
  seed: number,
): Promise<ValidatedAnalysisResult> {
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0,
    seed,
    max_tokens: 16384,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'AnalysisResult',
        strict: true,
        schema: ANALYSIS_JSON_SCHEMA,
      },
    },
    messages: [
      { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Generate a complete credit dispute analysis for the consumer below, using the extracted inventory.

CONSUMER:
Name: ${fullName}
Address: ${fullAddress}

===== EXTRACTED CREDIT REPORT INVENTORY =====

${inventory}

===== INSTRUCTIONS =====

Apply all five passes to this inventory:
- Pass A: one negativeItem per personalInfoItem above
- Pass B: one negativeItem per hardInquiry above
- Pass C/D/E: evaluate every account above — do not skip any

ONE ISSUE = ONE ITEM: each distinct disputable fact (different tier, different violation, different legal basis) = its own row.
Do NOT add accounts not in this inventory. Do NOT skip accounts that are in this inventory.
Set stats.negativeItemCount LAST — it must match the exact length of the negativeItems array you write.`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error('The AI returned an empty response. Please try again.');

  const parsed: unknown = JSON.parse(raw);
  const aiResult = AIAnalysisResultSchema.parse(parsed);

  // Inject server-computed reportingDeadline/pastReportingLimit (pure date
  // arithmetic from dofd — the AI never produces these) and re-validate
  // against the full schema before returning, per the project's "always
  // validate AI output before returning to the client" rule.
  const negativeItems = aiResult.negativeItems.map((item) => ({
    ...item,
    ...computeReportingDeadline(item.dofd),
  }));

  return AnalysisResultSchema.parse({ ...aiResult, negativeItems });
}

// test-only exports -- used exclusively by scripts/run-pipeline.ts to isolate
// Call 1 / Call 2 variance for diagnosis. Not part of the production API;
// route.ts only ever imports analyzeReport().
export const __test__ = { extractReportData, runAnalysisCall, formatInventory, computeMinimumExpectedItems, getClient };

export async function analyzeReport(
  pdfText: string,
  userInfo: UserInfo,
): Promise<ValidatedAnalysisResult> {
  const client = getClient();

  const fullName = sanitizeField(`${userInfo.first} ${userInfo.last}`);
  const fullAddress = sanitizeField(`${userInfo.address}, ${userInfo.city}, ${userInfo.state} ${userInfo.zip}`);

  // Best-effort, additive pre-processing of the raw PDF text -- inserts
  // section markers and label-anchored hints when confidently detected,
  // otherwise passes the text through unmodified. Never blocks the pipeline.
  const preprocessed = preprocessReportText(pdfText);
  console.info(
    `[reportPreprocess] sections detected: ${preprocessed.sectionsDetected.join(', ') || 'none'}, late-tier hints: ${preprocessed.lateTierAnnotationCount}`,
  );

  // Call 1 — extract structured inventory
  const t0 = Date.now();
  const extraction = await extractReportData(client, preprocessed.text, fullName, fullAddress);
  const tExtract = Date.now();
  console.info(`[analyzeReport] Call 1 (extraction) took ${tExtract - t0}ms`);
  const inventory = formatInventory(extraction);

  // Derive expected floor from inventory math — if Call 2 returns fewer, retry once
  const minimumExpected = computeMinimumExpectedItems(extraction);

  // Call 2 — run both seeds concurrently rather than retrying sequentially
  // only when the first falls short. The AI's seed+temperature:0 determinism
  // is best-effort, not guaranteed, so a single attempt can undershoot the
  // mechanical floor; racing both from the start trades ~2x Call 2 API cost
  // for cutting that tail latency roughly in half (no longer pay for a full
  // second sequential call only after discovering the first was short).
  const [firstResult, retryResult] = await Promise.all([
    runAnalysisCall(client, inventory, fullName, fullAddress, 42),
    runAnalysisCall(client, inventory, fullName, fullAddress, 99),
  ]);
  const tCall2 = Date.now();
  console.info(
    `[analyzeReport] Call 2 (raced, ${firstResult.negativeItems.length} vs ${retryResult.negativeItems.length} items) took ${tCall2 - tExtract}ms`,
  );

  if (firstResult.negativeItems.length < minimumExpected && retryResult.negativeItems.length < minimumExpected) {
    console.warn(
      `[analyzeReport] Both attempts (${firstResult.negativeItems.length}, ${retryResult.negativeItems.length}) are below the inventory floor of ${minimumExpected}.`,
    );
  }
  console.info(`[analyzeReport] total: ${tCall2 - t0}ms`);

  // Return whichever attempt yielded more items
  return retryResult.negativeItems.length >= firstResult.negativeItems.length
    ? retryResult
    : firstResult;
}
