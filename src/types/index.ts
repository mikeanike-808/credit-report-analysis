export interface UserInfo {
  first: string;
  last: string;
  dob: string;
  ssn: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export type ImpactLevel = 'High' | 'Medium' | 'Low' | 'Positive';
export type PriorityLevel = 'High' | 'Medium' | 'Low';
export type DisputeStrength = 'Strong' | 'Moderate' | 'Weak';
export type DisputeCategory =
  | 'Not Mine'
  | 'Inaccurate Information'
  | 'Balance/Status Error'
  | 'Obsolete (Past Reporting Limit)'
  | 'Unverifiable Debt'
  | 'Re-Aged Account'
  | 'Duplicate Entry'
  | 'Account Closed/Paid Incorrectly'
  | 'Unauthorized Inquiry'
  | 'Late Payment Error'
  | 'Collection Not Validated'
  | 'Personal Information Error'
  | 'Cross-Bureau Inconsistency';

export interface CreditScore {
  bureau: string;
  score: number | null;
  rating: string;
}

export interface NegativeItem {
  priority: PriorityLevel;
  creditor: string;
  accountNumber: string;
  type: string;
  balance: string;
  status: string;
  dateReported: string;
  reasons: string[];
  impact: PriorityLevel;
  impactPoints: string;
  laws: string[];
  recommendedAction: string;
  /** Which bureaus actually report this item — only the ones present in the report */
  bureaus: string[];
  /** The single bureau to target first — chosen by AI as where the inaccuracy is most clearly documented */
  primaryBureau: string;
  /** FCRA-based category classifying why this item is disputable */
  disputeCategory: DisputeCategory;
  /** Date of First Delinquency extracted from the report (null if not found) */
  dofd: string | null;
  /** Reporting deadline: ~7 yrs + 180 days from DOFD (null if DOFD unknown) */
  reportingDeadline: string | null;
  /** True if the item's reporting deadline has already passed */
  pastReportingLimit: boolean;
  /** Estimated likelihood this dispute will succeed */
  disputeStrength: DisputeStrength;
  /** One sentence describing the exact violation and why it's disputable */
  specificViolation: string;
}

export interface ActionItem {
  title: string;
  description: string;
  impact: ImpactLevel;
}

export interface Bureau {
  key: string;
  name: string;
  color: string;
  abbr: string;
  addr: string;
}

export type DisputeStatus = 'sent' | 'responded' | 'resolved' | 'expired';
export type SendMethod = 'auto' | 'manual';

export interface DisputeRecord {
  id: string;
  user_id: string | null;
  creditor: string;
  account_number: string;
  bureau_key: string;
  dispute_category: string;
  send_method: SendMethod;
  sent_at: string;
  lob_letter_id: string | null;
  lob_tracking_number: string | null;
  expected_response_by: string;
  status: DisputeStatus;
  created_at: string;
  /** Which Bite (batch of letters sent together) this dispute belongs to, if any */
  bite_id: string | null;
}

/**
 * The sidebar's sequential journey. current_goal_index is the count of
 * consecutively completed goals from index 0 -- a goal can only be marked
 * done if every goal before it is already done, so this can never represent
 * an invalid state like "goal 2 done but goal 1 isn't."
 */
export interface JourneyProgress {
  user_id: string;
  current_goal_index: number;
  updated_at: string;
}

/** One debt the user is paying off, for the Payoff Plan pillar -- some sourced from the credit report, some entered manually. */
export interface Debt {
  id: string;
  user_id: string;
  name: string;
  balance: number;
  apr: number;
  min_payment: number;
  source: 'report' | 'manual';
  /** Links a report-sourced debt back to the negativeItem it came from (creditor+accountNumber), to avoid duplicating it on re-import */
  report_account_ref: string | null;
  status: 'active' | 'paid_off';
  created_at: string;
  updated_at: string;
}

export interface BudgetCategory {
  name: string;
  amount: number;
  color: string;
  custom?: boolean;
}

/** One row per user -- overwritten in place each time Budget Builder is edited. */
export interface Budget {
  user_id: string;
  income: number;
  categories: BudgetCategory[];
  updated_at: string;
}

/** One row per user -- the user's chosen extra monthly payment toward debt, for the avalanche calculator. */
export interface PayoffPlanRecord {
  user_id: string;
  extra_payment: number;
  updated_at: string;
}

/** One row per user -- which of the 6 "Set It Up" autopilot steps are checked off. */
export interface SetupChecklist {
  user_id: string;
  completed_steps: number[];
  nudge_email_enabled: boolean;
  updated_at: string;
}

/** One row per user -- the "Make It Official" pledge. pledge_signed_at is null until signed. */
export interface PayoffPledge {
  user_id: string;
  vision_text: string;
  plan_text: string;
  importance: number;
  pledge_name: string;
  pledge_signed_at: string | null;
  updated_at: string;
}

/** One row per user -- checked-off steps in Grow & Rebuild's Maintain/Grow Credit tabs (Grow Your Money is informational only). */
export interface GrowProgress {
  user_id: string;
  completed: { maintain: number[]; grow: number[] };
  updated_at: string;
}

export interface ProfileAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

/** One row per user -- only fields Clerk doesn't already have (name/email come from Clerk's currentUser()). */
export interface Profile {
  user_id: string;
  dob: string | null;
  phone: string | null;
  address: ProfileAddress;
  onboarding_completed_at: string | null;
  updated_at: string;
}

export type IdentityDocType = 'drivers_license' | 'ssn_proof' | 'address_proof';
export type IdentityDocStatus = 'pending' | 'verified' | 'rejected';

export interface IdentityDocument {
  id: string;
  user_id: string;
  doc_type: IdentityDocType;
  storage_path: string;
  status: IdentityDocStatus;
  rejection_reason: string | null;
  uploaded_at: string;
  verified_at: string | null;
}

export type NotificationType = 'letter_mailed' | 'items_deleted' | 'new_report' | 'round_ready';

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

/** A dated batch of dispute letters sent together in one visit to Dispute Letters -- shown on History */
export interface Bite {
  id: string;
  user_id: string;
  sent_at: string;
  letter_count: number;
  created_at: string;
  /** Populated by getBitesByUser() via a join -- not a DB column */
  disputes?: DisputeRecord[];
}

/** A saved analysis row -- persists what AnalysisContext otherwise only holds in memory */
export interface AnalysisRecord {
  id: string;
  user_id: string;
  user_info: UserInfo;
  result: AnalysisResult;
  created_at: string;
  /** Indices into result.actionPlan that the user has checked off on Action Tracker */
  completed_actions: number[];
}

export interface AnalysisResult {
  /** Stamped server-side after AI response — not generated by the AI */
  completedAt: string;
  summary: string;
  scores: CreditScore[];
  overall: {
    rating: string;
    /** 0–100, drives the donut chart */
    health: number;
    summary: string;
  };
  strengths: string[];
  weaknesses: string[];
  negativeItems: NegativeItem[];
  actionPlan: ActionItem[];
  stats: {
    totalAccounts: number;
    negativeItemCount: number;
    latePayments: number;
    hardInquiries: number;
    /** e.g. "18%" */
    utilization: string;
    /** e.g. "50–120" */
    estimatedImprovement: string;
  };
}
