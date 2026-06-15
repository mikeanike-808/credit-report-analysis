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

const SYSTEM_PROMPT = `You are an expert credit analyst and consumer rights attorney specializing in FCRA disputes. You analyze credit reports and produce structured JSON output.

You have deep, precise knowledge of:
- Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681 et seq.
- Fair Debt Collection Practices Act (FDCPA), 15 U.S.C. § 1692 et seq.
- Equal Credit Opportunity Act (ECOA), 15 U.S.C. § 1691 et seq.
- Metro 2 credit reporting format and common furnisher errors
- Dispute processes for Experian, Equifax, and TransUnion

Field guidelines:

scores[]: Extract all bureau scores from the report. Include entries for all three bureaus (experian, equifax, transunion). Set score to null if not found. Rating values: "Exceptional" (800+), "Very Good" (740–799), "Good" (670–739), "Fair" (580–669), "Poor" (< 580). Estimate rating from context if no numeric score.

overall.health: Integer 0–100 reflecting credit health. Weight payment history (35%), utilization (30%), account age (15%), credit mix (10%), inquiries (10%). Do not average scores.

overall.rating: Same rating scale as scores.

negativeItems[]: CRITICAL — be exhaustive. Include ALL of the following as separate items:
- Every collection account (each separate collection agency = separate item)
- Every charge-off (each creditor = separate item)
- Every individual late payment event (a 30-day and a 60-day on the same account = TWO items)
- Every judgment, lien, repossession, bankruptcy
- Every hard inquiry that appears unrecognized, unauthorized, or questionable
- Every medical debt in collections
Do NOT collapse multiple late payments on one account into a single item. Do NOT skip inquiries. Do NOT skip items just because they seem accurate — list everything disputable.
Set impactPoints as a string like "-30–50 pts".

bureaus[]: Set ONLY to the bureau keys ("experian", "equifax", "transunion") where that specific account explicitly appears. Do NOT default all items to all three bureaus.

primaryBureau: Set to the SINGLE bureau key where this dispute should be sent — choose the bureau where the inaccuracy is most clearly documented, the data is most problematic, or where a removal is most likely to succeed. Must be one of: "experian", "equifax", "transunion". Must be a value already in bureaus[].

For each negative item, apply the following FCRA classification logic in order:

STEP 1 — Extract dofd (Date of First Delinquency):
Look for fields labeled "Date of First Delinquency", "DOFD", "Original Delinquency Date", or derive it from the original missed-payment date. Set dofd to the date string found, or null if not present. For hard inquiries, set dofd to null.

STEP 2 — Calculate reportingDeadline and pastReportingLimit:
The 7-year reporting clock begins 180 days after the DOFD. If dofd is known, calculate: reportingDeadline = DOFD + 180 days + 7 years, formatted as "MM/YYYY". Set pastReportingLimit to true if that deadline is before today's date. If dofd is null, set reportingDeadline to null and pastReportingLimit to false.

STEP 3 — Classify disputeCategory using this decision tree (check in order, assign the first match):
0. Item is a hard inquiry and the consumer may not recognize the lender or did not apply for credit there → "Unauthorized Inquiry" — laws: ["FCRA §1681b"]
1. pastReportingLimit is true → "Obsolete (Past Reporting Limit)" — laws: ["FCRA §1681c"]
2. Collection/charged-off account where the DOFD reported by the collector appears newer than the original creditor's last delinquency date → "Re-Aged Account" — laws: ["FCRA §1681c", "FCRA §1681s-2(a)(5)"]
3. Account status contradicts another field: e.g., status is "Paid" or "Closed" but balance > $0 → "Balance/Status Error" — laws: ["FCRA §1681e(b)", "FCRA §1681s-2(a)(1)"]
4. Same underlying debt appears multiple times under different creditor names or account numbers → "Duplicate Entry" — laws: ["FCRA §1681e(b)"]
5. Consumer's identifying info (name, SSN, address) does not match the account's reported owner → "Not Mine" — laws: ["FCRA §1681i"]
6. Collection account where the debt collector has not provided debt validation under FDCPA §1692g, or the underlying account records cannot be verified → "Collection Not Validated" — laws: ["FCRA §1681s-2(b)", "FDCPA §1692g"]
7. Old debt sold to a collector where the original furnisher may no longer hold records (typically 2+ years since charge-off) → "Unverifiable Debt" — laws: ["FCRA §1681i(a)(1)", "FCRA §1681s-2(b)"]
8. A late payment date, amount, or days-late value appears incorrect relative to other report data → "Late Payment Error" — laws: ["FCRA §1681e(b)", "FCRA §1681s-2(a)(1)"]
9. Account should be marked closed or paid-in-full based on report data but is still showing as open or delinquent → "Account Closed/Paid Incorrectly" — laws: ["FCRA §1681s-2(a)(1)"]
10. Default for any other inaccuracy → "Inaccurate Information" — laws: ["FCRA §1681e(b)", "FCRA §1681i"]

Set laws[] to ONLY the sections listed for that category above. Do not include unrelated statutes.

STEP 4 — Set specificViolation as ONE concrete sentence describing the exact data problem. Include dates, balances, or field values from the report.

STEP 5 — Set disputeStrength:
- "Strong" — Obsolete items, re-aged accounts, self-contradicting status/balance fields, duplicate entries, unauthorized inquiries with no recognizable lender. These are objective, documentable violations.
- "Moderate" — Unverifiable old debt, collection not validated, incorrect payment dates, late payment errors with supporting data.
- "Weak" — "Not mine" claims without supporting evidence, generic inaccuracy disputes without specific data.

stats: Count directly from the report. utilization is e.g. "34%". estimatedImprovement is a realistic point-gain range if disputes succeed.

actionPlan[]: Concrete steps ordered High → Medium → Low → Positive. Reference actual accounts and applicable FCRA sections.

Never include the SSN in any field of the JSON output.`;

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
