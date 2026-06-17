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
import { AnalysisResultSchema, ExtractionResultSchema, type ExtractionResult, type ValidatedAnalysisResult } from './schemas';
import type { UserInfo } from '@/types';

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
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'priority', 'creditor', 'accountNumber', 'type', 'balance',
          'status', 'dateReported', 'reasons', 'impact', 'impactPoints',
          'laws', 'recommendedAction', 'bureaus', 'primaryBureau',
          'disputeCategory', 'dofd', 'reportingDeadline', 'pastReportingLimit',
          'disputeStrength', 'specificViolation',
        ],
        properties: {
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
          reportingDeadline: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          pastReportingLimit: { type: 'boolean' },
          disputeStrength: { type: 'string', enum: ['Strong', 'Moderate', 'Weak'] },
          specificViolation: { type: 'string' },
        },
      },
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

EXTRACTION RULES:

creditScores — find the credit score summary section (usually near the top):
  - One entry per bureau: "experian", "equifax", "transunion" (lowercase keys)
  - score: the numeric FICO/VantageScore integer shown, or null if not listed
  - rating: the rating label shown in the report (e.g., "Fair", "Good", "Poor") or "" if none
  - Always produce exactly three entries (one per bureau), even if some scores are null

personalInfoItems — scan the Personal Information / Consumer Statement section:
  - Alternate names: each name listed with a DIFFERENT SURNAME from the consumer → errorType = "alternate_name", value = full name as written. Do NOT flag nicknames or middle-name variations of the same surname.
  - Unknown addresses: each address that clearly does NOT match the consumer's address → errorType = "unknown_address", value = full address as written. Do NOT flag partial matches or formatting differences of the same address.
  - Do NOT extract employers — employer data is not included in this analysis.
  - bureaus = lowercase bureau key(s) where this item appears
  - If nothing qualifies, return []

hardInquiries — find every entry in the Hard Inquiries section:
  - creditor = exact company name as written
  - bureau = lowercase bureau key ("experian", "equifax", or "transunion")
  - date = inquiry date as written in the report

accounts — list EVERY account (open, closed, charged off, in collections, paid, current — all of them):
  bureauData contains one entry per bureau where this account appears:
    - bureau: lowercase key
    - status: exact Account Status text from that bureau column
    - late30: integer from "Times 30 Days Late" field — use 0 if "--", "N/A", or not present
    - late60: integer from "Times 60 Days Late" field — use 0 if "--", "N/A", or not present
    - late90: integer from "Times 90+ Days Late" field — use 0 if "--", "N/A", or not present
    - balance: balance amount as written ("$0", "$450", "N/A" if not shown)
    - lastActivity: Last Activity or Last Payment date ("MM/YYYY" or "N/A" if not shown)
    - remarks: Remarks or Comments text — exact text, "" if none
  dofd: Date of First Delinquency for this account ("MM/YYYY") or null if not found.

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

===== FIVE-PASS DISPUTE RULES =====

ONE ISSUE = ONE ITEM: The same account MUST appear multiple times if it has multiple disputable issues. Never merge. Each distinct legal violation = its own negativeItem.

PASS A — PERSONAL INFORMATION:
For EACH item in personalInfoItems, create exactly one negativeItem:
  creditor = descriptive label using the actual value (e.g., "Alternate Name: Chad E James", "Unrecognized Address: 123 Main St")
  type = "Personal Information", accountNumber = "N/A", balance = "N/A", status = "Reported"
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
For each account where any bureauData entry has status containing "Charge Off", "Collection", or similar derogatory:
  - One negativeItem for the collection/charge-off itself (disputeCategory = "Collection Not Validated")
  - If statuses differ across bureauData entries (e.g., "Charge Off" on one, "Closed" on another) → a SECOND negativeItem (disputeCategory = "Cross-Bureau Inconsistency")
  - If remarks differ materially across bureauData entries → a SECOND negativeItem (disputeCategory = "Cross-Bureau Inconsistency")

