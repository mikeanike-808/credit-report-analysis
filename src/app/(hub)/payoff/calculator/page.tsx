'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { PayoffStepper } from '@/components/payoff/PayoffStepper';
import { simulateAvalanche, formatDuration, freedomDate, money } from '@/lib/payoff';
import type { Debt, Budget, PayoffPlanRecord } from '@/types';

export default function PayoffCalculatorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [leftover, setLeftover] = useState(0);
  const [extra, setExtra] = useState(0);
  const [openRow, setOpenRow] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/debts').then((r) => r.json()) as Promise<{ success: boolean; data?: Debt[] }>,
      fetch('/api/budgets').then((r) => r.json()) as Promise<{ success: boolean; data?: Budget | null }>,
      fetch('/api/payoff-plan').then((r) => r.json()) as Promise<{ success: boolean; data?: PayoffPlanRecord | null }>,
    ]).then(([debtsRes, budgetRes, planRes]) => {
      const loadedDebts = debtsRes.success && debtsRes.data ? debtsRes.data : [];
      setDebts(loadedDebts);

      const income = budgetRes.success && budgetRes.data ? budgetRes.data.income : 0;
      const spent = budgetRes.success && budgetRes.data ? budgetRes.data.categories.reduce((s, c) => s + c.amount, 0) : 0;
      const cap = Math.max(0, income - spent);
      setLeftover(cap);

      const savedExtra = planRes.success && planRes.data ? planRes.data.extra_payment : null;
      setExtra(savedExtra != null ? Math.min(savedExtra, cap) : cap);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const plan = useMemo(() => simulateAvalanche(debts, extra), [debts, extra]);
  const baseline = useMemo(() => simulateAvalanche(debts, 0), [debts]);
  const interestSaved = Math.max(0, baseline.totalInterest - plan.totalInterest);
  const monthsSooner = Math.max(0, baseline.totalMonths - plan.totalMonths);

  const payNow = debts.map((d) => d.min_payment);
  if (plan.order.length > 0) payNow[plan.order[0]!] += extra;
  const totalPay = payNow.reduce((s, p) => s + p, 0);
  const rows = plan.order.map((i) => ({ debt: debts[i]!, pay: payNow[i]!, payoffMonth: plan.payoffMonth[i]!, isTarget: i === plan.order[0] }));

  const persistExtra = async (value: number) => {
    setSaving(true);
    try {
      await fetch('/api/payoff-plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extra_payment: value }),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = async () => {
    await persistExtra(extra);
    router.push('/payoff/tracker');
  };

  if (loading) {
    return (
      <div style={{ padding: 'clamp(22px,3vw,36px) clamp(18px,3vw,38px) 44px', textAlign: 'center', color: 'var(--ink-3)' }}>
        <span className="spin" style={{ display: 'inline-block', marginBottom: 12 }} />
        <div>Loading your payoff plan…</div>
      </div>
    );
  }

  if (debts.length === 0) {
    return (
      <div style={{ padding: 'clamp(22px,3vw,36px) clamp(18px,3vw,38px) 44px', maxWidth: 1080 }}>
        <PayoffStepper current={1} />
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--ink)', marginBottom: 8 }}>No debts on file yet</div>
          <p style={{ color: 'var(--ink-3)', fontSize: 14, maxWidth: 420, margin: '0 auto 18px' }}>Run the Payoff Plan intake wizard first so we know what you&rsquo;re paying off.</p>
          <button className="btn btn-outline" onClick={() => router.push('/payoff')}>Go to Wake Up Call</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 'clamp(22px,3vw,36px) clamp(18px,3vw,38px) 44px', maxWidth: 1080 }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(26px,3.4vw,34px)', fontWeight: 800, letterSpacing: '-.02em', color: 'var(--ink)' }}>Your Payoff Plan</h1>
        <p style={{ margin: '7px 0 0', color: 'var(--ink-3)', fontSize: 14.5 }}>If we take the money you have left over and throw it at your debt, here&rsquo;s exactly what to pay — and when each is gone.</p>
      </div>

      <PayoffStepper current={1} />

      <div style={{ background: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)', borderRadius: 18, padding: 'clamp(24px,3.2vw,38px)', color: '#fff', display: 'flex', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', alignItems: 'center', border: '1px solid #15803d', marginBottom: 16 }}>
        <div style={{ minWidth: 220 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.6)', marginBottom: 9 }}>You&rsquo;d be debt-free by</div>
          <div className="tnum" style={{ fontSize: 'clamp(32px,4.6vw,48px)', fontWeight: 900, letterSpacing: '-.02em', lineHeight: 1 }}>{freedomDate(plan.totalMonths)}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.72)', marginTop: 10 }}>{formatDuration(monthsSooner)} sooner than minimums ({freedomDate(baseline.totalMonths)}).</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.6)', marginBottom: 7 }}>Total interest saved</div>
          <div className="tnum" style={{ fontSize: 'clamp(28px,3.8vw,40px)', fontWeight: 900, color: '#86efac', letterSpacing: '-.02em', lineHeight: 1 }}>{money(interestSaved)}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.72)', marginTop: 8 }}>paying {money(totalPay)}/mo total</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Extra toward debt each month</span>
          <span className="tnum" style={{ fontSize: 22, fontWeight: 900, color: 'var(--blue-strong)' }}>{money(extra)}<span style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>/mo</span></span>
        </div>
        <input
          type="range" min={0} max={Math.max(leftover, 1)} step={5} value={extra}
          onChange={(e) => setExtra(+e.target.value)}
          onMouseUp={() => persistExtra(extra)}
          onTouchEnd={() => persistExtra(extra)}
          style={{ width: '100%', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 6 }}>
          <span>$0</span>
          <span>Capped at the <strong style={{ color: 'var(--blue-strong)' }}>{money(leftover)}</strong> you have left over</span>
          <span>{money(leftover)}</span>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '32px 1.6fr 1fr 1fr', gap: 12, padding: '12px 22px', background: '#f8fafc', borderBottom: '1px solid var(--border-2)' }}>
          {['', 'Account', 'Pay / month', 'Paid off by'].map((c) => (
            <div key={c} style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>{c}</div>
          ))}
        </div>
        {rows.map((r, i) => {
          const monthlyInterest = (r.debt.balance * r.debt.apr) / 100 / 12;
          const principal = Math.max(0, r.pay - monthlyInterest);
          const open = openRow === i;
          return (
            <div key={r.debt.id} style={{ borderBottom: i === rows.length - 1 ? 'none' : '1px solid var(--border-2)' }}>
              <div onClick={() => setOpenRow(open ? null : i)} style={{ display: 'grid', gridTemplateColumns: '32px 1.6fr 1fr 1fr', gap: 12, alignItems: 'center', padding: '14px 22px', cursor: 'pointer' }}>
                <span style={{ width: 26, height: 26, borderRadius: '50%', flex: 'none', display: 'grid', placeItems: 'center', fontSize: 12.5, fontWeight: 800, color: '#fff', background: r.isTarget ? 'var(--blue-strong)' : 'var(--ink-4)' }}>{i + 1}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>
                    {r.debt.name}
                    {r.isTarget && <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--blue-strong)', marginLeft: 8, background: 'var(--blue-tintbg)', padding: '2px 7px', borderRadius: 999 }}>EXTRA GOES HERE</span>}
                  </div>
                  <div className="tnum" style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 1 }}>{money(r.debt.balance)} · {r.debt.apr}% APR</div>
                </div>
                <div className="tnum" style={{ fontSize: 15, fontWeight: 800, color: r.isTarget ? 'var(--blue-strong)' : 'var(--ink)' }}>{money(r.pay)}<span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>/mo</span></div>
                <div className="tnum" style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  {freedomDate(r.payoffMonth)}
                  <Icon name="chevronDown" size={15} style={{ color: 'var(--muted)', transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }} />
                </div>
              </div>
              {open && (
                <div style={{ padding: '2px 22px 16px 66px', display: 'flex', gap: 'clamp(18px,4vw,40px)', flexWrap: 'wrap' }}>
                  <div><div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 3 }}>Goes to interest</div><div className="tnum" style={{ fontSize: 16, fontWeight: 800, color: 'var(--red)' }}>{money(monthlyInterest)}<span style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600 }}>/mo</span></div></div>
                  <div><div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 3 }}>Goes to the balance</div><div className="tnum" style={{ fontSize: 16, fontWeight: 800, color: 'var(--green)' }}>{money(principal)}<span style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600 }}>/mo</span></div></div>
                  <div><div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 3 }}>Gone by</div><div className="tnum" style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>{freedomDate(r.payoffMonth)}</div></div>
                </div>
              )}
            </div>
          );
        })}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 22px', background: '#fafbfd', borderTop: '1px solid var(--border-2)' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)' }}>Total you&rsquo;d pay each month</span>
          <span className="tnum" style={{ fontSize: 15, fontWeight: 900, color: 'var(--ink)' }}>{money(totalPay)}/mo</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginTop: 20 }}>
        <button className="btn btn-ghost" onClick={() => router.push('/payoff/budget')}>Back</button>
        <button className="btn btn-primary" onClick={handleContinue} disabled={saving}>
          {saving ? <span className="spin" /> : <Icon name="arrowRight" size={16} />} Start My Plan
        </button>
      </div>
    </div>
  );
}
