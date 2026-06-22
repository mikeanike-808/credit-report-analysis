'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { PayoffStepper } from '@/components/payoff/PayoffStepper';
import { payoffMonths, aggregateDebts, money, freedomDate } from '@/lib/payoff';
import type { Debt, Budget, BudgetCategory } from '@/types';

// Starting template -- amounts are blank except Debt, which is pre-filled
// from the user's actual debts (Phase 2). `pct` = typical share of income
// for that category, used by the "are you sure these can't flex?" nudge.
function defaultCategories(totalMinPayment: number): BudgetCategory[] {
  return [
    { name: 'Debt', amount: totalMinPayment, color: '#2f6df0' },
    { name: 'Home (rent, utilities)', amount: 0, color: '#ef5a6a' },
    { name: 'Food (groceries, eating out)', amount: 0, color: '#14b8a6' },
    { name: 'Car (payment, gas, insurance)', amount: 0, color: '#8b5cf6' },
    { name: 'Phone & Internet', amount: 0, color: '#22c55e' },
    { name: 'Fun & Extras', amount: 0, color: '#f59e0b' },
    { name: 'Health (insurance, meds)', amount: 0, color: '#06b6d4' },
    { name: 'Savings', amount: 0, color: '#10b981' },
  ];
}

// Typical % of income benchmark, only for the categories worth challenging --
// matches the template order above (Debt and Health aren't challenged).
const FLEX_PCT: Record<string, number> = {
  'Food (groceries, eating out)': 12,
  'Phone & Internet': 4,
  'Fun & Extras': 5,
  Savings: 0,
};
const PALETTE = ['#0ea5e9', '#f43f5e', '#a855f7', '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#10b981'];

function num(v: number | string): number {
  return parseFloat(String(v).replace(/[$,]/g, '')) || 0;
}

function AmountInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [text, setText] = useState(value ? String(value) : '');
  useEffect(() => { setText(value ? String(value) : ''); }, [value]);
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: 96 }}>
      <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', fontSize: 13 }}>$</span>
      <input
        value={text}
        onChange={(e) => { setText(e.target.value); onChange(num(e.target.value)); }}
        inputMode="numeric"
        className="input"
        style={{ width: '100%', textAlign: 'right', padding: '7px 9px 7px 18px' }}
      />
    </span>
  );
}

