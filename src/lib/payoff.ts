// Pure payoff-math helpers shared by the Payoff Plan intake wizard (Phase 2)
// and the upcoming Budget/Payoff calculator screens (Phase 3). No I/O here.

/** Months to pay off a balance at a fixed monthly payment and APR. Infinity if the payment never covers interest. */
export function payoffMonths(balance: number, annualRatePct: number, payment: number): number {
  const r = annualRatePct / 100 / 12;
  if (balance <= 0) return 0;
  if (payment <= 0) return Infinity;
  if (r === 0) return Math.ceil(balance / payment);
  if (payment <= balance * r) return Infinity;
  return Math.ceil(-Math.log(1 - (balance * r) / payment) / Math.log(1 + r));
}

/** "2 yr, 3 mo" / "8 mo" / "30+ yrs" for an Infinity input. */
export function formatDuration(months: number): string {
  if (!isFinite(months)) return '30+ yrs';
  const y = Math.floor(months / 12), m = months % 12;
  if (y && m) return `${y} yr, ${m} mo`;
  if (y) return `${y} yr`;
  return `${m} mo`;
}

/** "Mar 2028" -- today + N months. */
export function freedomDate(months: number): string {
  if (!isFinite(months)) return '—';
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function money(n: number): string {
  return '$' + Math.round(n).toLocaleString();
}
