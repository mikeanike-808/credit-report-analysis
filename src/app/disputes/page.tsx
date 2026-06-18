'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, SignInButton } from '@clerk/nextjs';
import { Brand } from '@/components/ui/Brand';
import { Icon } from '@/components/ui/Icon';
import { BureauMark } from '@/components/ui/BureauMark';
import { BUREAUS } from '@/lib/bureaus';
import { buildCreditorLetter } from '@/lib/letters';
import { useAnalysis } from '@/context/AnalysisContext';
import type { NegativeItem, Bureau } from '@/types';

// ─── Strength badge ───────────────────────────────────────────────────────────

const STRENGTH_COLOR: Record<string, string> = {
  Strong:   '#15803d',
  Moderate: '#b45309',
  Weak:     '#64748b',
};
const STRENGTH_BG: Record<string, string> = {
  Strong:   '#dcfce7',
  Moderate: '#fdf0d5',
  Weak:     '#f1f5f9',
};

function StrengthBadge({ strength }: { strength: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
      background: STRENGTH_BG[strength] ?? '#f1f5f9',
      color: STRENGTH_COLOR[strength] ?? '#64748b',
      whiteSpace: 'nowrap',
    }}>
      {strength}
    </span>
  );
}

// ─── Letter modal ─────────────────────────────────────────────────────────────

type MarkPhase = 'idle' | 'picking' | 'loading' | 'done';

interface LetterModalProps {
  bureau: Bureau;
  creditor: string;
  accountNumber: string;
  disputeCategory: string;
  body: string;
  onClose: () => void;
}

