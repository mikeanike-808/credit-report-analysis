import { z } from 'zod';

// All AI responses are validated against AnalysisResultSchema before being
// returned to the client. If validation fails, return { success: false, error }.
// Never attempt to use partial or unvalidated output.
//
// NOTE: `completedAt` is NOT in this schema — it is stamped server-side in the
// API route after a successful AI response, then merged into the final result.

const CreditScoreSchema = z.object({
  bureau: z.string(),
  score: z.number().nullable(),
  rating: z.string(),
});

const DISPUTE_CATEGORIES = [
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
] as const;

const NegativeItemSchema = z.object({
  priority: z.enum(['High', 'Medium', 'Low']),
  creditor: z.string(),
  accountNumber: z.string(),
  type: z.string(),
  balance: z.string(),
  status: z.string(),
  dateReported: z.string(),
  reasons: z.array(z.string()),
  impact: z.enum(['High', 'Medium', 'Low']),
  impactPoints: z.string(),
  laws: z.array(z.string()),
  recommendedAction: z.string(),
  bureaus: z.array(z.string()),
  primaryBureau: z.string(),
  disputeCategory: z.enum(DISPUTE_CATEGORIES),
  dofd: z.string().nullable(),
  reportingDeadline: z.string().nullable(),
  pastReportingLimit: z.boolean(),
  disputeStrength: z.enum(['Strong', 'Moderate', 'Weak']),
  specificViolation: z.string(),
});

const ActionItemSchema = z.object({
  title: z.string(),
  description: z.string(),
  impact: z.enum(['High', 'Medium', 'Low', 'Positive']),
});

export const AnalysisResultSchema = z.object({
  summary: z.string(),
  scores: z.array(CreditScoreSchema),
  overall: z.object({
    rating: z.string(),
    health: z.number().min(0).max(100),
    summary: z.string(),
  }),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  negativeItems: z.array(NegativeItemSchema),
  actionPlan: z.array(ActionItemSchema),
  stats: z.object({
    totalAccounts: z.number(),
    negativeItemCount: z.number(),
    latePayments: z.number(),
    hardInquiries: z.number(),
    utilization: z.string(),
    estimatedImprovement: z.string(),
  }),
});

export type ValidatedAnalysisResult = z.infer<typeof AnalysisResultSchema>;

// ── AI-facing variant (Call 2's actual response_format / first parse) ────────
//
// reportingDeadline/pastReportingLimit are pure date arithmetic computed
// server-side from dofd (see src/lib/dateMath.ts) — the AI never produces
// them. OpenAI's strict:true JSON-schema mode requires every key in
// `properties` to also be in `required`, so these fields must be entirely
// absent from the AI-facing schema, not just nullable. After the AI-facing
// parse succeeds, the two fields are computed and injected, and the result
// is re-validated against AnalysisResultSchema (above) before being
// returned — preserving the "validate before returning to client" rule.
const AINegativeItemSchema = NegativeItemSchema.omit({
  reportingDeadline: true,
  pastReportingLimit: true,
});

export const AIAnalysisResultSchema = AnalysisResultSchema.extend({
  negativeItems: z.array(AINegativeItemSchema),
});

export type AIAnalysisResult = z.infer<typeof AIAnalysisResultSchema>;

// ── Extraction schemas (Call 1 of the two-call pipeline) ─────────────────────

const BureauDataSchema = z.object({
  bureau: z.string(),
  status: z.string(),
  late30: z.number().int().nonnegative(),
  late60: z.number().int().nonnegative(),
  late90: z.number().int().nonnegative(),
  balance: z.string(),
  lastActivity: z.string(),
  remarks: z.string(),
});

const ExtractedScoreSchema = z.object({
  bureau: z.string(),
  score: z.number().nullable(),
  rating: z.string(),
});

// unknown_employer removed — we have no consumer-provided employer to compare
// against, so blindly flagging every employer in the report produces false positives.
const ExtractedPersonalInfoSchema = z.object({
  errorType: z.enum(['alternate_name', 'unknown_address']),
  value: z.string(),
  bureaus: z.array(z.string()),
});

const ExtractedInquirySchema = z.object({
  creditor: z.string(),
  bureau: z.string(),
  date: z.string(),
});

const ExtractedAccountSchema = z.object({
  creditor: z.string(),
  accountNumber: z.string(),
  dofd: z.string().nullable(),
  bureauData: z.array(BureauDataSchema),
});

export const ExtractionResultSchema = z.object({
  creditScores: z.array(ExtractedScoreSchema),
  personalInfoItems: z.array(ExtractedPersonalInfoSchema),
  hardInquiries: z.array(ExtractedInquirySchema),
  accounts: z.array(ExtractedAccountSchema),
});

export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

export const RequestBodySchema = z.object({
  pdfText: z.string().min(1, 'PDF text is required'),
  userInfo: z.object({
    first: z.string().min(1, 'First name is required'),
    last: z.string().min(1, 'Last name is required'),
    dob: z.string(),
    ssn: z.string(),
    address: z.string(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
  }),
});
