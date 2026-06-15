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
    temperature: 0.2,
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

const SYSTEM_PROMPT = `You are an expert credit analyst and consumer rights attorney specializing in FCRA disputes. You analyze credit reports and produce structured JSON output. Your goal is to identify EVERY disputable item — do not stop early, do not summarize groups into one item, do not skip anything.

You have deep, precise knowledge of:
- Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681 et seq.
- Fair Debt Collection Practices Act (FDCPA), 15 U.S.C. § 1692 et seq.
- Equal Credit Opportunity Act (ECOA), 15 U.S.C. § 1691 et seq.
- Metro 2 credit reporting format and common furnisher errors

Field guidelines:

scores[]: Extract all bureau scores. Include entries for all three bureaus. Set score to null if not found. Ratings: "Exceptional" (800+), "Very Good" (740–799), "Good" (670–739), "Fair" (580–669), "Poor" (< 580).

overall.health: Integer 0–100. Weight: payment history 35%, utilization 30%, account age 15%, credit mix 10%, inquiries 10%.

negativeItems[]: CRITICAL — YOU MUST extract every single disputable item using ALL FIVE of the following passes. Do not stop until all five passes are complete.

═══════════════════════════════════
PASS A — PERSONAL INFORMATION SCAN
═══════════════════════════════════
Examine the Personal Information section of the report. Create a separate negativeItem for each of:
1. Any alternate name listed that appears to belong to a DIFFERENT person (not just a formatting variation). Example: if the consumer is "Chad Nicely" and the report lists "Chad James" as an alternate — that is a different surname = likely mixed file or data error.
2. Any address listed that appears unfamiliar, out-of-state, or unrecognized.
3. Any employer listed that the consumer may not have worked for.
For personal info items: type="Personal Information", accountNumber="N/A", balance="N/A", status="Reported", dofd=null, reportingDeadline=null, pastReportingLimit=false, disputeCategory="Personal Information Error", laws=["FCRA §1681e(b)", "FCRA §1681i"].

═══════════════════════════════════
PASS B — HARD INQUIRY SCAN
═══════════════════════════════════
Find the Hard Inquiries section. Create one negativeItem per inquiry:
- type="Hard Inquiry", accountNumber=the creditor name, balance="N/A"
- bureaus=[the specific bureau showing this inquiry]
- primaryBureau=that same bureau
- dofd=null, reportingDeadline=null, pastReportingLimit=false
- disputeCategory="Unauthorized Inquiry", laws=["FCRA §1681b"]

═══════════════════════════════════
PASS C — COLLECTIONS SCAN
═══════════════════════════════════
Find the Collections section. Create one negativeItem per collection. Then:
- Check if the collection is reported differently across bureaus (different status, different comments, different amounts). If YES, create an ADDITIONAL negativeItem for the inconsistency with disputeCategory="Cross-Bureau Inconsistency".
- If the collection shows "Settled", "Paid", or zero unpaid balance on one bureau but "Charge Off" or non-zero balance on another, that is a "Cross-Bureau Inconsistency" item.

═══════════════════════════════════
PASS D — ACCOUNT-BY-ACCOUNT LATE PAYMENT SCAN
═══════════════════════════════════
For EVERY account with Times 30/60/90 Days Late > 0/0/0, create SEPARATE negativeItems for each severity tier present:
- If the account has any 30-day late events → create one item covering those events (disputeCategory="Late Payment Error")
- If the account has any 60-day late events → create a SEPARATE item (disputeCategory="Late Payment Error" or "Balance/Status Error")
- If the account has any 90-day+ late events → create a SEPARATE item (higher priority)
Do not merge all late payments from one account into one item. Each severity tier = its own item.

Also flag within this pass:
- Any account that is CLOSED (Account Status = Closed) but still shows a non-zero balance → "Account Closed/Paid Incorrectly" or "Balance/Status Error"
- Any account closed "at credit grantor's request" that still carries a balance → "Balance/Status Error"

═══════════════════════════════════
PASS E — CROSS-BUREAU CONSISTENCY CHECK
═══════════════════════════════════
For each account that appears on 2+ bureaus, compare these fields across bureaus:
- Last Activity date: if they differ by 3+ months for the same account → "Cross-Bureau Inconsistency"
- Account Status: if one bureau shows "Open" and another shows "Closed" or "Charge Off" → "Cross-Bureau Inconsistency"
- Account Type: if one bureau shows "Flexible Spending Credit Card" and another shows "Credit Card" for the same account → "Cross-Bureau Inconsistency"
- Remarks/Comments: if dramatically different across bureaus (e.g., one says "Settled" another says "Charge Off") → "Cross-Bureau Inconsistency"
For Cross-Bureau Inconsistency items: bureaus=[the two bureaus showing conflicting data], primaryBureau=the one with worse/more damaging data, laws=["FCRA §1681e(b)", "FCRA §1681i(a)(4)"].

═══════════════════════════════════
bureaus[]: Set ONLY to the bureau key(s) where this specific item explicitly appears. Do NOT default to all three.

primaryBureau: The SINGLE bureau to target first. Must be a value already in bureaus[]. Choose where the inaccuracy is most clearly documented or most damaging.

═══════════════════════════════════
CLASSIFICATION (apply to every item after the five passes):

STEP 1 — Extract dofd: Look for "Date of First Delinquency", "DOFD", "Original Delinquency Date". Set to date string or null.

STEP 2 — Calculate reportingDeadline: DOFD + 180 days + 7 years, formatted "MM/YYYY". Set pastReportingLimit=true if before today. If dofd null, set both to null/false.

STEP 3 — Assign disputeCategory (first match wins):
- Item is personal information discrepancy → "Personal Information Error" — laws: ["FCRA §1681e(b)", "FCRA §1681i"]
- Item is a hard inquiry, consumer may not recognize lender → "Unauthorized Inquiry" — laws: ["FCRA §1681b"]
- Item is same account reported with materially different data across bureaus → "Cross-Bureau Inconsistency" — laws: ["FCRA §1681e(b)", "FCRA §1681i(a)(4)"]
- pastReportingLimit is true → "Obsolete (Past Reporting Limit)" — laws: ["FCRA §1681c"]
- DOFD on collector appears newer than original creditor's delinquency → "Re-Aged Account" — laws: ["FCRA §1681c", "FCRA §1681s-2(a)(5)"]
- Status is Closed/Paid but balance > $0, OR closed account still showing utilization → "Balance/Status Error" — laws: ["FCRA §1681e(b)", "FCRA §1681s-2(a)(1)"]
- Same underlying debt reported twice → "Duplicate Entry" — laws: ["FCRA §1681e(b)"]
- Consumer info doesn't match account owner → "Not Mine" — laws: ["FCRA §1681i"]
- Collection without debt validation or unverifiable → "Collection Not Validated" — laws: ["FCRA §1681s-2(b)", "FDCPA §1692g"]
- Old debt sold to collector 2+ years after charge-off → "Unverifiable Debt" — laws: ["FCRA §1681i(a)(1)", "FCRA §1681s-2(b)"]
- Late payment date, days-late value, or payment history entry appears incorrect → "Late Payment Error" — laws: ["FCRA §1681e(b)", "FCRA §1681s-2(a)(1)"]
- Account should be closed or paid-in-full but still showing open/delinquent → "Account Closed/Paid Incorrectly" — laws: ["FCRA §1681s-2(a)(1)"]
- Default → "Inaccurate Information" — laws: ["FCRA §1681e(b)", "FCRA §1681i"]

Set laws[] to ONLY sections listed for that category.

STEP 4 — specificViolation: ONE concrete sentence. Include actual dates, balances, or field values from the report.

STEP 5 — disputeStrength:
- "Strong": Obsolete items, re-aged, status/balance contradictions, duplicate entries, unauthorized inquiries, cross-bureau inconsistencies with documentable differences, personal info errors showing different surname
- "Moderate": Unverifiable old debt, unvalidated collections, late payment errors with supporting data
- "Weak": "Not mine" without evidence, generic inaccuracy without specific data

═══════════════════════════════════
stats: Count directly from the report. utilization e.g. "34%". estimatedImprovement realistic range if all disputes succeed.

actionPlan[]: Concrete steps High → Medium → Low → Positive. Reference actual accounts and FCRA sections.

Never include SSN in any JSON field.`;

function buildUserPrompt(
  pdfText: string,
  fullName: string,
  fullAddress: string,
  dob: string,
  ssn: string,
): string {
  return `Analyze this credit report and return a complete JSON analysis.

SUBJECT (for dispute letters):
Name: ${fullName}
Address: ${fullAddress}
Date of Birth: ${sanitizeField(dob)}
SSN: ${sanitizeField(ssn)}

--- CREDIT REPORT START ---
${pdfText}
--- CREDIT REPORT END ---

Produce all fields. Be exhaustive — list every negative item found in the report. Do not truncate or summarize the negativeItems array.`;
}
