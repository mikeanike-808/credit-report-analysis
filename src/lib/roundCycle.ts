import type { NegativeItem } from '@/types';

/** Bureaus re-investigate within 30 days; a new dispute round 45 days after the last mailing gives buffer + mail transit time. */
export const ROUND_CYCLE_DAYS = 45;

/** Days remaining until the next dispute round is ready, floored at 0. Null if no batch has been mailed yet. */
export function daysUntilNextRound(lastBiteSentAt: string | null): number | null {
  if (!lastBiteSentAt) return null;
  const next = new Date(lastBiteSentAt);
  next.setDate(next.getDate() + ROUND_CYCLE_DAYS);
  const ms = next.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function itemKey(item: NegativeItem): string {
  return `${item.creditor}|${item.accountNumber}|${item.disputeCategory}`;
}

export interface NegativeItemDiff {
  /** Was in the previous analysis, no longer in the current one -- presumed deleted/resolved. */
  deleted: NegativeItem[];
  /** Present in both -- still on the report. */
  stillReporting: NegativeItem[];
  /** In the current analysis but not the previous one -- newly appeared. */
  newItems: NegativeItem[];
}

/** Compares two analyses' negativeItems by creditor+accountNumber+disputeCategory to find what changed. */
export function diffNegativeItems(previous: NegativeItem[], current: NegativeItem[]): NegativeItemDiff {
  const prevKeys = new Set(previous.map(itemKey));
  const currentKeys = new Set(current.map(itemKey));

  return {
    deleted: previous.filter((item) => !currentKeys.has(itemKey(item))),
    stillReporting: current.filter((item) => prevKeys.has(itemKey(item))),
    newItems: current.filter((item) => !prevKeys.has(itemKey(item))),
  };
}
