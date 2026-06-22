'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PayoffStepper } from '@/components/payoff/PayoffStepper';
import { buildAmortizationSchedules, money } from '@/lib/payoff';
import type { Debt, PayoffPlanRecord } from '@/types';

const PALETTE = ['#2f6df0', '#14b8a6', '#f59e0b', '#a855f7', '#ec4899', '#06b6d4', '#84cc16', '#f43f5e'];

function shortDate(monthsFromNow: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + monthsFromNow);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export default function PayoffTrackerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [extra, setExtra] = useState(0);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    Promise.all([
      fetch('/api/debts').then((r) => r.json()) as Promise<{ success: boolean; data?: Debt[] }>,
      fetch('/api/payoff-plan').then((r) => r.json()) as Promise<{ success: boolean; data?: PayoffPlanRecord | null }>,
    ]).then(([debtsRes, planRes]) => {
      setDebts(debtsRes.success && debtsRes.data ? debtsRes.data : []);
      setExtra(planRes.success && planRes.data ? planRes.data.extra_payment : 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const schedules = useMemo(() => buildAmortizationSchedules(debts, extra), [debts, extra]);
  const totalMonths = Math.max(0, ...schedules.map((s) => s.length));
  const totalMonthlyBudget = debts.reduce((s, d) => s + d.min_payment, 0) + extra;
  const maxBalance = debts.reduce((s, d) => s + d.balance, 0);

  // Stacked-area band per debt -- build N+1 history points (month 0..totalMonths)
  // of each debt's remaining balance, then draw cumulative-sum bands.
  const history = useMemo(() => {
    const points: number[][] = [debts.map((d) => d.balance)];
    for (let m = 0; m < totalMonths; m++) {
      const prev = points[points.length - 1]!;
      const next = debts.map((d, i) => {
        const row = schedules[i]?.[m];
        return row ? row.endBalance : (prev[i]! > 0 ? prev[i]! : 0);
      });
      points.push(next);
    }
    return points;
  }, [debts, schedules, totalMonths]);

  const bands = useMemo(() => debts.map((d, k) => {
    const top: string[] = [];
    const bottom: string[] = [];
    history.forEach((row, t) => {
      const x = totalMonths ? (t / totalMonths) * 100 : 0;
      const cumK = row.slice(0, k + 1).reduce((s, b) => s + b, 0);
      const cumPrev = row.slice(0, k).reduce((s, b) => s + b, 0);
      top.push(`${x.toFixed(2)},${(maxBalance ? (1 - cumK / maxBalance) * 100 : 0).toFixed(2)}`);
      bottom.push(`${x.toFixed(2)},${(maxBalance ? (1 - cumPrev / maxBalance) * 100 : 0).toFixed(2)}`);
    });
    return { color: PALETTE[k % PALETTE.length]!, name: d.name, points: top.concat(bottom.reverse()).join(' ') };
  }), [debts, history, totalMonths, maxBalance]);

  if (loading) {
    return (
      <div style={{ padding: 'clamp(22px,3vw,36px) clamp(18px,3vw,38px) 44px', textAlign: 'center', color: 'var(--ink-3)' }}>
        <span className="spin" style={{ display: 'inline-block', marginBottom: 12 }} />
        <div>Building your schedule…</div>
      </div>
    );
  }

  if (debts.length === 0) {
    return (
      <div style={{ padding: 'clamp(22px,3vw,36px) clamp(18px,3vw,38px) 44px', maxWidth: 1080 }}>
        <PayoffStepper current={2} />
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--ink)', marginBottom: 8 }}>No debts on file yet</div>
          <button className="btn btn-outline" onClick={() => router.push('/payoff')}>Go to Wake Up Call</button>
        </div>
      </div>
    );
  }

  const selectedRows = schedules[selected] ?? [];
  const totalInterest = selectedRows.reduce((s, r) => s + r.interest, 0);

  return (
    <div style={{ padding: 'clamp(22px,3vw,36px) clamp(18px,3vw,38px) 44px', maxWidth: 1080 }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(26px,3.4vw,34px)', fontWeight: 800, letterSpacing: '-.02em', color: 'var(--ink)' }}>Stay on Track</h1>
        <p style={{ margin: '7px 0 0', color: 'var(--ink-3)', fontSize: 14.5 }}>Every payment, month by month — watch each balance shrink to zero.</p>
      </div>

      <PayoffStepper current={2} />

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--ink)' }}>Your road to debt-free</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>Paying {money(totalMonthlyBudget)}/mo total</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--blue-strong)' }}>Debt-free</div>
            <div className="tnum" style={{ fontSize: 19, fontWeight: 900, color: 'var(--ink)' }}>{shortDate(totalMonths)}</div>
          </div>
        </div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: 200, display: 'block', borderBottom: '1px solid var(--border-2)', borderLeft: '1px solid var(--border-2)' }}>
          {bands.map((b) => <polygon key={b.name} points={b.points} fill={b.color} fillOpacity={0.88} />)}
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 6 }}>
          <span>Now · {money(maxBalance)}</span>
          <span>{shortDate(totalMonths)} · $0</span>
        </div>
      </div>

      <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--ink)', marginBottom: 10 }}>Payoff schedule</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {debts.map((d, i) => (
          <button
            key={d.id}
            onClick={() => setSelected(i)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 999, cursor: 'pointer', fontSize: 13, fontWeight: 700,
              border: `1.5px solid ${selected === i ? 'var(--blue-strong)' : 'var(--border)'}`,
              background: selected === i ? 'var(--blue-tintbg)' : '#fff',
              color: selected === i ? 'var(--blue-strong)' : 'var(--ink-2)',
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: 3, background: PALETTE[i % PALETTE.length] }} /> {d.name}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 22px', borderBottom: '1px solid var(--border-2)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--ink)' }}>{debts[selected]!.name} — paid off {shortDate(selectedRows.length)}</span>
          <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{selectedRows.length} payments · {money(totalInterest)} interest</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr 1fr 1.2fr', gap: 10, padding: '10px 22px', background: '#f8fafc', borderBottom: '1px solid var(--border-2)' }}>
          {['Month', 'Starting balance', 'Interest', 'Payment', 'New balance'].map((c, i) => (
            <div key={c} style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', color: 'var(--ink-3)', textTransform: 'uppercase', textAlign: i === 0 ? 'left' : 'right' }}>{c}</div>
          ))}
        </div>
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {selectedRows.map((r, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr 1fr 1.2fr', gap: 10, padding: '10px 22px', borderBottom: i === selectedRows.length - 1 ? 'none' : '1px solid var(--border-2)', background: r.endBalance <= 0.5 ? 'var(--blue-tintbg)' : '#fff' }}>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 600 }}>{shortDate(r.month)}</div>
              <div className="tnum" style={{ fontSize: 13, color: 'var(--ink-2)', textAlign: 'right' }}>{money(r.startBalance)}</div>
              <div className="tnum" style={{ fontSize: 13, color: 'var(--red)', textAlign: 'right' }}>+{money(r.interest)}</div>
              <div className="tnum" style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600, textAlign: 'right' }}>−{money(r.payment)}</div>
              <div className="tnum" style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', textAlign: 'right' }}>{r.endBalance <= 0.5 ? 'Paid off 🎉' : money(r.endBalance)}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginTop: 20 }}>
        <button className="btn btn-ghost" onClick={() => router.push('/payoff/calculator')}>Back</button>
      </div>
    </div>
  );
}
