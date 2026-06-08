// Server-side only — called exclusively from /api/analyze route.
// Creates a per-request OpenAI client using the user-supplied API key.
// The key is never stored, logged, or returned.

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
    'negativeItems', 'actionPlan', 'stats', 'disputeLetters',
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
          'laws', 'recommendedAction',
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
    disputeLetters: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['bureau', 'body'],
        properties: {
          bureau: { type: 'string' },
          body: { type: 'string' },
        },
      },
    },
  },
};

export async function analyzeReport(
  pdfText: string,
  userInfo: UserInfo,
  apiKey: string,
): Promise<ValidatedAnalysisResult> {
  const client = new OpenAI({ apiKey });

  const fullName = `${userInfo.first} ${userInfo.last}`;
  const fullAddress = `${userInfo.address}\n${userInfo.city}, ${userInfo.state} ${userInfo.zip}`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.2,
    max_tokens: 8192,
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

const SYSTEM_PROMPT = `You are an expert credit analyst and consumer rights attorney. You analyze credit reports and produce structured JSON output.

You have deep knowledge of:
- Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681 et seq.
- Fair Debt Collection Practices Act (FDCPA), 15 U.S.C. § 1692 et seq.
- Equal Credit Opportunity Act (ECOA), 15 U.S.C. § 1691 et seq.
- Dispute processes for Experian, Equifax, and TransUnion

Field guidelines:

scores[]: Extract all bureau scores from the report. Include entries for all three bureaus (experian, equifax, transunion). Set score to null if not found in the report. Rating values: "Exceptional" (800+), "Very Good" (740–799), "Good" (670–739), "Fair" (580–669), "Poor" (< 580). Estimate rating from context if no numeric score.

overall.health: A holistic integer 0–100 reflecting credit health. Weight payment history (35%), utilization (30%), account age (15%), credit mix (10%), and inquiries (10%). Do not average scores.

overall.rating: Reflect the overall credit health using the same rating scale.

negativeItems[]: List every collection, charge-off, late payment (30/60/90+ days), judgment, lien, tax lien, repossession, or bankruptcy. Be exhaustive — do not omit any. Set impactPoints as a string like "-30–50 pts".

stats: Count directly from the report. utilization is e.g. "34%". estimatedImprovement is a realistic point-gain range if disputes succeed, e.g. "40–80".

actionPlan[]: Concrete, specific steps ordered High → Medium → Low → Positive impact. Reference actual accounts and applicable law sections where relevant.

disputeLetters[]: Write exactly three entries with bureau values "experian", "equifax", "transunion" (lowercase). Each must be a complete formal business dispute letter referencing specific accounts found in the report and citing relevant FCRA/FDCPA sections. Letters must be ready to mail — no placeholders or bracketed fields.

Never include the SSN in any field except the letter body where it appears as a standard identification line.`;

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
Date of Birth: ${dob}
SSN: ${ssn}

--- CREDIT REPORT START ---
${pdfText}
--- CREDIT REPORT END ---

Produce all fields. Write three complete dispute letters (experian, equifax, transunion) referencing specific accounts from this report and citing FCRA/FDCPA sections. Letters must be fully addressed from the subject above and ready to send.`;
}
