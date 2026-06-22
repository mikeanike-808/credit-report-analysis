'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { PayoffStepper } from '@/components/payoff/PayoffStepper';
import { simulateAvalanche, money } from '@/lib/payoff';
import type { Debt, Budget, PayoffPlanRecord, PayoffPledge } from '@/types';

function longDate(monthsFromNow: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + monthsFromNow);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function PledgePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [extra, setExtra] = useState(0);
  const [budget, setBudget] = useState<Budget | null>(null);

  const [name, setName] = useState('');
  const [importance, setImportance] = useState(0);
  const [vision, setVision] = useState('');
  const [plan, setPlan] = useState('');
  const [signedAt, setSignedAt] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/debts').then((r) => r.json()) as Promise<{ success: boolean; data?: Debt[] }>,
      fetch('/api/payoff-plan').then((r) => r.json()) as Promise<{ success: boolean; data?: PayoffPlanRecord | null }>,
      fetch('/api/budgets').then((r) => r.json()) as Promise<{ success: boolean; data?: Budget | null }>,
      fetch('/api/payoff-pledge').then((r) => r.json()) as Promise<{ success: boolean; data?: PayoffPledge | null }>,
    ]).then(([debtsRes, planRes, budgetRes, pledgeRes]) => {
      setDebts(debtsRes.success && debtsRes.data ? debtsRes.data : []);
      setExtra(planRes.success && planRes.data ? planRes.data.extra_payment : 0);
      setBudget(budgetRes.success ? budgetRes.data ?? null : null);
      if (pledgeRes.success && pledgeRes.data) {
        setName(pledgeRes.data.pledge_name);
        setImportance(pledgeRes.data.importance);
        setVision(pledgeRes.data.vision_text);
        setPlan(pledgeRes.data.plan_text);
        setSignedAt(pledgeRes.data.pledge_signed_at);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const totalMin = debts.reduce((s, d) => s + d.min_payment, 0);
  const totalMonthly = totalMin + extra;
  const sim = useMemo(() => simulateAvalanche(debts, extra), [debts, extra]);
  const freeDate = longDate(sim.totalMonths);
  const signed = !!signedAt;

  const save = (overrides: Partial<{ vision_text: string; plan_text: string; importance: number; pledge_name: string; sign: boolean }> = {}) => {
    fetch('/api/payoff-pledge', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vision_text: vision, plan_text: plan, importance, pledge_name: name, sign: false,
        ...overrides,
      }),
    }).catch(() => {});
  };

  const handleSign = async () => {
    if (!name.trim()) return;
    try {
      const res = await fetch('/api/payoff-pledge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vision_text: vision, plan_text: plan, importance, pledge_name: name, sign: true }),
      });
      const data = await res.json() as { success: boolean; data?: PayoffPledge };
      if (data.success && data.data) setSignedAt(data.data.pledge_signed_at);
      // Mark the Payoff Plan journey goal reached -- mirrors the sidebar's
      // own manual "mark this goal reached" action, just triggered here
      // since signing the pledge IS reaching this goal.
      await fetch('/api/journey', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'advance' }),
      });
    } catch {
      // non-fatal -- the pledge state above already reflects locally even if this fails
    }
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

  return (
    <div style={{ padding: 'clamp(22px,3vw,36px) clamp(18px,3vw,38px) 56px', maxWidth: 920 }}>
      <div className="dg-noprint" style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(26px,3.4vw,34px)', fontWeight: 800, letterSpacing: '-.02em', color: 'var(--ink)' }}>Make It Official</h1>
        <p style={{ margin: '7px 0 0', color: 'var(--ink-3)', fontSize: 14.5 }}>This is the moment it becomes real. Picture life on the other side, then put your name on it.</p>
      </div>

      <div className="dg-noprint"><PayoffStepper current={4} /></div>

      <div className="dg-noprint card" style={{ padding: 'clamp(22px,3vw,36px)', marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--blue-strong)', letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 8 }}>Why this matters</div>
        <div style={{ fontSize: 'clamp(19px,2.4vw,24px)', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-.015em', marginBottom: 8, lineHeight: 1.3 }}>
          This isn&rsquo;t a budgeting exercise. It&rsquo;s the day you stop renting your future to your debt.
        </div>
        <div style={{ fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.6, marginBottom: 26, maxWidth: 620 }}>
          Being debt-free puts {money(totalMonthly)} a month back in your hands — every month, for the rest of your life.
        </div>

        <div style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 16, padding: 'clamp(16px,2vw,22px)', marginBottom: 26 }}>
          <label style={{ fontSize: 'clamp(15px,1.8vw,18px)', fontWeight: 800, color: 'var(--ink)', display: 'block', marginBottom: 4 }}>Be honest — how badly do you want this?</label>
          <div style={{ fontSize: 13.5, color: 'var(--ink-3)', marginBottom: 14 }}>There&rsquo;s no right answer. But the number you pick is the number you&rsquo;ll have to live up to.</div>
          <div style={{ display: 'flex', gap: 'clamp(4px,1vw,8px)' }}>
            {Array.from({ length: 10 }, (_, idx) => idx + 1).map((n) => (
              <button
                key={n}
                onClick={() => { setImportance(n); save({ importance: n }); }}
                style={{
                  flex: 1, minWidth: 0, height: 48, borderRadius: 11, cursor: 'pointer', fontSize: 'clamp(14px,1.8vw,16px)', fontWeight: 800,
                  border: `1.5px solid ${n <= importance ? 'var(--blue-strong)' : 'var(--border)'}`,
                  background: n <= importance ? 'var(--blue-strong)' : '#fff',
                  color: n <= importance ? '#fff' : 'var(--ink-3)',
                }}
              >
                {n}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginTop: 8 }}>
            <span>I could take it or leave it</span>
            <span>It&rsquo;s everything to me</span>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 24 }}>
          <div>
            <label style={{ fontSize: 'clamp(15px,1.8vw,18px)', fontWeight: 800, color: 'var(--ink)', display: 'block', marginBottom: 10 }}>When you&rsquo;re debt-free, what does life actually feel like?</label>
            <textarea
              value={vision}
              onChange={(e) => setVision(e.target.value)}
              onBlur={() => save({ vision_text: vision })}
              placeholder="No more dread when the statement arrives. Sleeping through the night. Saying yes to the trip you keep putting off…"
              className="input"
              style={{ width: '100%', minHeight: 130, resize: 'vertical', padding: '16px 18px', fontSize: 15, lineHeight: 1.6 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 'clamp(15px,1.8vw,18px)', fontWeight: 800, color: 'var(--ink)', display: 'block', marginBottom: 10 }}>What will you do with the {money(totalMonthly)} a month once it&rsquo;s yours again?</label>
            <textarea
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              onBlur={() => save({ plan_text: plan })}
              placeholder="A real emergency fund. Investing for the first time. A down payment. Your kids' future instead of an interest payment…"
              className="input"
              style={{ width: '100%', minHeight: 130, resize: 'vertical', padding: '16px 18px', fontSize: 15, lineHeight: 1.6 }}
            />
          </div>
        </div>
      </div>

      {/* the pledge */}
      <div className="dg-noprint" style={{ background: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)', borderRadius: 18, padding: 'clamp(26px,3.2vw,38px)', color: '#fff', border: '1px solid #15803d' }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.7)', textAlign: 'center' }}>My pledge</div>
        <div style={{ fontSize: 'clamp(19px,2.5vw,26px)', fontWeight: 800, lineHeight: 1.4, margin: '14px auto 6px', letterSpacing: '-.01em', textAlign: 'center', maxWidth: 640 }}>
          I, <span style={{ color: '#bbf7d0', fontFamily: name ? 'Georgia, serif' : 'inherit', fontStyle: name ? 'italic' : 'normal' }}>{name || '            '}</span>, am clearing every dollar of my debt — for good.
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,.85)', textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
          {money(totalMonthly)} a month, every month, until I&rsquo;m free by <span style={{ color: '#bbf7d0', fontWeight: 700 }}>{freeDate}</span>.
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,.2)', paddingTop: 20, marginTop: 24, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>
          {!signed ? (
            <>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.8)', display: 'block', marginBottom: 8, textAlign: 'center' }}>Sign with your name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => save({ pledge_name: name })}
                placeholder="Type your full name"
                style={{ width: '100%', boxSizing: 'border-box', padding: '13px 16px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,.35)', background: 'rgba(255,255,255,.12)', color: '#fff', fontSize: 18, fontFamily: 'Georgia, serif', fontStyle: 'italic', textAlign: 'center', outline: 'none', marginBottom: 12 }}
              />
              <button
                onClick={handleSign}
                disabled={!name.trim()}
                style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', cursor: name.trim() ? 'pointer' : 'not-allowed', background: name.trim() ? '#fff' : 'rgba(255,255,255,.4)', color: 'var(--blue-strong)', fontSize: 15.5, fontWeight: 800 }}
              >
                I&rsquo;m 100% committed
              </button>
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontFamily: 'Georgia, serif', fontStyle: 'italic', color: '#fff', marginBottom: 8 }}>{name}</div>
              <div style={{ height: 1, background: 'rgba(255,255,255,.35)', margin: '0 auto 12px', maxWidth: 260 }} />
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800, color: '#bbf7d0' }}>
                <Icon name="checkCircle" size={18} /> Committed on {new Date(signedAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              {vision.trim() && (
                <div style={{ marginTop: 16, fontSize: 14.5, fontStyle: 'italic', color: 'rgba(255,255,255,.9)', lineHeight: 1.5, maxWidth: 380, margin: '16px auto 0' }}>
                  &ldquo;{vision.trim()}&rdquo;
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {signed && (
        <div className="dg-noprint" style={{ textAlign: 'center', marginTop: 20, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => window.print()} className="btn btn-outline" style={{ padding: '13px 26px' }}>
            <Icon name="print" size={17} /> Print my plan
          </button>
          <button onClick={() => router.push('/payoff/tracker')} className="btn btn-primary" style={{ padding: '13px 26px' }}>
            <Icon name="trending" size={17} /> Watch my progress
          </button>
        </div>
      )}

      {/* printable plan -- screen-hidden, shown only inside the print dialog */}
      <div className="dg-printonly" style={{ color: '#0f1b33' }}>
        <div style={{ background: '#166534', color: '#fff', borderRadius: 16, padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: '#86efac' }}>My Debt-Free Plan</div>
            <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.1, marginTop: 8 }}>I&rsquo;m debt-free by<br />{freeDate}.</div>
          </div>
          <div style={{ textAlign: 'right', flex: 'none', borderLeft: '1px solid rgba(255,255,255,.22)', paddingLeft: 22 }}>
            <div className="tnum" style={{ fontSize: 32, fontWeight: 900, lineHeight: 1 }}>{money(totalMonthly)}</div>
            <div style={{ fontSize: 11, color: '#bbf7d0', marginTop: 5, fontWeight: 600 }}>toward debt, every month</div>
          </div>
        </div>

        {budget && budget.categories.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: '.02em', textTransform: 'uppercase', marginBottom: 10 }}>Monthly Budget</div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
              {budget.categories.filter((c) => c.amount > 0).map((c, i) => (
                <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 16px', background: i % 2 ? '#f8fafc' : '#fff', borderBottom: '1px solid #eef2f7' }}>
                  <span style={{ color: '#475569', fontWeight: 600 }}>{c.name}</span>
                  <span className="tnum" style={{ fontWeight: 700 }}>{money(c.amount)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 16px', fontWeight: 800, color: '#fff', background: '#166534' }}>
                <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.03em' }}>Left for debt</span>
                <span className="tnum" style={{ fontSize: 15 }}>{money(Math.max(0, budget.income - expenses))}/mo</span>
              </div>
            </div>
          </div>
        )}

        {debts.length > 0 && (
          <div style={{ marginTop: 22 }}>
            <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: '.02em', textTransform: 'uppercase', marginBottom: 10 }}>My Payoff Schedule</div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
              {sim.order.map((idx, i) => {
                const d = debts[idx]!;
                const isTarget = i === 0;
                const payNow = i === 0 ? d.min_payment + extra : d.min_payment;
                return (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 13, padding: '9px 16px', background: isTarget ? '#f1f5f0' : '#fff', borderTop: i === 0 ? 'none' : '1px solid #eef2f7' }}>
                    <span style={{ flex: 1, fontWeight: 700 }}>{d.name}</span>
                    <span className="tnum" style={{ width: 78, textAlign: 'right' }}>{money(d.balance)}</span>
                    <span className="tnum" style={{ width: 60, textAlign: 'right', color: '#64748b' }}>{d.apr}%</span>
                    <span className="tnum" style={{ width: 70, textAlign: 'right', fontWeight: 800 }}>{money(payNow)}</span>
                    <span style={{ width: 90, textAlign: 'right', color: '#475569', fontWeight: 600 }}>{longDate(sim.payoffMonth[idx]!)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ marginTop: 22, border: '1.5px solid #166534', borderRadius: 14, padding: '20px 24px' }}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '.14em', textTransform: 'uppercase', color: '#166534', marginBottom: 12 }}>My Pledge</div>
          {vision.trim() && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', marginBottom: 4, textTransform: 'uppercase' }}>What life feels like debt-free</div>
              <div style={{ fontSize: 14, lineHeight: 1.6, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>&ldquo;{vision.trim()}&rdquo;</div>
            </div>
          )}
          {plan.trim() && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', marginBottom: 4, textTransform: 'uppercase' }}>What I&rsquo;ll do with my {money(totalMonthly)}/mo</div>
              <div style={{ fontSize: 14, lineHeight: 1.6, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>&ldquo;{plan.trim()}&rdquo;</div>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginTop: 22, paddingTop: 16, borderTop: '1px dashed #cbd5e1' }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'Georgia, serif', fontStyle: 'italic', color: '#166534', borderBottom: '1.5px solid #166534', paddingBottom: 4, minWidth: 220, display: 'inline-block' }}>{name || ' '}</div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 5, textTransform: 'uppercase', fontWeight: 800 }}>Signed</div>
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{signedAt ? new Date(signedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