function LetterModal({ bureau, creditor, accountNumber, disputeCategory, body, onClose }: LetterModalProps) {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const [copied, setCopied] = useState(false);
  const [phase, setPhase] = useState<MarkPhase>('idle');
  const [sentDate, setSentDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedBy, setExpectedBy] = useState('');

  const copy = () => {
    navigator.clipboard?.writeText(body).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const download = () => {
    const blob = new Blob([body], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Dispute Letter — ${creditor} — ${bureau.name}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const print = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(
      `<pre style="font:14px/1.6 Georgia,serif;white-space:pre-wrap;padding:48px;max-width:720px;margin:auto">${body.replace(/</g, '&lt;')}</pre>`
    );
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  };

  const submitMarkSent = async () => {
    setPhase('loading');
    try {
      const res = await fetch('/api/disputes/mark-sent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bureauKey: bureau.key, creditor, accountNumber, disputeCategory, sentAt: new Date(sentDate).toISOString() }),
      });
      const data = await res.json() as { success: boolean; data?: { expectedResponseBy: string } };
      if (data.success && data.data) {
        setExpectedBy(data.data.expectedResponseBy);
        setPhase('done');
      } else {
        setPhase('idle');
      }
    } catch {
      setPhase('idle');
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(5,46,22,.38)',
        backdropFilter: 'blur(3px)', display: 'grid', placeItems: 'center',
        padding: 24, zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 18, width: 'min(740px,100%)',
          maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px -12px rgba(0,0,0,.22)', overflow: 'hidden',
        }}
      >
        {/* Bureau colour stripe */}
        <div style={{ height: 5, background: bureau.color }} />

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 22px', borderBottom: '1px solid var(--border-2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BureauMark bureau={bureau} size={36} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>
                {bureau.name} — {creditor}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 1 }}>
                {disputeCategory} · targeted dispute letter
              </div>
            </div>
          </div>
          <button className="btn btn-ghost" style={{ padding: 8, borderRadius: 8 }} onClick={onClose} aria-label="Close">
            <Icon name="close" size={17} />
          </button>
        </div>

        {/* Letter body */}
        <div style={{ padding: '22px 26px', overflowY: 'auto', background: '#fafcf9', flex: 1 }}>
          <pre style={{
            margin: 0, whiteSpace: 'pre-wrap',
            fontFamily: "'Plus Jakarta Sans', Georgia, serif",
            fontSize: 13.5, lineHeight: 1.75, color: '#1e293b',
          }}>
            {body}
          </pre>
        </div>

        {/* Actions */}
        <div style={{ borderTop: '1px solid var(--border-2)', padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={copy}>
              <Icon name={copied ? 'check' : 'copy'} size={15} />
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button className="btn btn-outline" onClick={download}>
              <Icon name="download" size={15} /> Download
            </button>
            <button className="btn btn-outline" onClick={print}>
              <Icon name="print" size={15} /> Print
            </button>
          </div>

          {phase === 'done' ? (
            <div style={{
              background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10,
              padding: '11px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#16a34a', fontSize: 18, lineHeight: 1 }}>✓</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#166534' }}>Letter tracked!</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                    Response expected by {new Date(expectedBy).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              </div>
              <button className="btn btn-outline" style={{ fontSize: 12.5 }} onClick={() => router.push('/tracking')}>
                View Tracker →
              </button>
            </div>
          ) : (
            <div style={{ borderTop: '1px solid var(--border-2)', paddingTop: 11 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
                Track this dispute
              </div>
              {!isSignedIn ? (
                <SignInButton mode="modal">
                  <button className="btn btn-outline" style={{ fontSize: 13 }}>
                    <Icon name="check" size={14} /> Mark as Sent (sign in to track)
                  </button>
                </SignInButton>
              ) : phase === 'picking' || phase === 'loading' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <label style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 600 }}>
                    Date sent:
                    <input
                      type="date"
                      value={sentDate}
                      onChange={(e) => setSentDate(e.target.value)}
                      max={new Date().toISOString().slice(0, 10)}
                      style={{
                        marginLeft: 8, padding: '6px 10px', borderRadius: 8,
                        border: '1px solid var(--border)', fontSize: 13,
                        color: 'var(--ink)', background: 'var(--surface)',
                      }}
                    />
                  </label>
                  <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={submitMarkSent} disabled={phase === 'loading'}>
                    {phase === 'loading' ? <><span className="spin" /> Saving…</> : 'Confirm'}
                  </button>
                  <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => setPhase('idle')}>Cancel</button>
                </div>
              ) : (
                <button className="btn btn-outline" style={{ fontSize: 13 }} onClick={() => setPhase('picking')}>
                  <Icon name="check" size={14} /> Mark as Sent
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Item row ─────────────────────────────────────────────────────────────────

interface ItemRowProps {
  item: NegativeItem;
  bureau: Bureau;
  onView: (item: NegativeItem) => void;
  isLast: boolean;
}

function ItemRow({ item, bureau, onView, isLast }: ItemRowProps) {
  const priorityColor = item.priority === 'High' ? '#dc2626' : item.priority === 'Medium' ? '#b45309' : '#16a34a';
  return (
    <div style={{
      padding: '13px 18px',
      borderBottom: isLast ? 'none' : '1px solid var(--border-2)',
    }}>
      {/* Row 1: priority dot + full-width creditor name + eye button */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%', flex: 'none', marginTop: 5,
          background: priorityColor,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)', wordBreak: 'break-word', lineHeight: 1.35 }}>
            {item.creditor}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3, lineHeight: 1.4 }}>
            {item.type}
            {item.accountNumber && item.accountNumber !== 'N/A' && <span> · #{item.accountNumber}</span>}
            {item.balance && item.balance !== 'N/A' && item.balance !== '$0' && item.balance !== '0' && <span> · {item.balance}</span>}
          </div>
        </div>
        <button
          onClick={() => onView(item)}
          title="View dispute letter"
          style={{
            width: 32, height: 32, borderRadius: 8, flex: 'none',
            display: 'grid', placeItems: 'center',
            background: 'var(--blue-tintbg)', border: `1px solid ${bureau.color}33`,
            color: bureau.color, cursor: 'pointer',
            transition: 'background .14s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = bureau.color + '22')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--blue-tintbg)')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
      </div>

      {/* Row 2: category + strength badges */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, paddingLeft: 18 }}>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
          background: 'var(--blue-tintbg)', color: 'var(--blue-ink)',
          whiteSpace: 'nowrap',
        }}>
          {item.disputeCategory}
        </span>
        <StrengthBadge strength={item.disputeStrength} />
      </div>
    </div>
  );
}

// ─── Bureau column ────────────────────────────────────────────────────────────

interface BureauColumnProps {
  bureau: Bureau;
  items: NegativeItem[];
  onView: (item: NegativeItem, bureau: Bureau) => void;
}

function BureauColumn({ bureau, items, onView }: BureauColumnProps) {
  const [open, setOpen] = useState(true);
  const highCount = items.filter((i) => i.priority === 'High').length;
  const strongCount = items.filter((i) => i.disputeStrength === 'Strong').length;

  return (
    <div style={{
      flex: 1, minWidth: 280,
      border: '1px solid var(--border)', borderRadius: 14,
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      {/* Bureau header — click anywhere to toggle */}
      <div style={{ borderTop: `4px solid ${bureau.color}` }}>
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            width: '100%', textAlign: 'left', background: bureau.color + '0d',
            border: 'none', borderBottom: open ? '1px solid var(--border-2)' : 'none',
            padding: '16px 18px 14px', cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <BureauMark bureau={bureau} size={34} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>{bureau.name}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 1 }}>
                {items.length} dispute{items.length !== 1 ? 's' : ''}
              </div>
            </div>
            {/* Chevron */}
            <svg
              width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="var(--ink-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ flex: 'none', transition: 'transform .2s', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          {/* Mini stats */}
          <div style={{ display: 'flex', gap: 8 }}>
            {highCount > 0 && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                background: '#fde8e8', color: '#dc2626',
              }}>
                {highCount} High Priority
              </span>
            )}
            {strongCount > 0 && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                background: '#dcfce7', color: '#15803d',
              }}>
                {strongCount} Strong
              </span>
            )}
            {items.length === 0 && (
              <span style={{ fontSize: 11.5, color: 'var(--ink-4)', fontStyle: 'italic' }}>
                No items reported
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Items list — hidden when collapsed */}
      {open && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {items.length === 0 ? (
            <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>
              No negative items reported to {bureau.name}
            </div>
          ) : (
            items.map((item, idx) => (
              <ItemRow
                key={`${item.creditor}-${item.accountNumber}-${idx}`}
                item={item}
                bureau={bureau}
                onView={(i) => onView(i, bureau)}
                isLast={idx === items.length - 1}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DisputesPage() {
  const router = useRouter();
  const { result, userInfo } = useAnalysis();
  const [modal, setModal] = useState<{
    bureau: Bureau;
    item: NegativeItem;
    body: string;
  } | null>(null);

  useEffect(() => {
    if (!result) router.replace('/analyze');
  }, [result, router]);

  // Group by primaryBureau — each item appears in exactly ONE column, no duplicates.
  // Normalize to lowercase because the AI may return "Experian" instead of "experian".
  const byBureau = useMemo(() => {
    if (!result) return {} as Record<string, NegativeItem[]>;
    const map: Record<string, NegativeItem[]> = { experian: [], equifax: [], transunion: [] };
    for (const item of result.negativeItems) {
      const pb = (item.primaryBureau ?? '').toLowerCase();
      const fb = (item.bureaus[0] ?? '').toLowerCase();
      const key = pb in map ? pb : (fb in map ? fb : 'experian');
      map[key].push(item);
    }
    return map;
  }, [result]);

  const totalDisputes = result?.negativeItems.length ?? 0;
  const totalBureausAffected = BUREAUS.filter((b) => (byBureau[b.key]?.length ?? 0) > 0).length;

  const openLetter = (item: NegativeItem, bureau: Bureau) => {
    if (!result || !userInfo) return;
    const filtered = result.negativeItems.filter(
      (n) => n.creditor === item.creditor &&
        n.bureaus.map((b) => b.toLowerCase()).includes(bureau.key)
    );
    // Fall back to the triggering item alone if the bureau filter returns nothing
    // (can happen when primaryBureau and bureaus[] are misaligned in AI output)
    const itemsForBureau = filtered.length > 0 ? filtered : [item];
    const body = buildCreditorLetter(bureau, item.creditor, itemsForBureau, userInfo, result.completedAt);
    setModal({ bureau, item, body });
  };

  if (!result || !userInfo) return null;

  return (
    <div className="page-pad">
      <div className="shell">
        {/* Top bar */}
        <header className="topbar">
          <Brand />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn btn-ghost" style={{ fontSize: 14 }} onClick={() => router.push('/tracking')}>
              <Icon name="check" size={15} /> Dispute Tracker
            </button>
            <button className="btn btn-ghost" style={{ fontSize: 14 }} onClick={() => router.push('/results')}>
              <Icon name="refresh" size={15} /> Back to Results
            </button>
          </div>
        </header>

        <div style={{ padding: 'clamp(22px,3vw,36px) clamp(18px,3vw,38px) 48px' }}>

          {/* Page heading */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 'clamp(26px,3.2vw,34px)', fontWeight: 800, letterSpacing: '-.02em', color: 'var(--ink)' }}>
                  Dispute Letters
                </h1>
                <p style={{ margin: '7px 0 0', color: 'var(--ink-3)', fontSize: 14.5 }}>
                  {totalDisputes} negative item{totalDisputes !== 1 ? 's' : ''} across {totalBureausAffected} bureau{totalBureausAffected !== 1 ? 's' : ''} — click the eye icon to view and send each letter.
                </p>
              </div>

              {/* FCRA callout */}
              <div style={{
                background: 'var(--blue-tintbg)', border: '1px solid #bbf7d0',
                borderRadius: 12, padding: '12px 16px', maxWidth: 300,
                display: 'flex', alignItems: 'flex-start', gap: 10,
              }}>
                <span style={{ fontSize: 18, lineHeight: 1, flex: 'none', marginTop: 1 }}>⚖️</span>
                <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.55 }}>
                  <strong style={{ color: 'var(--blue-ink)' }}>FCRA §1681i:</strong> Bureaus have <strong>30 days</strong> to investigate and respond to your dispute letters after receipt.
                </div>
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 18, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>Priority:</span>
              {[['#dc2626', 'High'], ['#b45309', 'Medium'], ['#16a34a', 'Low']].map(([color, label]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{label}</span>
                </div>
              ))}
              <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginLeft: 8 }}>Strength:</span>
              {['Strong', 'Moderate', 'Weak'].map((s) => (
                <span key={s} style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                  background: STRENGTH_BG[s], color: STRENGTH_COLOR[s],
                }}>{s}</span>
              ))}
            </div>
          </div>

          {/* Three-bureau columns */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {BUREAUS.map((bureau) => (
              <BureauColumn
                key={bureau.key}
                bureau={bureau}
                items={byBureau[bureau.key] ?? []}
                onView={openLetter}
              />
            ))}
          </div>

          {/* Footer note */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            marginTop: 32, color: 'var(--muted)', fontSize: 12.5,
          }}>
            <Icon name="lock" size={13} />
            Each letter is addressed to the specific bureau that reported the item. Your data is never stored.
          </div>
        </div>
      </div>

      {modal && (
        <LetterModal
          bureau={modal.bureau}
          creditor={modal.item.creditor}
          accountNumber={modal.item.accountNumber}
          disputeCategory={modal.item.disputeCategory}
          body={modal.body}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
