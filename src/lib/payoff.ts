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

interface DebtLike {
  balance: number;
  apr: number;
  min_payment: number;
}

export function aggregateDebts(debts: DebtLike[]): { totalBalance: number; totalMin: number; weightedApr: number } {
  const totalBalance = debts.reduce((s, d) => s + d.balance, 0);
  const totalMin = debts.reduce((s, d) => s + d.min_payment, 0);
  const weightedApr = totalBalance ? debts.reduce((s, d) => s + d.balance * d.apr, 0) / totalBalance : 0;
  return { totalBalance, totalMin, weightedApr };
}

export interface AvalancheResult {
  /** Indices into the input debts array, ordered by avalanche priority (highest APR first, then smallest balance) */
  order: number[];
  /** Month each debt reaches $0, by original index. Infinity if it never does within 50 years. */
  payoffMonth: number[];
  totalInterest: number;
  totalMonths: number;
}

/**
 * Avalanche strategy: pay the minimum on every debt, then stack all extra
 * money on whichever has the highest APR. Once that one hits $0, its whole
 * payment (minimum + whatever extra was rolling onto it) shifts to the next
 * debt in line -- so the budget itself never changes, only where it points.
 */
export function simulateAvalanche(debts: DebtLike[], extraPerMonth: number): AvalancheResult {
  const n = debts.length;
  if (n === 0) return { order: [], payoffMonth: [], totalInterest: 0, totalMonths: 0 };

  const balance = debts.map((d) => d.balance);
  const monthlyRate = debts.map((d) => d.apr / 100 / 12);
  const minPayment = debts.map((d) => d.min_payment);
  const order = debts.map((_, i) => i).sort((a, b) => debts[b]!.apr - debts[a]!.apr || debts[a]!.balance - debts[b]!.balance);
  const budget = minPayment.reduce((s, m) => s + m, 0) + extraPerMonth;
  const payoffMonth = Array(n).fill(Infinity);
  let totalInterest = 0;
  let totalMonths = 0;

  for (let month = 1; month <= 600; month++) {
    for (let i = 0; i < n; i++) {
      if (balance[i]! > 0) {
        const interest = balance[i]! * monthlyRate[i]!;
        balance[i]! += interest;
        totalInterest += interest;
      }
    }
    let available = budget;
    for (let i = 0; i < n; i++) {
      if (balance[i]! > 0) {
        const payment = Math.min(balance[i]!, minPayment[i]!);
        balance[i]! -= payment;
        available -= payment;
      }
    }
    for (const i of order) {
      if (balance[i]! > 0 && available > 0) {
        const payment = Math.min(balance[i]!, available);
        balance[i]! -= payment;
        available -= payment;
      }
    }
    for (let i = 0; i < n; i++) {
      if (balance[i]! <= 0.01 && !isFinite(payoffMonth[i]!)) payoffMonth[i] = month;
    }
    totalMonths = month;
    if (balance.every((b) => b! <= 0.01)) break;
  }

  return { order, payoffMonth, totalInterest, totalMonths };
}

export interface AmortizationRow {
  month: number;
  startBalance: number;
  interest: number;
  payment: number;
  endBalance: number;
}

/** Same avalanche strategy as simulateAvalanche(), but returns the full month-by-month row history per debt (by original index), for the Stay on Track schedule table/chart. */
export function buildAmortizationSchedules(debts: DebtLike[], extraPerMonth: number): AmortizationRow[][] {
  const n = debts.length;
  if (n === 0) return [];

  const monthlyRate = debts.map((d) => d.apr / 100 / 12);
  const minPayment = debts.map((d) => d.min_payment);
  const order = debts.map((_, i) => i).sort((a, b) => debts[b]!.apr - debts[a]!.apr);
  const budget = minPayment.reduce((s, m) => s + m, 0) + extraPerMonth;
  let balance = debts.map((d) => d.balance);
  const schedules: AmortizationRow[][] = debts.map(() => []);

  for (let month = 1; month <= 360; month++) {
    const start = balance.slice();
    const interest = balance.map((b, i) => (b > 0 ? b * monthlyRate[i]! : 0));
    for (let i = 0; i < n; i++) balance[i] += interest[i]!;

    const payment = balance.map(() => 0);
    let available = budget;
    for (let i = 0; i < n; i++) {
      if (balance[i]! > 0) {
        const p = Math.min(balance[i]!, minPayment[i]!);
        balance[i]! -= p; payment[i] += p; available -= p;
      }
    }
    for (const i of order) {
      if (balance[i]! > 0 && available > 0) {
        const p = Math.min(balance[i]!, available);
        balance[i]! -= p; payment[i] += p; available -= p;
      }
    }
    balance = balance.map((b) => Math.max(0, b));

    for (let i = 0; i < n; i++) {
      if (start[i]! > 0) schedules[i]!.push({ month, startBalance: start[i]!, interest: interest[i]!, payment: payment[i]!, endBalance: balance[i]! });
    }
    if (balance.every((b) => b <= 0.5)) break;
  }

  return schedules;
}
