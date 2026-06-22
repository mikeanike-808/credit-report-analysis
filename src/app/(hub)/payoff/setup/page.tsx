'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { PayoffStepper } from '@/components/payoff/PayoffStepper';
import { money } from '@/lib/payoff';
import type { Debt, Budget, SetupChecklist } from '@/types';

const STEPS = [
  { title: 'Stash a small $500 buffer first', description: "Before anything else, set aside a small starter emergency fund. It's what keeps a surprise expense from landing right back on a card and undoing your progress." },
  { title: 'Pay every card from one account', description: 'Route all your cards to a single checking account so everything comes from one place and nothing slips through the cracks.' },
  { title: 'Put every card on autopay', description: 'Set each card to auto-pay at least its minimum so you never miss a due date or get hit with a late fee.' },
  { title: 'Always keep funds in that account', description: 'Make sure the money is there before each payment date. A bounced autopay can cost you fees and a ding on your credit.' },
  { title: 'Put your paid-off cards away', description: "Don't close them — keeping them open helps your credit. Just take them out of your wallet so the balances can't creep back up." },
  { title: 'Check your statements often', description: 'Review your statements regularly to catch errors, fraud, or creeping balances before they become a problem.' },
];

const BONUS_MOVES = [
  { title: 'Move balances to a 0% interest card', description: 'You may qualify to transfer a balance to a card with a 0% intro APR — every dollar then goes straight to principal during the promo window.' },
  { title: 'Consider a consolidation service', description: "If the plan above isn't enough, a debt consolidation service can roll everything into one lower-rate payment. Compare the fees first." },
];

