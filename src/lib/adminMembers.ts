import { clerkClient } from '@clerk/nextjs/server';
import { getAnalysesByUser } from '@/lib/analyses';
import { getDisputesByUser, getBitesByUser } from '@/lib/disputes';
import { getBudget } from '@/lib/budgets';
import { getPayoffPledge } from '@/lib/payoffPledges';
import { diffNegativeItems } from '@/lib/roundCycle';
import type { AnalysisRecord } from '@/types';
import type { AdminMember, AdminScorePoint, AdminStageKey } from '@/lib/adminStages';

// Derived from real signals only -- no separate "profile" stage, since
// nothing in this app actually stamps a distinct "profile submitted" moment
// (profiles.onboarding_completed_at exists in schema but nothing sets it
// yet). Honest 5-step funnel instead of the mockup's fabricated 6-step one.
// (Stage labels/order live in adminStages.ts, which the client page also
// imports -- this file has server-only imports above and must never be
// imported from a 'use client' component.)

function averageScore(analysis: AnalysisRecord): number | null {
  const scores = analysis.result.scores.map((s) => s.score).filter((s): s is number => s != null);
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function deriveStage(hasPledge: boolean, hasBudget: boolean, hasDispute: boolean, hasAnalysis: boolean): AdminStageKey {
  if (hasPledge) return 'commitment';
  if (hasBudget) return 'budget';
  if (hasDispute) return 'letter';
  if (hasAnalysis) return 'report';
  return 'signup';
}

async function buildMember(userId: string, name: string, email: string, joined: string, lastActiveAt: string | null): Promise<AdminMember> {
  const [analyses, disputes, bites, budget, pledge] = await Promise.all([
    getAnalysesByUser(userId),
    getDisputesByUser(userId),
    getBitesByUser(userId),
    getBudget(userId),
    getPayoffPledge(userId),
  ]);

  // analyses arrives newest-first.
  const latest = analyses[0];
  const earliest = analyses[analyses.length - 1];
  const itemsFound = latest ? latest.result.negativeItems.length : 0;
  const itemsRemoved = (latest && earliest && analyses.length >= 2)
    ? diffNegativeItems(earliest.result.negativeItems, latest.result.negativeItems).deleted.length
    : 0;

  const avgScore = latest ? averageScore(latest) : null;
  const firstAvgScore = earliest ? averageScore(earliest) : null;
  const lift = (avgScore != null && firstAvgScore != null) ? avgScore - firstAvgScore : 0;

  const scoreHistory: AdminScorePoint[] = [...analyses].reverse()
    .map((a) => {
      const avg = averageScore(a);
      return avg != null ? { date: a.created_at, avgScore: avg } : null;
    })
    .filter((p): p is AdminScorePoint => p !== null);

  const stage = deriveStage(!!pledge?.pledge_signed_at, !!budget, disputes.length > 0, analyses.length > 0);

  return {
    id: userId,
    name,
    email,
    joined,
    lastActiveAt,
    stage,
    disputeRounds: bites.length,
    lettersSent: disputes.length,
    itemsFound,
    itemsRemoved,
    avgScore,
    lift,
    scoreHistory,
  };
}

/** Lists every signed-up user (via Clerk's backend API) joined with their derived journey stage and stats from Supabase. */
export async function getAdminMembers(): Promise<AdminMember[]> {
  const client = await clerkClient();
  const { data: users } = await client.users.getUserList({ limit: 200, orderBy: '-created_at' });

  return Promise.all(
    users.map((u) =>
      buildMember(
        u.id,
        u.fullName ?? u.primaryEmailAddress?.emailAddress ?? 'Unnamed',
        u.primaryEmailAddress?.emailAddress ?? '—',
        new Date(u.createdAt).toISOString(),
        u.lastActiveAt ? new Date(u.lastActiveAt).toISOString() : null,
      ),
    ),
  );
}
