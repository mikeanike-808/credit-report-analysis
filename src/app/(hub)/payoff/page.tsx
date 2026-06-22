'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { useAnalysis } from '@/context/AnalysisContext';
import { useEnsureAnalysis } from '@/lib/useEnsureAnalysis';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { payoffMonths, formatDuration, freedomDate, money } from '@/lib/payoff';
import type { NegativeItem } from '@/types';
import type { DebtInput } from '@/lib/debts';

const STEPS = ['Accounts With Balances', 'Additional Accounts', 'See Your Impact'] as const;
const ACCOUNT_TYPES = ['Credit Card', 'Auto Loan', 'Student Loan', 'Personal Loan', 'Medical', 'Buy Now Pay Later', 'Other'] as const;

// ─── Stepper ───────────────────────────────────────────────────────────────

function Stepper({ current, onJump }: { current: number; onJump: (i: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 'clamp(16px,2vw,30px)', margin: '0 0 22px', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
      {STEPS.map((label, i) => {
        const active = i === current, done = i < current;
        return (
          <button
            key={label}
            onClick={() => onJump(i)}
            style={{
              display: 'flex', alignItems: 'center', gap: 9, flex: 'none', padding: '0 2px 13px',
              border: 'none', background: 'transparent', cursor: 'pointer',
              borderBottom: `2.5px solid ${active ? 'var(--blue-strong)' : 'transparent'}`, marginBottom: -1,
            }}
          >
            <span style={{
              width: 24, height: 24, borderRadius: '50%', flex: 'none', display: 'grid', placeItems: 'center',
              fontSize: 12.5, fontWeight: 800,
              background: (active || done) ? 'var(--blue-strong)' : '#eef1f6',
              color: (active || done) ? '#fff' : 'var(--ink-3)',
            }}>
              {done ? <Icon name="check" size={13} stroke={3} /> : i + 1}
            </span>
            <span style={{ fontSize: 14, fontWeight: active ? 700 : 600, color: active ? 'var(--ink)' : 'var(--ink-3)', whiteSpace: 'nowrap' }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Stage 1: report-sourced accounts ──────────────────────────────────────

interface ReportAccount {
  key: string;
  creditor: string;
  accountNumber: string;
  type: string;
  balance: number;
}

// Best-effort: a "debt" here is any negativeItem with a real numeric balance
// and account number. This only catches accounts that are ALSO disputable --
// this app doesn't persist the full account inventory (every account on the
// report), only the curated AnalysisResult -- so a clean account with a
// balance but no disputable issue won't show up here. The Additional
// Accounts step exists specifically to cover that gap.
function extractReportAccounts(items: NegativeItem[]): ReportAccount[] {
  const seen = new Map<string, ReportAccount>();
  for (const item of items) {
    if (item.type === 'Personal Information' || item.type === 'Hard Inquiry') continue;
    if (!item.accountNumber || item.accountNumber === 'N/A' || item.accountNumber === '—') continue;
    const balance = parseFloat(item.balance.replace(/[$,]/g, ''));
    if (!balance || balance <= 0) continue;
    const key = `${item.creditor}|${item.accountNumber}`;
    if (!seen.has(key)) seen.set(key, { key, creditor: item.creditor, accountNumber: item.accountNumber, type: item.type, balance });
  }
  return Array.from(seen.values());
}

interface AccountDetails {
  balance: number;
  apr: string;
  min: string;
}

function AccountDetailModal({ account, initial, onClose, onSave }: {
  account: ReportAccount;
  initial: AccountDetails | undefined;
  onClose: () => void;
  onSave: (details: AccountDetails) => void;
}) {
  const [useReport, setUseReport] = useState(initial ? initial.balance === account.balance : true);
  const [curBalance, setCurBalance] = useState(String(initial?.balance ?? account.balance));
  const [apr, setApr] = useState(initial?.apr ?? '');
  const [min, setMin] = useState(initial?.min ?? '');
  const effectiveBalance = useReport ? account.balance : (parseFloat(curBalance) || 0);
  const canSave = apr.trim() !== '' && min.trim() !== '';

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(5,46,22,.38)', backdropFilter: 'blur(3px)', display: 'grid', placeItems: 'center', padding: 24, zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, width: 'min(560px,100%)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--sh-pop)', overflow: 'hidden' }}>
        <div style={{ height: 5, background: 'var(--blue-strong)' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: '1px solid var(--border-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 38, height: 38, borderRadius: '50%', flex: 'none', background: 'var(--blue-tintbg)', color: 'var(--blue-strong)', display: 'grid', placeItems: 'center' }}>
              <Icon name="creditCard" size={18} />
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{account.creditor}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 1 }}>{account.type}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: '#fff', color: 'var(--ink-3)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
            <Icon name="close" size={16} />
          </button>
        </div>

        <div style={{ padding: '20px 22px', overflowY: 'auto' }}>
          <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 18, alignItems: 'start' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.03em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 5 }}>Balance from credit report</div>
                <div className="tnum" style={{ fontSize: 22, fontWeight: 900, color: 'var(--blue-strong)', letterSpacing: '-.02em' }}>{money(account.balance)}</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, cursor: 'pointer', fontSize: 13, color: 'var(--ink-2)', fontWeight: 600 }}>
                  <input type="checkbox" checked={useReport} onChange={(e) => setUseReport(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                  Use this balance
                </label>
              </div>
              <div style={{ alignSelf: 'center', fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>or</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.03em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>Current balance</div>
                <input
                  value={curBalance}
                  onChange={(e) => { setCurBalance(e.target.value); setUseReport(false); }}
                  className="input"
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'flex', gap: 6, marginTop: 7, fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.4 }}>
                  <Icon name="info" size={13} style={{ flex: 'none', marginTop: 1, color: 'var(--muted)' }} />
                  <span>Your report may be 30–60 days old — update this if your balance has changed.</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <label>
              <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>Interest Rate (APR %)</span>
              <input value={apr} onChange={(e) => setApr(e.target.value)} placeholder="e.g. 24.99" className="input" style={{ width: '100%' }} />
            </label>
            <label>
              <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>Minimum Payment ($)</span>
              <input value={min} onChange={(e) => setMin(e.target.value)} placeholder="e.g. 175" className="input" style={{ width: '100%' }} />
            </label>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-2)', padding: '14px 22px', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={!canSave}
            style={{ opacity: canSave ? 1 : 0.5 }}
            onClick={() => onSave({ balance: effectiveBalance, apr, min })}
          >
            <Icon name="check" size={15} /> Save Account Details
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportAccountRow({ account, details, onOpen, isLast }: {
  account: ReportAccount;
  details: AccountDetails | undefined;
  onOpen: () => void;
  isLast: boolean;
}) {
  const last4 = account.accountNumber.replace(/\D/g, '').slice(-4) || account.accountNumber.slice(-4);
  return (
    <div
      onClick={onOpen}
      style={{
        display: 'grid', gridTemplateColumns: '1.7fr 1.1fr .85fr 1.1fr 60px', gap: 12, alignItems: 'center',
        padding: '15px 20px', cursor: 'pointer', borderBottom: isLast ? 'none' : '1px solid var(--border-2)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 36, height: 36, borderRadius: '50%', flex: 'none', background: details ? 'var(--blue-tintbg)' : '#f1f5f9', color: 'var(--blue-strong)', display: 'grid', placeItems: 'center' }}>
          <Icon name="creditCard" size={17} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{account.creditor}</div>
          <div className="tnum" style={{ fontSize: 12, color: 'var(--ink-3)' }}>****{last4}</div>
        </div>
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{account.type}</div>
      <div className="tnum" style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>{money(account.balance)}</div>
      <div>
        {details ? (
          <>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, background: '#dcfce7', color: 'var(--green)', fontSize: 12, fontWeight: 700 }}>
              <Icon name="check" size={12} stroke={3} /> Complete
            </span>
            <div className="tnum" style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 4, fontWeight: 600 }}>{details.apr}% APR · ${details.min}/mo</div>
          </>
        ) : (
          <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 999, background: 'var(--amber-bg)', color: 'var(--amber)', fontSize: 12, fontWeight: 700 }}>
            Missing info
          </span>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', color: details ? 'var(--green)' : 'var(--muted)' }}>
        <Icon name={details ? 'check' : 'chevronRight'} size={17} />
      </div>
    </div>
  );
}

// ─── Stage 2: additional accounts not on the report ────────────────────────

interface AdditionalAccountRow {
  name: string;
  type: string;
  balance: string;
  min: string;
  apr: string;
}

const EMPTY_ROW: AdditionalAccountRow = { name: '', type: 'Credit Card', balance: '', min: '', apr: '' };

function AdditionalAccountsStage({ rows, setRows, onBack, onContinue }: {
  rows: AdditionalAccountRow[];
  setRows: (fn: (rows: AdditionalAccountRow[]) => AdditionalAccountRow[]) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const update = (i: number, key: keyof AdditionalAccountRow, value: string) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  };
  const maybeAppend = () => {
    setRows((prev) => {
      const last = prev[prev.length - 1]!;
      return (last.name || last.balance) ? [...prev, { ...EMPTY_ROW }] : prev;
    });
  };
  const removeRow = (i: number) => {
    setRows((prev) => (prev.length === 1 ? [{ ...EMPTY_ROW }] : prev.filter((_, idx) => idx !== i)));
  };
  const filled = rows.filter((r) => r.name && r.balance);

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', padding: '22px 24px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <span style={{ width: 42, height: 42, borderRadius: 12, flex: 'none', background: 'var(--blue-tintbg)', color: 'var(--blue-strong)', display: 'grid', placeItems: 'center' }}>
            <Icon name="creditCard" size={22} />
          </span>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>Accounts Not on Your Credit Report</div>
            <div style={{ fontSize: 13.5, color: 'var(--ink-3)', marginTop: 3 }}>Type in any other accounts you&rsquo;re paying on. Skip the rows you don&rsquo;t need.</div>
          </div>
        </div>
        <div style={{ flex: 'none', textAlign: 'right', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 16px' }}>
          <div className="tnum" style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>{filled.length} account{filled.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1.15fr .8fr 1fr .65fr 40px', gap: 12, padding: '10px 24px', background: '#f8fafc', borderTop: '1px solid var(--border-2)', borderBottom: '1px solid var(--border-2)' }}>
        {['Account', 'Type', 'Balance', 'Monthly Payment', 'APR %', ''].map((c) => (
          <div key={c} style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>{c}</div>
        ))}
      </div>

      {rows.map((r, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.7fr 1.15fr .8fr 1fr .65fr 40px', gap: 12, alignItems: 'center', padding: '10px 24px', borderBottom: '1px solid var(--border-2)' }}>
          <input value={r.name} onChange={(e) => update(i, 'name', e.target.value)} placeholder="e.g. Discover, Mercy Hospital" className="input" style={{ width: '100%' }} />
          <select value={r.type} onChange={(e) => update(i, 'type', e.target.value)} className="input" style={{ width: '100%', cursor: 'pointer' }}>
            {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input value={r.balance} onChange={(e) => update(i, 'balance', e.target.value)} placeholder="0" className="input" style={{ width: '100%' }} />
          <input value={r.min} onChange={(e) => update(i, 'min', e.target.value)} placeholder="0" className="input" style={{ width: '100%' }} />
          <input value={r.apr} onChange={(e) => update(i, 'apr', e.target.value)} onBlur={maybeAppend} placeholder="0" className="input" style={{ width: '100%' }} />
          <button onClick={() => removeRow(i)} title="Remove" style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
            <Icon name="trash" size={15} />
          </button>
        </div>
      ))}

      <div style={{ padding: '14px 24px' }}>
        <button onClick={() => setRows((prev) => [...prev, { ...EMPTY_ROW }])} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--blue-strong)', fontSize: 13.5, fontWeight: 700 }}>
          <span style={{ width: 22, height: 22, borderRadius: 7, background: 'var(--blue-tintbg)', display: 'grid', placeItems: 'center' }}><Icon name="plus" size={15} /></span>
          Add another account
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', padding: '18px 24px', background: '#fafbfd', borderTop: '1px solid var(--border-2)' }}>
        <button className="btn btn-ghost" onClick={onBack}>Back</button>
        <button className="btn btn-primary" onClick={onContinue}>Continue to Your Impact <Icon name="arrowRight" size={16} /></button>
      </div>
    </div>
  );
}

// ─── Stage 3: the impact (shock + way out) ──────────────────────────────────

interface CombinedDebt {
  name: string;
  balance: number;
  apr: number;
  min: number;
  source: 'report' | 'manual';
  reportAccountRef: string | null;
  interestPerYear: number;
}

function ImpactStage({ reportAccounts, details, additionalRows, onBack, onSaved, saving }: {
  reportAccounts: ReportAccount[];
  details: Record<string, AccountDetails>;
  additionalRows: AdditionalAccountRow[];
  onBack: () => void;
  onSaved: (debts: DebtInput[]) => void;
  saving: boolean;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const debts: CombinedDebt[] = useMemo(() => {
    const fromReport: CombinedDebt[] = reportAccounts.map((a) => {
      const d = details[a.key];
      const balance = d?.balance ?? a.balance;
      const apr = d ? parseFloat(d.apr) || 0 : 22.99;
      const min = d ? parseFloat(d.min) || Math.max(25, Math.round(balance * 0.03)) : Math.max(25, Math.round(balance * 0.03));
      return { name: a.creditor, balance, apr, min, source: 'report', reportAccountRef: a.key, interestPerYear: Math.round(balance * apr / 100) };
    });
    const fromManual: CombinedDebt[] = additionalRows
      .filter((r) => r.name && r.balance)
      .map((r) => {
        const balance = parseFloat(r.balance.replace(/[$,]/g, '')) || 0;
        const apr = parseFloat(r.apr) || 0;
        const min = parseFloat(r.min) || Math.max(25, Math.round(balance * 0.03));
        return { name: r.name, balance, apr, min, source: 'manual', reportAccountRef: null, interestPerYear: Math.round(balance * apr / 100) };
      });
    return [...fromReport, ...fromManual].sort((a, b) => b.interestPerYear - a.interestPerYear);
  }, [reportAccounts, details, additionalRows]);

  const totalBalance = debts.reduce((s, d) => s + d.balance, 0);
  const totalMin = debts.reduce((s, d) => s + d.min, 0);
  const weightedApr = totalBalance ? debts.reduce((s, d) => s + d.balance * d.apr, 0) / totalBalance : 0;
  const monthlyInterest = debts.reduce((s, d) => s + Math.round(d.interestPerYear / 12), 0);
  const yearlyInterest = monthlyInterest * 12;

  // Suggested extra: +50% of current minimums, rounded to the nearest $25 --
  // always proportional to what they already pay, never a forced sprint.
  const extra = Math.max(25, Math.round((totalMin * 0.5) / 25) * 25);
  const minMonths = payoffMonths(totalBalance, weightedApr, totalMin);
  const planMonths = payoffMonths(totalBalance, weightedApr, totalMin + extra);
  const minInterest = isFinite(minMonths) ? Math.max(0, totalMin * minMonths - totalBalance) : totalBalance * 1.8;
  const planInterest = isFinite(planMonths) ? Math.max(0, (totalMin + extra) * planMonths - totalBalance) : 0;
  const interestSaved = Math.max(0, minInterest - planInterest);
  const monthsSaved = Math.max(0, (isFinite(minMonths) ? minMonths : 480) - (isFinite(planMonths) ? planMonths : 0));

  const sumToBalance = debts.reduce((s, d) => s + Math.max(0, d.min - Math.round(d.interestPerYear / 12)), 0);
  const balancePct = totalMin > 0 ? Math.round((sumToBalance / totalMin) * 100) : 0;

  const save = () => {
    const payload: DebtInput[] = debts.map((d) => ({
      name: d.name, balance: d.balance, apr: d.apr, min_payment: d.min,
      source: d.source, report_account_ref: d.reportAccountRef,
    }));
    onSaved(payload);
  };

  if (debts.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 48 }}>
        <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--ink)', marginBottom: 8 }}>No debts to show yet</div>
        <p style={{ color: 'var(--ink-3)', fontSize: 14, maxWidth: 420, margin: '0 auto 18px' }}>
          Go back and add at least one account so we can build your payoff picture.
        </p>
        <button className="btn btn-outline" onClick={onBack}>Back</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* THE SHOCK */}
      <div style={{ background: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)', borderRadius: 18, padding: 'clamp(34px,5vw,56px) clamp(24px,3vw,40px)', color: '#fff', textAlign: 'center', border: '1px solid #15803d' }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.6)', marginBottom: 16 }}>If you stay at this pace, you&rsquo;ll pay</div>
        <div className="tnum" style={{ fontSize: 'clamp(50px,10vw,108px)', fontWeight: 900, letterSpacing: '-.03em', lineHeight: 0.9 }}>{money(yearlyInterest)}</div>
        <div style={{ fontSize: 'clamp(16px,2.2vw,22px)', fontWeight: 800, color: '#fca5a5', marginTop: 14 }}>in interest this year alone</div>
        <div style={{ marginTop: 24, paddingTop: 22, borderTop: '1px solid rgba(255,255,255,.15)', display: 'flex', justifyContent: 'center', gap: 'clamp(20px,6vw,56px)', flexWrap: 'wrap', textAlign: 'center' }}>
          <div style={{ maxWidth: 140 }}>
            <div className="tnum" style={{ fontSize: 'clamp(24px,3.6vw,32px)', fontWeight: 900, lineHeight: 1 }}>{balancePct}%</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', marginTop: 8, lineHeight: 1.4 }}>of payments go to your balance</div>
          </div>
          <div style={{ maxWidth: 140 }}>
            <div className="tnum" style={{ fontSize: 'clamp(24px,3.6vw,32px)', fontWeight: 900, lineHeight: 1, whiteSpace: 'nowrap' }}>{formatDuration(minMonths)}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', marginTop: 8, lineHeight: 1.4 }}>until you&rsquo;re debt-free</div>
          </div>
          <div style={{ maxWidth: 150 }}>
            <div className="tnum" style={{ fontSize: 'clamp(24px,3.6vw,32px)', fontWeight: 900, color: '#fca5a5', lineHeight: 1 }}>{money(minInterest)}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', marginTop: 8, lineHeight: 1.4 }}>total interest at this pace</div>
          </div>
        </div>
      </div>

      {/* THE WAY OUT */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 230, flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--blue-strong)', marginBottom: 9 }}>The good news</div>
          <div style={{ fontSize: 'clamp(17px,2.2vw,21px)', fontWeight: 800, color: 'var(--ink)', lineHeight: 1.35 }}>
            Pay just <span style={{ color: 'var(--blue-strong)' }}>{money(extra)} more a month</span> and be debt-free by <span style={{ color: 'var(--blue-strong)' }}>{freedomDate(planMonths)}</span>.
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 8 }}>Without it, you won&rsquo;t be debt-free until <strong style={{ color: 'var(--ink-2)' }}>{freedomDate(minMonths)}</strong>.</div>
        </div>
        <div style={{ display: 'flex', gap: 'clamp(20px,4vw,44px)' }}>
          <div>
            <div className="tnum" style={{ fontSize: 'clamp(26px,3.6vw,36px)', fontWeight: 900, color: 'var(--green)', lineHeight: 1, whiteSpace: 'nowrap' }}>{money(interestSaved)}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>Kept in your pocket</div>
          </div>
          <div>
            <div className="tnum" style={{ fontSize: 'clamp(26px,3.6vw,36px)', fontWeight: 900, color: 'var(--ink)', lineHeight: 1, whiteSpace: 'nowrap' }}>{formatDuration(monthsSaved)}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>Sooner than minimums</div>
          </div>
        </div>
      </div>

      {/* per-account breakdown */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 22px' }}>
          <span style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--ink)' }}>What each account is costing you</span>
          <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 3, lineHeight: 1.5, maxWidth: 520 }}>A large part of every payment goes to interest instead of paying down what you owe.</div>
        </div>
        {debts.map((d, i) => {
          const open = openIdx === i;
          const monthlyInt = Math.round(d.interestPerYear / 12);
          const toBalance = Math.max(0, d.min - monthlyInt);
          const pct = d.min > 0 ? Math.round((toBalance / d.min) * 100) : 0;
          return (
            <div key={`${d.name}-${i}`} style={{ borderTop: '1px solid var(--border-2)' }}>
              <div onClick={() => setOpenIdx(open ? null : i)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 22px', cursor: 'pointer' }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, flex: 'none', background: 'var(--blue-tintbg)', color: 'var(--blue-strong)', display: 'grid', placeItems: 'center' }}>
                  <Icon name="creditCard" size={15} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{money(d.balance)} · {d.apr.toFixed(2)}% APR</div>
                </div>
                <div style={{ textAlign: 'right', flex: 'none' }}>
                  <div className="tnum" style={{ fontSize: 20, fontWeight: 900, color: 'var(--red)', lineHeight: 1 }}>{money(monthlyInt)}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>a month in interest</div>
                </div>
                <Icon name="chevronDown" size={16} style={{ color: 'var(--muted)', transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }} />
              </div>
              {open && (
                <div style={{ padding: '4px 22px 18px 64px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'clamp(14px,3vw,28px)', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 4 }}>Your payment</div>
                      <div className="tnum" style={{ fontSize: 'clamp(20px,2.6vw,26px)', fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>{money(d.min)}</div>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--muted)', paddingBottom: 3 }}>−</div>
                    <div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 4 }}>Interest added</div>
                      <div className="tnum" style={{ fontSize: 'clamp(20px,2.6vw,26px)', fontWeight: 800, color: 'var(--red)', lineHeight: 1 }}>{money(monthlyInt)}</div>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--muted)', paddingBottom: 3 }}>=</div>
                    <div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 4 }}>Goes to your balance</div>
                      <div className="tnum" style={{ fontSize: 'clamp(20px,2.6vw,26px)', fontWeight: 800, color: 'var(--green)', lineHeight: 1 }}>{money(toBalance)}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 12 }}>Only <strong style={{ color: 'var(--ink-2)' }}>{pct}%</strong> of this month&rsquo;s payment actually reduces what you owe.</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost" onClick={onBack} disabled={saving}>Back</button>
        <button className="btn btn-primary" onClick={save} disabled={saving} style={{ opacity: saving ? 0.7 : 1 }}>
          {saving ? <span className="spin" /> : <Icon name="arrowRight" size={16} />}
          {saving ? 'Saving…' : 'Save My Payoff Plan'}
        </button>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

type Stage = 'accounts' | 'more' | 'impact';

export default function PayoffPlanPage() {
  const router = useRouter();
  const { result } = useAnalysis();
  const { ready } = useEnsureAnalysis();
  const [stage, setStage] = useState<Stage>('accounts');
  const [details, setDetails] = useState<Record<string, AccountDetails>>({});
  const [modalKey, setModalKey] = useState<string | null>(null);
  const [additionalRows, setAdditionalRows] = useState<AdditionalAccountRow[]>([{ ...EMPTY_ROW }]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  if (!ready || !result) return <PageSkeleton />;

  const reportAccounts = extractReportAccounts(result.negativeItems);
  const doneCount = Object.keys(details).length;

  const handleSaveDebts = async (debts: DebtInput[]) => {
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch('/api/debts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ debts }),
      });
      const data = await res.json() as { success: boolean };
      if (!data.success) {
        setSaveError('Something went wrong saving your debts. Please try again.');
        return;
      }
      router.push('/home');
    } catch {
      setSaveError('Something went wrong saving your debts. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 'clamp(22px,3vw,36px) clamp(18px,3vw,38px) 44px', maxWidth: 1180 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'clamp(26px,3.4vw,34px)', fontWeight: 800, letterSpacing: '-.02em', color: 'var(--ink)' }}>Payoff Plan</h1>
          <p style={{ margin: '7px 0 0', color: 'var(--ink-3)', fontSize: 14.5, maxWidth: 560 }}>
            {stage === 'accounts'
              ? "Let's complete the details for the accounts we found with balances."
              : stage === 'more'
                ? "Add any accounts with balances that aren't on your credit report."
                : "Here's your full debt picture — and how fast you can be free of it."}
          </p>
        </div>
      </div>

      <Stepper current={stage === 'accounts' ? 0 : stage === 'more' ? 1 : 2} onJump={(i) => setStage(i === 0 ? 'accounts' : i === 1 ? 'more' : 'impact')} />

      {stage === 'accounts' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', padding: '22px 24px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <span style={{ width: 42, height: 42, borderRadius: 12, flex: 'none', background: 'var(--blue-tintbg)', color: 'var(--blue-strong)', display: 'grid', placeItems: 'center' }}>
                <Icon name="briefcase" size={22} />
              </span>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>Accounts We Identified That Have Balances</div>
                <div style={{ fontSize: 13.5, color: 'var(--ink-3)', marginTop: 3 }}>
                  {reportAccounts.length > 0
                    ? `We found ${reportAccounts.length} account${reportAccounts.length !== 1 ? 's' : ''} with reported balances on your credit report.`
                    : "We didn't find any disputable accounts with balances on your report — add what you're paying off on the next step."}
                </div>
              </div>
            </div>
          </div>

          {reportAccounts.length > 0 && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1.1fr .85fr 1.1fr 60px', gap: 12, padding: '10px 20px', background: '#f8fafc', borderTop: '1px solid var(--border-2)', borderBottom: '1px solid var(--border-2)' }}>
                {['Account', 'Type', 'Balance', 'Status', ''].map((c) => (
                  <div key={c} style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>{c}</div>
                ))}
              </div>
              {reportAccounts.map((a, i) => (
                <ReportAccountRow key={a.key} account={a} details={details[a.key]} onOpen={() => setModalKey(a.key)} isLast={i === reportAccounts.length - 1} />
              ))}
            </>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 16, flexWrap: 'wrap', padding: '18px 24px', background: '#fafbfd', borderTop: '1px solid var(--border-2)' }}>
            {reportAccounts.length > 0 && (
              <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
                {doneCount === reportAccounts.length ? 'Next: add accounts not on your credit report' : `${reportAccounts.length - doneCount} account${reportAccounts.length - doneCount !== 1 ? 's' : ''} still missing details — you can add them later`}
              </span>
            )}
            <button className="btn btn-primary" onClick={() => setStage('more')}>Continue to Additional Accounts <Icon name="arrowRight" size={16} /></button>
          </div>
        </div>
      )}

      {stage === 'more' && (
        <AdditionalAccountsStage
          rows={additionalRows}
          setRows={setAdditionalRows}
          onBack={() => setStage('accounts')}
          onContinue={() => setStage('impact')}
        />
      )}

      {stage === 'impact' && (
        <>
          <ImpactStage
            reportAccounts={reportAccounts}
            details={details}
            additionalRows={additionalRows}
            onBack={() => setStage('more')}
            onSaved={handleSaveDebts}
            saving={saving}
          />
          {saveError && (
            <div style={{ textAlign: 'center', color: 'var(--red)', fontSize: 13, marginTop: 12, fontWeight: 600 }}>{saveError}</div>
          )}
        </>
      )}

      {modalKey && (() => {
        const account = reportAccounts.find((a) => a.key === modalKey);
        if (!account) return null;
        return (
          <AccountDetailModal
            account={account}
            initial={details[modalKey]}
            onClose={() => setModalKey(null)}
            onSave={(d) => { setDetails((prev) => ({ ...prev, [modalKey]: d })); setModalKey(null); }}
          />
        );
      })()}
    </div>
  );
}
