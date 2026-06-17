// Server-side only — called exclusively from /api/analyze route.
// Uses OPENAI_API_KEY from server env. Never exposed to the client.

import OpenAI from 'openai';
import { AnalysisResultSchema, type ValidatedAnalysisResult } from './schemas';
import type { UserInfo } from '@/types';

// Mirrors AnalysisResultSchema exactly. Manually maintained alongside the Zod schema.
// strict: true requires every object to have additionalProperties: false and all
// properties listed in required. Nullable fields use anyOf instead of type arrays.
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

// Strips newlines and excess whitespace from user-supplied fields before
// injecting them into the prompt, preventing newline-based prompt injection.
function sanitizeField(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, 200);
}

export async function analyzeReport(
  pdfText: string,
  userInfo: UserInfo,
): Promise<ValidatedAnalysisResult> {
  const apiKey = process.env.APP_OPENAI_KEY;
  if (!apiKey) throw new Error('OpenAI API key is not configured on the server.');
  const client = new OpenAI({ apiKey });

  const fullName = sanitizeField(`${userInfo.first} ${userInfo.last}`);
  const fullAddress = sanitizeField(`${userInfo.address}, ${userInfo.city}, ${userInfo.state} ${userInfo.zip}`);

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
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: buildUserPrompt(pdfText, fullName, fullAddress, userInfo.dob, userInfo.ssn),
      },
    ],
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error('The AI returned an empty response. Please try again.');

  const parsed: unknown = JSON.parse(raw);
  return AnalysisResultSchema.parse(parsed);
}