export default function BudgetBuilderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [income, setIncomeState] = useState(0);
  const [incomeText, setIncomeText] = useState('');
  const [cats, setCats] = useState<BudgetCategory[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [kept, setKept] = useState<number[]>([]);
  const [hover, setHover] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const revealRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/debts').then((r) => r.json()) as Promise<{ success: boolean; data?: Debt[] }>,
      fetch('/api/budgets').then((r) => r.json()) as Promise<{ success: boolean; data?: Budget | null }>,
    ]).then(([debtsRes, budgetRes]) => {
      const totalMin = debtsRes.success && debtsRes.data ? debtsRes.data.reduce((s, d) => s + d.min_payment, 0) : 0;
      if (budgetRes.success && budgetRes.data) {
        setIncomeState(budgetRes.data.income);
        setIncomeText(budgetRes.data.income ? String(budgetRes.data.income) : '');
        setCats(budgetRes.data.categories.length > 0 ? budgetRes.data.categories : defaultCategories(totalMin));
        setRevealed(budgetRes.data.categories.some((c) => c.amount > 0));
      } else {
        setCats(defaultCategories(totalMin));
      }
    }).catch(() => setCats(defaultCategories(0)))
      .finally(() => setLoading(false));
  }, []);

  const setAmount = (i: number, value: number) => setCats((c) => c.map((x, k) => (k === i ? { ...x, amount: value } : x)));
  const setName = (i: number, value: string) => setCats((c) => c.map((x, k) => (k === i ? { ...x, name: value } : x)));
  const addCategory = () => setCats((c) => [...c, { name: '', amount: 0, color: PALETTE[c.length % PALETTE.length]!, custom: true }]);
  const removeCategory = (i: number) => setCats((c) => c.filter((_, k) => k !== i));

  const spent = cats.reduce((s, c) => s + c.amount, 0);
  const leftover = income - spent;
  const segs = cats.filter((c) => c.amount > 0);
  const drawSegs = useMemo(() => segs.concat(leftover > 0 ? [{ name: 'Left over', amount: leftover, color: '#34d399' }] : []), [segs, leftover]);

  const challenges = useMemo(() => cats.map((c, i) => {
    const pct = FLEX_PCT[c.name];
    if (pct == null || kept.includes(i)) return null;
    const cur = c.amount;
    if (cur <= 0) return null;
    const target = (income * pct) / 100;
    const free = cur - target;
    if (free < 25) return null;
    return { i, name: c.name, color: c.color, cur, curPct: (cur / (income || 1)) * 100, pct, target, free, redirect: c.name === 'Savings' };
  }).filter((c): c is NonNullable<typeof c> => c !== null), [cats, kept, income]);

  const extraFound = Math.round(challenges.reduce((s, c) => s + c.free, 0));

  const fillRows = cats.filter((c) => !(c.custom && !c.name.trim() && c.amount === 0));
  const filledCount = fillRows.filter((c) => c.amount > 0 || c.name === 'Debt').length;
  const allFilled = fillRows.length > 1 && fillRows.every((c) => c.amount > 0 || c.name === 'Debt');

  const trimTo = (i: number, target: number) => setAmount(i, Math.round(target));

  const saveBudget = async (nextCats: BudgetCategory[] = cats) => {
    setSaving(true);
    try {
      await fetch('/api/budgets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ income, categories: nextCats }),
      });
    } finally {
      setSaving(false);
    }
  };

  const reveal = async () => {
    setRevealed(true);
    await saveBudget();
    requestAnimationFrame(() => {
      setTimeout(() => {
        revealRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    });
  };

  let acc = 0;
  const stops = segs.map((c) => {
    const a = (acc / (income || 1)) * 360;
    acc += c.amount;
    const b = (acc / (income || 1)) * 360;
    return `${c.color} ${a}deg ${b}deg`;
  });
  stops.push(`#eef1f6 ${(Math.min(acc, income || 1) / (income || 1)) * 360}deg 360deg`);
  const donut = `conic-gradient(${stops.join(', ')})`;

  if (loading) {
    return (
      <div style={{ padding: 'clamp(22px,3vw,36px) clamp(18px,3vw,38px) 44px', textAlign: 'center', color: 'var(--ink-3)' }}>
        <span className="spin" style={{ display: 'inline-block', marginBottom: 12 }} />
        <div>Loading your budget…</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 'clamp(22px,3vw,36px) clamp(18px,3vw,38px) 44px', maxWidth: 1180 }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(26px,3.4vw,34px)', fontWeight: 800, letterSpacing: '-.02em', color: 'var(--ink)' }}>Budget Builder</h1>
        <p style={{ margin: '7px 0 0', color: 'var(--ink-3)', fontSize: 14.5 }}>We know your debt — now let&rsquo;s map your money so we can find what to throw at it each month.</p>
      </div>

      <PayoffStepper current={0} />

      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: '1 1 420px', minWidth: 320, padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '18px 22px', borderBottom: '1px solid var(--border-2)' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue-strong)', letterSpacing: '.04em', textTransform: 'uppercase' }}>Monthly income</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>Take-home pay each month</div>
            </div>
            <span style={{ position: 'relative', display: 'inline-block', width: 130 }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-2)', fontWeight: 700, fontSize: 16 }}>$</span>
              <input
                value={incomeText}
                onChange={(e) => { setIncomeText(e.target.value); setIncomeState(num(e.target.value)); }}
                inputMode="numeric"
                className="input"
                style={{ width: '100%', textAlign: 'right', padding: '10px 12px 10px 24px', fontSize: 17, fontWeight: 800 }}
              />
            </span>
          </div>
          <div style={{ padding: '6px 22px 16px' }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '.05em', textTransform: 'uppercase', padding: '12px 0 6px' }}>Monthly expenses</div>
            {cats.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: i === cats.length - 1 ? 'none' : '1px solid var(--border-2)' }}>
                <span style={{ width: 12, height: 12, borderRadius: 4, flex: 'none', background: c.color }} />
                {c.custom ? (
                  <input value={c.name} onChange={(e) => setName(i, e.target.value)} placeholder="Category name" style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: 'var(--ink)', fontWeight: 600, background: 'transparent', border: 'none', borderBottom: '1px dashed var(--border)', padding: '4px 2px', outline: 'none' }} />
                ) : (
                  <span style={{ flex: 1, fontSize: 13.5, color: 'var(--ink-2)', fontWeight: 600 }}>
                    {c.name}
                    {c.name === 'Debt' && <span style={{ fontSize: 11, color: 'var(--blue-strong)', fontWeight: 700, marginLeft: 8, background: 'var(--blue-tintbg)', padding: '2px 7px', borderRadius: 999 }}>from your plan</span>}
                  </span>
                )}
                <AmountInput value={c.amount} onChange={(v) => setAmount(i, v)} />
                {c.custom && (
                  <button onClick={() => removeCategory(i)} title="Remove" style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'grid', placeItems: 'center', flex: 'none' }}>
                    <Icon name="trash" size={14} />
                  </button>
                )}
              </div>
            ))}
            <button onClick={addCategory} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 14, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--blue-strong)', fontSize: 13, fontWeight: 700 }}>
              <span style={{ width: 22, height: 22, borderRadius: 7, background: 'var(--blue-tintbg)', display: 'grid', placeItems: 'center' }}><Icon name="plus" size={14} /></span>
              Add a category
            </button>
          </div>
        </div>

        <div className="card" style={{ flex: '1 1 360px', minWidth: 300, padding: '26px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {revealed ? (
            <>
              <div style={{ width: 'min(280px,72vw)', aspectRatio: '1', position: 'relative', borderRadius: '50%', background: donut }}>
                <div style={{ position: 'absolute', inset: '14%', borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                  {hover === null ? (
                    <div>
                      <div className="tnum" style={{ fontSize: 'clamp(24px,3.6vw,30px)', fontWeight: 900, color: 'var(--ink)', letterSpacing: '-.02em', lineHeight: 1 }}>{money(income)}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>monthly income</div>
                    </div>
                  ) : (
                    <div style={{ maxWidth: '80%' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{drawSegs[hover]!.name}</div>
                      <div className="tnum" style={{ fontSize: 'clamp(20px,3vw,26px)', fontWeight: 900, color: 'var(--ink)', lineHeight: 1, marginTop: 3 }}>{money(drawSegs[hover]!.amount)}</div>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16, justifyContent: 'center' }}>
                {drawSegs.map((s, i) => (
                  <span
                    key={s.name}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--ink-2)', cursor: 'default' }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} /> {s.name.split(' (')[0]}
                  </span>
                ))}
              </div>
              <div style={{ width: '100%', marginTop: 18, background: leftover >= 0 ? 'var(--blue-tintbg)' : 'var(--red-bg)', border: `1px solid ${leftover >= 0 ? '#bbf7d0' : '#f3c9c9'}`, borderRadius: 14, padding: '16px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: leftover >= 0 ? 'var(--blue-strong)' : 'var(--red)', marginBottom: 5 }}>
                  {leftover >= 0 ? 'Money Left Over' : 'Over budget by'}
                </div>
                <div className="tnum" style={{ fontSize: 'clamp(26px,4.5vw,36px)', fontWeight: 900, color: leftover >= 0 ? 'var(--blue-strong)' : 'var(--red)', lineHeight: 1 }}>
                  {money(Math.abs(leftover))}<span style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 600 }}>/mo</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 7 }}>{money(income)} income − {money(spent)} expenses</div>
              </div>
            </>
          ) : (
            <div style={{ width: '100%', minHeight: 340, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 16, padding: '20px 8px' }}>
              <span style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--blue-tintbg)', color: 'var(--blue-strong)', display: 'grid', placeItems: 'center' }}>
                <Icon name="dollarSign" size={28} />
              </span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>Fill in your expenses first</div>
                <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6, maxWidth: 270, lineHeight: 1.55 }}>Enter what you really spend each month — nothing&rsquo;s judged here.</div>
              </div>
              {allFilled ? (
                <button className="btn btn-primary" onClick={reveal}>Show me what&rsquo;s left</button>
              ) : (
                <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>Fill in every category to continue ({filledCount}/{fillRows.length})</div>
              )}
            </div>
          )}
        </div>
      </div>

      {revealed && challenges.length > 0 && (
        <div ref={revealRef} className="card" style={{ marginTop: 18, padding: 0, overflow: 'hidden', borderColor: '#f3d9a8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 22px', background: '#fffbf2', borderBottom: '1px solid #f3e4c2' }}>
            <span style={{ width: 38, height: 38, borderRadius: 11, flex: 'none', background: '#fef3c7', color: '#b45309', display: 'grid', placeItems: 'center' }}>
              <Icon name="info" size={20} />
            </span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>Are you sure these can&rsquo;t flex?</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 1 }}>Trimming these to the benchmark could free up <strong style={{ color: '#b45309' }}>{money(extraFound)}/mo</strong> more for debt.</div>
            </div>
          </div>
          <div style={{ padding: '6px 22px 18px' }}>
            {challenges.map((c) => (
              <div key={c.i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0', borderBottom: '1px solid var(--border-2)', flexWrap: 'wrap' }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, flex: 'none', background: c.color }} />
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>{c.name.split(' (')[0]}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                    {c.redirect
                      ? <>Even a good savings account earns less than your debt costs in interest — pause it until the debt&rsquo;s gone.</>
                      : <>You&rsquo;re at <strong style={{ color: '#b45309' }}>{Math.round(c.curPct)}%</strong> of income. Most people aim for about {c.pct}%.</>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flex: 'none' }}>
                  <div className="tnum" style={{ fontSize: 16, fontWeight: 800, color: 'var(--green)' }}>+{money(c.free)}<span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>/mo</span></div>
                </div>
                <div style={{ display: 'flex', gap: 6, flex: 'none' }}>
                  <button onClick={() => trimTo(c.i, c.target)} className="btn btn-primary" style={{ fontSize: 12.5, padding: '7px 12px' }}>{c.redirect ? 'Pause it' : `Trim to ${c.pct}%`}</button>
                  <button onClick={() => setKept((k) => [...k, c.i])} className="btn btn-outline" style={{ fontSize: 12, padding: '6px 12px' }}>Keep it</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {revealed && challenges.length === 0 && (
        <PayoffPreview leftover={leftover} saving={saving} onContinue={async () => { await saveBudget(); router.push('/payoff/calculator'); }} />
      )}
    </div>
  );
}

// Small teaser projection shown once the budget is fully revealed and no
// more "can this flex" nudges remain -- uses the same aggregate-debt math
// as the wizard's Impact screen, just to make "leftover -> debt-free date"
// concrete before sending the user to the full calculator.
function PayoffPreview({ leftover, saving, onContinue }: { leftover: number; saving: boolean; onContinue: () => void }) {
  const [debts, setDebts] = useState<Debt[]>([]);
  useEffect(() => {
    fetch('/api/debts').then((r) => r.json()).then((data: { success: boolean; data?: Debt[] }) => {
      if (data.success && data.data) setDebts(data.data);
    }).catch(() => {});
  }, []);
  const { totalBalance, totalMin, weightedApr } = aggregateDebts(debts);
  const planMonths = payoffMonths(totalBalance, weightedApr, totalMin + Math.max(0, leftover));

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap', marginTop: 18 }}>
      <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
        {leftover > 0
          ? `Put your ${money(leftover)}/mo toward debt → debt-free by ${freedomDate(planMonths)}.`
          : 'Trim an expense to free up money for debt.'}
      </span>
      <button className="btn btn-primary" onClick={onContinue} disabled={saving}>
        {saving ? <span className="spin" /> : <Icon name="arrowRight" size={16} />} See My Payoff Plan
      </button>
    </div>
  );
}
