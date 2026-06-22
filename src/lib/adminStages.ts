// Client-safe constants/types for the admin back-office -- no server-only
// imports here (Clerk's backend client, Supabase service-role client),
// since this file is imported directly by the admin page component.

export const ADMIN_STAGES = {
  signup: { label: 'Signed up', step: 1, progress: 20 },
  report: { label: 'Report analyzed', step: 2, progress: 40 },
  letter: { label: 'Letter sent', step: 3, progress: 60 },
  budget: { label: 'Budget created', step: 4, progress: 80 },
  commitment: { label: 'Pledge signed', step: 5, progress: 100 },
} as const;

export type AdminStageKey = keyof typeof ADMIN_STAGES;
export const ADMIN_STAGE_ORDER: AdminStageKey[] = ['signup', 'report', 'letter', 'budget', 'commitment'];

export interface AdminScorePoint {
  date: string;
  avgScore: number;
}

export interface AdminMember {
  id: string;
  name: string;
  email: string;
  joined: string;
  lastActiveAt: string | null;
  stage: AdminStageKey;
  disputeRounds: number;
  lettersSent: number;
  itemsFound: number;
  itemsRemoved: number;
  avgScore: number | null;
  lift: number;
  scoreHistory: AdminScorePoint[];
}
