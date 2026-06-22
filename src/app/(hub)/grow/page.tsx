'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { futureValue, money } from '@/lib/payoff';
import type { Debt, PayoffPlanRecord, GrowProgress } from '@/types';

interface CreditStep {
  icon: string;
  title: string;
  body: string;
  cta?: string;
  ctaLabel?: string;
}

const MAINTAIN_STEPS: CreditStep[] = [
  { icon: 'creditCard', title: 'Keep your oldest cards open', body: "Length of credit history helps your score. Don't close old cards once they're paid off — put one small recurring bill on each and let it sit." },
  { icon: 'refresh', title: 'Keep every card active', body: 'Issuers close cards that go unused — and a closed card lowers your total available credit, which hurts your utilization. Run a small charge through each one every month or two and pay it off.' },
  { icon: 'checkSquare', title: 'Autopay every bill in full', body: 'Payment history is the single biggest factor. Set every card and loan to autopay the statement balance so a late payment can never happen again.' },
  { icon: 'gauge', title: 'Keep usage under 10%', body: "Now that balances are low, keep them there. Using less than 10% of each card's limit is one of the fastest ways to hold your score up." },
  { icon: 'fileText', title: "Keep disputing what's wrong", body: 'Re-pull your report every few months. Anything inaccurate that reappears, dispute it again — your letters are ready to go.', cta: '/dispute-letters', ctaLabel: 'Go to Dispute Letters' },
];

const GROW_CREDIT_STEPS: CreditStep[] = [
  { icon: 'trending', title: 'Ask for a credit limit increase', body: "Once you've made a few on-time payments, ask each issuer to raise your limit. A higher limit with the same low balance instantly drops your utilization — just don't spend the extra room." },
  { icon: 'user', title: 'Become an authorized user', body: "Ask someone with a long, well-paid card to add you as an authorized user. Their history can post to your report and lift your score — you don't even need to use the card." },
  { icon: 'creditCard', title: 'Add a secured card or builder loan', body: 'If your file is thin, a secured card or a credit-builder loan adds positive payment history every month and strengthens your credit mix.' },
  { icon: 'shield', title: 'Open new credit carefully', body: 'New accounts help your mix, but each application is a hard inquiry and lowers your average account age. Space them out and only apply when there is a real benefit.' },
];

const MONEY_STEPS = [
  { tag: 'First', title: 'Starter emergency fund', target: '$1,000', body: 'Before anything else, stash $1,000 for the unexpected so a flat tire never goes back on a credit card.', tone: 'amber' as const },
  { tag: 'Then', title: 'Capture your 401(k) match', target: 'Free money', body: "If your employer matches contributions, put in at least enough to get the full match. It's an instant 50–100% return — never leave it on the table.", tone: 'green' as const },
  { tag: 'Next', title: 'Full emergency fund', target: '3–6 months', body: 'Build savings to cover 3–6 months of expenses. This is what keeps you out of debt for good when life happens.', tone: 'green' as const },
  { tag: 'Then', title: 'Open a Roth IRA', target: 'Tax-free growth', body: 'Invest in low-cost index funds inside a Roth IRA. You pay tax now, and every dollar it earns comes out tax-free in retirement.', tone: 'green' as const },
  { tag: 'Finally', title: 'Invest the rest', target: 'Build wealth', body: "Keep automatically investing what's left each month into broad index funds. Time in the market is what turns your freed-up payment into real wealth.", tone: 'green' as const },
];

const TONE = {
  amber: { bg: '#fdf0d5', fg: 'var(--amber)' },
  green: { bg: 'var(--blue-tintbg)', fg: 'var(--blue-strong)' },
};

type Tab = 'maintain' | 'grow' | 'money';