export default function SetItUpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState<number[]>([]);
  const [nudge, setNudge] = useState(true);
  const [totalMin, setTotalMin] = useState(0);
  const [budget, setBudget] = useState<Budget | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/debts').then((r) => r.json()) as Promise<{ success: boolean; data?: Debt[] }>,
      fetch('/api/budgets').then((r) => r.json()) as Promise<{ success: boolean; data?: Budget | null }>,
      fetch('/api/setup-checklist').then((r) => r.json()) as Promise<{ success: boolean; data?: SetupChecklist | null }>,
    ]).then(([debtsRes, budgetRes, checklistRes]) => {
      setTotalMin(debtsRes.success && debtsRes.data ? debtsRes.data.reduce((s, d) => s + d.min_payment, 0) : 0);
      setBudget(budgetRes.success ? budgetRes.data ?? null : null);
      if (checklistRes.success && checklistRes.data) {
        setDone(checklistRes.data.completed_steps);
        setNudge(checklistRes.data.nudge_email_enabled);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const persist = (nextDone: number[], nextNudge: boolean) => {
    fetch('/api/setup-checklist', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed_steps: nextDone, nudge_email_enabled: nextNudge }),
    }).catch(() => {});
  };

  const toggleStep = (i: number) => {
    const next = done.includes(i) ? done.filter((x) => x !== i) : [...done, i];
    setDone(next);
    persist(next, nudge);
  };

  const toggleNudge = () => {
    const next = !nudge;
    setNudge(next);
    persist(done, next);
  };

  if (loading) {
    return (
      <div style={{ padding: 'clamp(22px,3vw,36px) clamp(18px,3vw,38px) 44px', textAlign: 'center', color: 'var(--ink-3)' }}>
        <span className="spin" style={{ display: 'inline-block', marginBottom: 12 }} />
        <div>Loading…</div>
      </div>
    );
  }

  const expenses = budget ? budget.categories.reduce((s, c) => s + c.amount, 0) : 0;
  const towardDebt = budget ? Math.max(0, budget.income - expenses) : 0;

  return (
    <div style={{ padding: 'clamp(22px,3vw,36px) clamp(18px,3vw,38px) 44px', maxWidth: 1080 }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(26px,3.4vw,34px)', fontWeight: 800, letterSpacing: '-.02em', color: 'var(--ink)' }}>Set It on Autopilot</h1>
        <p style={{ margin: '7px 0 0', color: 'var(--ink-3)', fontSize: 14.5 }}>A few one-time setup steps make this plan run itself. Do these and you barely have to think about it.</p>
      </div>

      <PayoffStepper current={3} />

      {budget && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
            {[
              { label: 'Income', value: money(budget.income), color: 'var(--ink)' },
              { label: 'Expenses', value: money(expenses), color: 'var(--ink)' },
              { label: 'Toward debt', value: money(towardDebt) + '/mo', color: 'var(--green)' },
            ].map((s, i) => (
              <span key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
                {i > 0 && <span style={{ width: 1, height: 30, background: 'var(--border-2)' }} />}
                <span>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '.04em', textTransform: 'uppercase' }}>{s.label}</div>
                  <div className="tnum" style={{ fontSize: 20, fontWeight: 900, color: s.color, marginTop: 2, lineHeight: 1 }}>{s.value}</div>
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--blue-strong)', letterSpacing: '.04em', textTransform: 'uppercase' }}>Your setup checklist</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: done.length === STEPS.length ? 'var(--green)' : 'var(--ink-3)' }}>{done.length} of {STEPS.length} done</span>
          <span style={{ width: 120, height: 7, borderRadius: 999, background: 'var(--border)', overflow: 'hidden', display: 'inline-block' }}>
            <span style={{ display: 'block', height: '100%', width: `${(done.length / STEPS.length) * 100}%`, background: 'var(--blue-strong)', borderRadius: 999, transition: 'width .25s' }} />
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 12, marginBottom: 22 }}>
        {STEPS.map((step, i) => {
          const isDone = done.includes(i);
          return (
            <div
              key={i}
              onClick={() => toggleStep(i)}
              className="card"
              style={{ display: 'flex', gap: 16, alignItems: 'flex-start', cursor: 'pointer', background: isDone ? 'var(--blue-tintbg)' : '#fff', borderColor: isDone ? '#bbf7d0' : 'var(--border)' }}
            >
              <span style={{ width: 28, height: 28, borderRadius: '50%', flex: 'none', marginTop: 1, display: 'grid', placeItems: 'center', border: `2px solid ${isDone ? 'var(--blue-strong)' : 'var(--border)'}`, background: isDone ? 'var(--blue-strong)' : 'transparent', color: '#fff' }}>
                {isDone && <Icon name="check" size={15} stroke={3} />}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', marginBottom: 4, textDecoration: isDone ? 'line-through' : 'none', opacity: isDone ? 0.7 : 1 }}>
                  {step.title}{i === 2 && totalMin > 0 ? ` (${money(totalMin)}/mo total)` : ''}
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.55 }}>{step.description}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ background: 'var(--blue-tintbg)', borderColor: '#bbf7d0', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 800, color: 'var(--blue-strong)', letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 16 }}>
          <Icon name="sparkle" size={16} /> Bonus moves
        </div>
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {BONUS_MOVES.map((b) => (
            <div key={b.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Icon name="check" size={17} stroke={3} style={{ color: 'var(--blue-strong)', marginTop: 1, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)', marginBottom: 3 }}>{b.title}</div>
                <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>{b.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div onClick={toggleNudge} className="card" style={{ display: 'flex', alignItems: 'center', gap: 13, cursor: 'pointer', flex: '1 1 320px', padding: '14px 18px' }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, flex: 'none', display: 'grid', placeItems: 'center', background: 'var(--blue-tintbg)', color: 'var(--blue-strong)' }}>
            <Icon name="clock" size={18} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>Email me a monthly nudge</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>A friendly reminder to make your extra payment.</div>
          </div>
          <span style={{ width: 44, height: 26, borderRadius: 999, flex: 'none', background: nudge ? 'var(--blue-strong)' : '#cbd2dc', position: 'relative' }}>
            <span style={{ position: 'absolute', top: 3, left: nudge ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .15s' }} />
          </span>
        </div>
        <button onClick={() => router.push('/payoff/pledge')} className="btn btn-primary" style={{ flex: 'none', padding: '14px 28px', fontSize: 15 }}>
          Make it official <Icon name="arrowRight" size={17} />
        </button>
      </div>
    </div>
  );
}