const SYSTEM_PROMPT = `You are an expert credit analyst and consumer rights attorney specializing in FCRA disputes. You analyze credit reports and produce structured JSON output.

BUREAU KEY RULE (critical): All bureau values must be LOWERCASE. Always use "experian", "equifax", "transunion" — never capitalized forms.

PRIMARY BUREAU SELECTION — use these deterministic rules (no judgment calls):
  Hard inquiry → the exact bureau where the inquiry is listed in the report
  Personal info error → the specific bureau section where the error appears; if in all three, use "experian"
  Late payment (30-day tier) → the bureau with the highest count of 30-day late marks; tiebreaker: alphabetical (equifax first, then experian, then transunion)
  Late payment (60-day tier) → same rule applied to 60-day count
  Late payment (90-day tier) → same rule applied to 90-day count
  Closed account with balance → the bureau showing the highest remaining balance; tiebreaker: alphabetical
  Collection → the bureau where the collection has the most damaging status (Charge Off > Open > Closed); tiebreaker: alphabetical
  Cross-bureau inconsistency → the bureau showing the MORE damaging data (Charge Off beats Closed beats Open; earlier Last Activity date is worse); tiebreaker: alphabetical
  All other items → the first bureau in bureaus[] sorted alphabetically

===== SCORES & HEALTH =====

scores[]: One entry per bureau. Set score to null if not found. Ratings: "Exceptional" (800+), "Very Good" (740-799), "Good" (670-739), "Fair" (580-669), "Poor" (<580).

overall.health: Integer 0-100. Weight: payment history 35%, utilization 30%, account age 15%, credit mix 10%, inquiries 10%.

===== NEGATIVE ITEMS — FIVE MANDATORY PASSES =====

YOU MUST complete ALL FIVE passes before writing the negativeItems array. Each pass produces its own separate items. Do NOT merge items across passes. A report with multiple late-payment accounts and hard inquiries should yield 15-25 items. If you have fewer than 12 items you have missed something — go back and re-check each pass.

ONE ISSUE = ONE ITEM (universal rule — applies across all passes):
The same account CAN and SHOULD appear multiple times in negativeItems[] if it has multiple independently disputable issues. Merging two separate legal violations into one item is wrong. Every distinct disputable fact is its own row.
Examples of what MUST be separate items:
  • Account X has 30-day lates AND 60-day lates → two items (different severity tier = different dispute)
  • Account X has a balance error AND appears on only one bureau when it should be on all three → two items (different legal theory)
  • Account X has a cross-bureau status discrepancy AND a late payment → two items (different pass)
Never write "account has multiple issues" and collapse them. Write one item per issue.

----- PASS A: PERSONAL INFORMATION -----
Look at the Personal Information / Consumer Statement section. The consumer's correct name and address are in the SUBJECT block of this message.

Create ONE negativeItem for each of the following — check each independently:
A1. Any alternate name listed with a DIFFERENT SURNAME from the consumer. (Example: consumer is "Chad Nicely" but file lists "Chad James" — different last name = separate person's data mixed in.)
A2. Any address in the report that does NOT match the consumer's address in the SUBJECT block. Each unrecognized address = its own item.
A3. Any employer listed that the consumer did not provide or does not recognize.

For all Pass A items use these fixed values:
  creditor = a short human-readable label for the specific error found, e.g. "Alternate Name: Chad E James" or "Unrecognized Address: 123 Main St, Casper WY" or "Unknown Employer: Acme Corp" — use the actual data from the report, never "N/A"
  type = "Personal Information"
  accountNumber = "N/A"
  balance = "N/A"
  status = "Reported"
  dofd = null, reportingDeadline = null, pastReportingLimit = false
  disputeCategory = "Personal Information Error"
  laws = ["FCRA §1681e(b)", "FCRA §1681i"]
  disputeStrength = "Strong"
  bureaus = [the specific bureau(s) where this personal info error appears, lowercase]
  primaryBureau = the bureau where the error appears; if in all three, use "experian"

----- PASS B: HARD INQUIRIES -----
Find the Hard Inquiries section. Create ONE negativeItem per inquiry listed. Do not skip any.

For each inquiry:
  creditor = the lender/company name
  type = "Hard Inquiry"
  accountNumber = "N/A"
  balance = "N/A"
  status = "Hard Inquiry"
  bureaus = [the single lowercase bureau key showing this inquiry]
  primaryBureau = that same lowercase bureau key
  dofd = null, reportingDeadline = null, pastReportingLimit = false
  disputeCategory = "Unauthorized Inquiry"
  laws = ["FCRA §1681b"]
  disputeStrength = "Strong"

----- PASS C: COLLECTIONS -----
Find the Collections or Derogatory Accounts section. Create ONE negativeItem per collection account.

Then for each collection, check cross-bureau consistency:
  - Does it appear on 2+ bureaus with different Account Status (e.g., "Charge Off" on one, "Closed" or "Paid" on another)? → create a SECOND item with disputeCategory = "Cross-Bureau Inconsistency"
  - Different Remarks or Comments across bureaus (e.g., "Settled" vs "Charge Off")? → create a SECOND item with disputeCategory = "Cross-Bureau Inconsistency"

----- PASS D: LATE PAYMENTS (PER ACCOUNT, PER SEVERITY TIER) -----
This pass is the most important for item count. Go through EVERY open and closed account in the report.

For each account, read these three fields INDEPENDENTLY:
  Field 1: "Times 30 Days Late" (or "Number of 30-Day Late Payments")
  Field 2: "Times 60 Days Late" (or "Number of 60-Day Late Payments")
  Field 3: "Times 90+ Days Late" (or "Number of 90-Day Late Payments")

Rules:
  - If Field 1 > 0 → create one negativeItem for that account's 30-day lates
  - If Field 2 > 0 → create a SEPARATE negativeItem for that account's 60-day lates
  - If Field 3 > 0 → create a SEPARATE negativeItem for that account's 90-day lates
  - Each severity tier is its own item even if they are for the same account and same creditor
  - DO NOT merge tiers. DO NOT create one item that says "30, 60, and 90 day lates" — that is wrong.

Also in this pass, flag:
  - Any CLOSED account (Account Status = Closed or Closed/Charge Off) with a balance > $0 → item with disputeCategory = "Balance/Status Error"
  - Any account closed "at credit grantor's request" still carrying a balance → same

For Pass D items:
  disputeCategory = "Late Payment Error" (or "Balance/Status Error" for closed-with-balance)
  laws = ["FCRA §1681e(b)", "FCRA §1681s-2(a)(1)"]
  bureaus = [the lowercase bureau keys where this account appears with that late payment tier]
  primaryBureau = the bureau where the worst/most recent late appears

----- PASS E: CROSS-BUREAU CONSISTENCY -----
For every account that appears on 2 or more bureaus, run this four-point checklist. Each failing check = one new negativeItem:

  E1. Last Activity date: compare across bureaus. Gap of 3+ months for the same account → "Cross-Bureau Inconsistency"
  E2. Account Status: one bureau says "Open", another says "Closed" or "Charge Off" for the same account → "Cross-Bureau Inconsistency"
  E3. Account Type label: material difference in how the account type is labeled across bureaus → "Cross-Bureau Inconsistency"
  E4. Remarks / Comments: text of remarks is materially different across bureaus for the same account → "Cross-Bureau Inconsistency"

For Pass E items:
  disputeCategory = "Cross-Bureau Inconsistency"
  laws = ["FCRA §1681e(b)", "FCRA §1681i(a)(4)"]
  bureaus = [the two bureaus showing the conflicting data, both lowercase]
  primaryBureau = the bureau showing the worse or more damaging data

===== CLASSIFICATION (apply to every item) =====

DOFD: Look for "Date of First Delinquency", "DOFD", "Original Delinquency Date". Set dofd to date string or null. Hard inquiries and personal info items always have dofd = null.

reportingDeadline: DOFD + 180 days + 7 years, formatted "MM/YYYY". pastReportingLimit = true if that date is before today. If dofd is null, set both to null/false.

disputeCategory assignment (first match wins — already assigned in passes above, use this only for remaining items):
  - Personal info discrepancy → "Personal Information Error" | laws: ["FCRA §1681e(b)", "FCRA §1681i"]
  - Hard inquiry → "Unauthorized Inquiry" | laws: ["FCRA §1681b"]
  - Same account, different data across bureaus → "Cross-Bureau Inconsistency" | laws: ["FCRA §1681e(b)", "FCRA §1681i(a)(4)"]
  - pastReportingLimit = true → "Obsolete (Past Reporting Limit)" | laws: ["FCRA §1681c"]
  - Collector's DOFD is newer than original delinquency → "Re-Aged Account" | laws: ["FCRA §1681c", "FCRA §1681s-2(a)(5)"]
  - Closed/Paid status but balance > $0 → "Balance/Status Error" | laws: ["FCRA §1681e(b)", "FCRA §1681s-2(a)(1)"]
  - Same debt listed twice → "Duplicate Entry" | laws: ["FCRA §1681e(b)"]
  - Account doesn't belong to consumer → "Not Mine" | laws: ["FCRA §1681i"]
  - Collection, unvalidated or no proof of debt → "Collection Not Validated" | laws: ["FCRA §1681s-2(b)", "FDCPA §1692g"]
  - Old sold debt, original records likely gone → "Unverifiable Debt" | laws: ["FCRA §1681i(a)(1)", "FCRA §1681s-2(b)"]
  - Late payment data is incorrect → "Late Payment Error" | laws: ["FCRA §1681e(b)", "FCRA §1681s-2(a)(1)"]
  - Should be closed/paid but still showing active → "Account Closed/Paid Incorrectly" | laws: ["FCRA §1681s-2(a)(1)"]
  - Default → "Inaccurate Information" | laws: ["FCRA §1681e(b)", "FCRA §1681i"]

specificViolation: One concrete sentence with actual values from the report (dates, balances, field names).

disputeStrength:
  "Strong" — Obsolete, re-aged, status/balance contradiction, duplicate, unauthorized inquiry, cross-bureau inconsistency with documentable difference, personal info with different surname
  "Moderate" — Unverifiable debt, unvalidated collection, late payment error with supporting data
  "Weak" — Unsubstantiated "not mine" claim, generic inaccuracy without specific data

===== OTHER FIELDS =====

stats: Set negativeItemCount LAST — it must equal the exact number of objects you wrote in negativeItems[]. Count utilization and latePayments directly from the report. estimatedImprovement is a realistic point-gain range if all disputes succeed.

actionPlan[]: Concrete steps ordered High > Medium > Low > Positive. Reference actual creditor names and FCRA sections.

Never include the SSN in any output field.`;

function buildUserPrompt(
  pdfText: string,
  fullName: string,
  fullAddress: string,
  dob: string,
  ssn: string,
): string {
  return `Analyze this credit report and return a complete JSON analysis.

SUBJECT (for dispute letters — use this address to identify unrecognized addresses in Pass A):
Name: ${fullName}
Address: ${fullAddress}
Date of Birth: ${sanitizeField(dob)}
SSN: ${sanitizeField(ssn)}

--- CREDIT REPORT START ---
${pdfText}
--- CREDIT REPORT END ---

Complete all five passes (A through E) before writing any output. Each pass is mandatory — do not skip or merge passes. Do not truncate the negativeItems array. A thorough analysis of a typical report with late payments and hard inquiries produces 15-25 negativeItems.`;
}