PASS D — LATE PAYMENTS (check each account independently):
For each account, evaluate each tier separately using the bureauData:
  - If any bureauData entry has late30 > 0 → create ONE negativeItem for 30-day lates (disputeCategory = "Late Payment Error")
  - If any bureauData entry has late60 > 0 → create a SEPARATE negativeItem for 60-day lates (disputeCategory = "Late Payment Error")
  - If any bureauData entry has late90 > 0 → create a SEPARATE negativeItem for 90-day lates (disputeCategory = "Late Payment Error")
  - DO NOT merge tiers. Three different late tiers = three separate items, even for the same account.
  Also:
  - Any account with status "Closed" or "Charge Off" AND any bureauData balance not "$0" or "N/A" → one negativeItem (disputeCategory = "Balance/Status Error")
  laws = ["FCRA §1681e(b)", "FCRA §1681s-2(a)(1)"]

PASS E — CROSS-BUREAU CONSISTENCY (accounts with 2+ bureauData entries):
For each such account, check all four:
  E1. lastActivity gap ≥ 3 months across bureauData entries → one negativeItem
  E2. status values differ (Open vs Closed, Open vs Charge Off, etc.) → one negativeItem
  E3. remarks text materially different across entries → one negativeItem
  (E2 and E3 also apply in Pass C — do not duplicate; skip if already created in Pass C)
  disputeCategory = "Cross-Bureau Inconsistency", laws = ["FCRA §1681e(b)", "FCRA §1681i(a)(4)"]
  bureaus = the two bureaus with conflicting data, primaryBureau = bureau with more damaging data

===== CLASSIFICATION (all items) =====

dofd: Use the dofd from the inventory account. Hard inquiries and personal info items → null.
reportingDeadline: dofd + 7 years + 180 days, formatted "MM/YYYY". null if dofd is null.
pastReportingLimit: true if reportingDeadline is before 2026-06-17. false otherwise.

disputeStrength:
  "Strong" — Obsolete, re-aged, status/balance contradiction, duplicate, unauthorized inquiry, cross-bureau inconsistency, personal info with different surname
  "Moderate" — Unverifiable debt, unvalidated collection, late payment with supporting counts
  "Weak" — Generic inaccuracy without specific supporting data

specificViolation: One concrete sentence citing actual values from the inventory (dates, counts, balances, bureau names).

===== OTHER FIELDS =====

stats.negativeItemCount: Set LAST — must equal the exact count of objects in negativeItems[].
stats.latePayments: total number of accounts with any late payment count > 0.
stats.hardInquiries: count of items in hardInquiries inventory.
stats.totalAccounts: count of items in accounts inventory.
stats.utilization: a percentage string like "18%" — estimate from balances in accounts inventory relative to their statuses.
stats.estimatedImprovement: a point-range string ONLY — format exactly like "50-120" (digits, dash, digits). No word "points", no other text.
actionPlan[]: Ordered High → Medium → Low → Positive. Reference actual creditor names and FCRA sections.

Never include the SSN in any output field.`;

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
    return `  ACCOUNT: ${a.creditor} #${a.accountNumber} | DOFD: ${a.dofd ?? 'N/A'}\n${bdLines}`;
  }).join('\n\n');

  return `CREDIT SCORES:\n${scoreLines}\n\nPERSONAL INFO ITEMS (${ex.personalInfoItems.length}):\n${piLines}\n\nHARD INQUIRIES (${ex.hardInquiries.length}):\n${inqLines}\n\nACCOUNTS (${ex.accounts.length}):\n${accLines}`;
}

// ── Call 2: Apply dispute rules to the structured inventory ───────────────────

export async function analyzeReport(
  pdfText: string,
  userInfo: UserInfo,
): Promise<ValidatedAnalysisResult> {
  const client = getClient();

  const fullName = sanitizeField(`${userInfo.first} ${userInfo.last}`);
  const fullAddress = sanitizeField(`${userInfo.address}, ${userInfo.city}, ${userInfo.state} ${userInfo.zip}`);

  // Call 1 — extract structured inventory
  const extraction = await extractReportData(client, pdfText, fullName, fullAddress);
  const inventory = formatInventory(extraction);

  // Call 2 — classify and generate dispute analysis from the fixed inventory
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0,
    seed: 42,
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
Date of Birth: ${sanitizeField(userInfo.dob)}
SSN: ${sanitizeField(userInfo.ssn)}

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
  return AnalysisResultSchema.parse(parsed);
}