export default function GrowAndRebuildPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [freedUp, setFreedUp] = useState(0);
  const [tab, setTab] = useState<Tab>('maintain');
  const [completed, setCompleted] = useState<{ maintain: number[]; grow: number[] }>({ maintain: [], grow: [] });

  useEffect(() => {
    Promise.all([
      fetch('/api/debts').then((r) => r.json()) as Promise<{ success: boolean; data?: Debt[] }>,
      fetch('/api/payoff-plan').then((r) => r.json()) as Promise<{ success: boolean; data?: PayoffPlanRecord | null }>,
      fetch('/api/grow-progress').then((r) => r.json()) as Promise<{ success: boolean; data?: GrowProgress | null }>,
    ]).then(([debtsRes, planRes, progressRes]) => {
      const totalMin = debtsRes.success && debtsRes.data ? debtsRes.data.reduce((s, d) => s + d.min_payment, 0) : 0;
      const extra = planRes.success && planRes.data ? planRes.data.extra_payment : 0;
      setFreedUp(totalMin + extra);
      if (progressRes.success && progressRes.data) setCompleted(progressRes.data.completed);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const horizons = useMemo(() => [10, 20, 30].map((years) => ({ years, value: futureValue(freedUp, 0.07, years) })), [freedUp]);

  const persist = (next: { maintain: number[]; grow: number[] }) => {
    setCompleted(next);
    fetch('/api/grow-progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: next }),
    }).catch(() => {});
  };

  const toggleStep = (listKey: 'maintain' | 'grow', index: number) => {
    const list = completed[listKey];
    const next = list.includes(index) ? list.filter((i) => i !== index) : [...list, index];
    persist({ ...completed, [listKey]: next });
  };

  if (loading) {
    return (
      <div style={{ padding: 'clamp(22px,3vw,36px) clamp(18px,3vw,38px) 44px', textAlign: 'center', color: 'var(--ink-3)' }}>
        <span className="spin" style={{ display: 'inline-block', marginBottom: 12 }} />
        <div>Loading…</div>
      </div>
    );
  }

  const creditSteps = tab === 'maintain' ? MAINTAIN_STEPS : GROW_CREDIT_STEPS;
  const doneList = tab === 'grow' ? completed.grow : completed.maintain;

  return (
    <div style={{ padding: 'clamp(22px,3vw,36px) clamp(18px,3vw,38px) 44px', maxWidth: 1080 }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(26px,3.4vw,34px)', fontWeight: 800, letterSpacing: '-.02em', color: 'var(--ink)' }}>Grow &amp; Rebuild</h1>
        <p style={{ margin: '7px 0 0', color: 'var(--ink-3)', fontSize: 14.5 }}>You did the hard part. Now protect and grow your credit — and put the money you freed up to work building wealth.</p>
      </div>

      <div style={{ background: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)', borderRadius: 18, padding: 'clamp(24px,3.2vw,38px)', color: '#fff', display: 'flex', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', alignItems: 'center', border: '1px solid #15803d', marginBottom: 18 }}>
        <div style={{ minWidth: 220 }}>
          <div className="tnum" style={{ fontSize: 'clamp(32px,4.6vw,48px)', fontWeight: 900, letterSpacing: '-.02em', lineHeight: 1 }}>{money(freedUp)}<span style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,.7)' }}>/mo</span></div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'rgba(255,255,255,.78)', marginTop: 9 }}>Back in your pocket</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.6)', marginBottom: 7 }}>Invested at 7%, could grow to</div>
          <div className="tnum" style={{ fontSize: 'clamp(28px,3.8vw,40px)', fontWeight: 900, color: '#86efac', letterSpacing: '-.02em', lineHeight: 1 }}>{money(horizons[2]!.value)}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', marginTop: 8 }}>in 30 years</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {([
          { key: 'maintain', label: 'Maintain Your Credit' },
          { key: 'grow', label: 'Grow Your Credit' },
          { key: 'money', label: 'Grow Your Money' },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 18px', borderRadius: 11, cursor: 'pointer',
              border: `1px solid ${tab === t.key ? 'var(--blue-strong)' : 'var(--border)'}`,
              background: tab === t.key ? 'var(--blue-strong)' : '#fff',
              color: tab === t.key ? '#fff' : 'var(--ink-2)', fontSize: 14, fontWeight: 700,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab !== 'money' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {creditSteps.map((step, i) => {
            const done = doneList.includes(i);
            return (
              <div key={step.title} className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <button
                  onClick={() => toggleStep(tab as 'maintain' | 'grow', i)}
                  title={done ? 'Mark not done' : 'Mark done'}
                  style={{
                    flex: 'none', width: 30, height: 30, marginTop: 1, borderRadius: '50%', cursor: 'pointer', padding: 0,
                    display: 'grid', placeItems: 'center', border: `2px solid ${done ? 'var(--blue-strong)' : 'var(--border)'}`,
                    background: done ? 'linear-gradient(150deg,#22c55e,#16a34a)' : '#fff', color: '#fff',
                  }}
                >
                  {done ? <Icon name="check" size={16} stroke={3} /> : <Icon name={step.icon} size={15} />}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.55 : 1 }}>{step.title}</div>
                  <div style={{ fontSize: 13.5, color: 'var(--ink-3)', marginTop: 4, lineHeight: 1.55, opacity: done ? 0.55 : 1 }}>{step.body}</div>
                  {step.cta && (
                    <button onClick={() => router.push(step.cta!)} style={{ marginTop: 10, background: 'none', border: 'none', padding: 0, color: 'var(--blue-strong)', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      {step.ctaLabel} <Icon name="arrowRight" size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 18 }}>
            {MONEY_STEPS.map((step, i) => {
              const t = TONE[step.tone];
              return (
                <div key={step.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '18px 20px', borderBottom: i === MONEY_STEPS.length - 1 ? 'none' : '1px solid var(--border-2)' }}>
                  <span style={{ flex: 'none', width: 30, height: 30, borderRadius: '50%', display: 'grid', placeItems: 'center', background: t.bg, color: t.fg, fontSize: 13, fontWeight: 800 }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>
                        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: t.fg, marginRight: 8 }}>{step.tag}</span>
                        {step.title}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 800, color: t.fg, background: t.bg, padding: '3px 11px', borderRadius: 999, whiteSpace: 'nowrap' }}>{step.target}</span>
                    </div>
                    <div style={{ fontSize: 13.5, color: 'var(--ink-3)', marginTop: 5, lineHeight: 1.55 }}>{step.body}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card">
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>If you invest your {money(freedUp)}/mo instead</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16 }}>Estimated value at a 7% average annual return.</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
              {horizons.map((h) => (
                <div key={h.years} style={{ textAlign: 'center', padding: '16px 10px', background: 'var(--blue-tintbg)', border: '1px solid #bbf7d0', borderRadius: 14 }}>
                  <div className="tnum" style={{ fontSize: 'clamp(20px,2.8vw,28px)', fontWeight: 900, color: 'var(--blue-strong)', letterSpacing: '-.02em', lineHeight: 1.05 }}>{money(h.value)}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', marginTop: 6 }}>in {h.years} years</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 14, lineHeight: 1.5 }}>Projections are illustrative, not a guarantee. Actual returns vary and investments can lose value.</div>
          </div>
        </div>
      )}
    </div>
  );
}
