'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, SignInButton } from '@clerk/nextjs';
import { Icon } from '@/components/ui/Icon';
import { BureauMark } from '@/components/ui/BureauMark';
import { BUREAUS } from '@/lib/bureaus';
import { buildCreditorLetter } from '@/lib/letters';
import { useAnalysis } from '@/context/AnalysisContext';
import type { NegativeItem } from '@/types';

interface CreditorGroup {
  creditor: string;
  items: NegativeItem[];
  bureaus: string[];
}

function groupByCreditor(items: NegativeItem[]): CreditorGroup[] {
  const map = new Map<string, NegativeItem[]>();
  for (const item of items) {
    const existing = map.get(item.creditor) ?? [];
    existing.push(item);
    map.set(item.creditor, existing);
  }
  return Array.from(map.entries()).map(([creditor, groupItems]) => ({
    creditor,
    items: groupItems,
    bureaus: Array.from(new Set(groupItems.flatMap((i) => i.bureaus))).filter((b) =>
      BUREAUS.some((kb) => kb.key === b)
    ),
  }));
}

interface LetterModalProps {
  bureauKey: string;
  creditor: string;
  accountNumber: string;
  disputeCategory: string;
  body: string;
  onClose: () => void;
}

function LetterModal({ bureauKey, creditor, accountNumber, disputeCategory, body, onClose }: LetterModalProps) {
  const [copied, setCopied] = useState(false);
  const [markSentPhase, setMarkSentPhase] = useState<'idle' | 'picking' | 'loading' | 'done'>('idle');
  const [markSentExpected, setMarkSentExpected] = useState('');
  const [sentDate, setSentDate] = useState(new Date().toISOString().slice(0, 10));
  const { isSignedIn } = useUser();
  const router = useRouter();
  const bureau = BUREAUS.find((b) => b.key === bureauKey);
  if (!bureau) return null;

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
    setMarkSentPhase('loading');
    try {
      const res = await fetch('/api/disputes/mark-sent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bureauKey,
          creditor,
          accountNumber,
          disputeCategory,
          sentAt: new Date(sentDate).toISOString(),
        }),
      });
      const data = await res.json() as { success: boolean; data?: { expectedResponseBy: string } };
      if (data.success && data.data) {
        setMarkSentExpected(data.data.expectedResponseBy);
        setMarkSentPhase('done');
      } else {
        setMarkSentPhase('idle');
      }
    } catch {
      setMarkSentPhase('idle');
    }
  };

  const autoMailEnabled = process.env.NEXT_PUBLIC_AUTO_MAIL_ENABLED === 'true';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,27,51,.45)',
        backdropFilter: 'blur(3px)', display: 'grid', placeItems: 'center',
        padding: 24, zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16, width: 'min(720px,100%)',
          maxHeight: '88vh', display: 'flex', flexDirection: 'column',
          boxShadow: 'var(--sh-pop)', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px', borderBottom: '1px solid var(--border-2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BureauMark bureau={bureau} size={36} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15.5, color: 'var(--ink)' }}>
                {bureau.name} — {creditor}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
                Targeted dispute letter · ready to send
              </div>
            </div>
          </div>
          <button
            className="btn btn-ghost"
            style={{ padding: 9, borderRadius: 9 }}
            onClick={onClose}
            aria-label="Close"
          >
            <Icon name="close" size={17} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '22px 26px', overflow: 'auto', background: '#fbfcfe' }}>
          <pre style={{
            margin: 0, whiteSpace: 'pre-wrap',
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 13.5, lineHeight: 1.7, color: '#1e293b',
          }}>
            {body}
          </pre>
        </div>

        {/* Footer actions */}
        <div style={{
          borderTop: '1px solid var(--border-2)', padding: '14px 22px',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          {/* Standard actions */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={copy}>
              <Icon name={copied ? 'check' : 'copy'} size={16} />
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button className="btn btn-outline" onClick={download}>
              <Icon name="download" size={16} /> Download
            </button>
            <button className="btn btn-outline" onClick={print}>
              <Icon name="print" size={16} /> Print
            </button>
          </div>

          {/* Tracking section */}
          {markSentPhase === 'done' ? (
            <div style={{
              background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10,
              padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--blue)', fontSize: 18 }}>✓</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--blue-ink)' }}>Letter tracked!</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
                    Response expected by{' '}
                    {new Date(markSentExpected).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              </div>
              <button
                className="btn btn-outline"
                style={{ fontSize: 13 }}
                onClick={() => router.push('/tracking')}
              >
                View Tracker →
              </button>
            </div>
          ) : (
            <div style={{ borderTop: '1px solid var(--border-2)', paddingTop: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                Track this dispute
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                {/* Auto-send via Lob — shown only when feature flag is on */}
                {autoMailEnabled && isSignedIn && (
                  <button className="btn btn-primary" style={{ fontSize: 13.5 }}>
                    <Icon name="mail" size={15} /> Send via Certified Mail
                  </button>
                )}

                {/* Manual mark-as-sent */}
                {!isSignedIn ? (
                  <SignInButton mode="modal">
                    <button className="btn btn-outline" style={{ fontSize: 13.5 }}>
                      <Icon name="check" size={15} /> Mark as Sent (sign in to track)
                    </button>
                  </SignInButton>
                ) : markSentPhase === 'picking' || markSentPhase === 'loading' ? (
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
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: 13 }}
                      onClick={submitMarkSent}
                      disabled={markSentPhase === 'loading'}
                    >
                      {markSentPhase === 'loading' ? <><span className="spin" /> Saving…</> : 'Confirm'}
                    </button>
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: 13 }}
                      onClick={() => setMarkSentPhase('idle')}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn btn-outline"
                    style={{ fontSize: 13.5 }}
                    onClick={() => setMarkSentPhase('picking')}
                  >
                    <Icon name="check" size={15} /> Mark as Sent
                  </button>
                )}
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--ink-3)' }}>
                Track the 30-day FCRA response deadline on your{' '}
                <button
                  onClick={() => router.push('/tracking')}
                  style={{ background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', padding: 0, fontSize: 12, fontWeight: 600 }}
                >
                  Dispute Tracker
                </button>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DisputeLetters() {
  const { result, userInfo } = useAnalysis();
  const [open, setOpen] = useState<{
    bureauKey: string;
    creditor: string;
    accountNumber: string;
    disputeCategory: string;
    body: string;
  } | null>(null);
  const [selectedBureau, setSelectedBureau] = useState<Record<string, string>>({});

  const groups = useMemo(
    () => (result ? groupByCreditor(result.negativeItems) : []),
    [result]
  );

  if (!result || !userInfo || groups.length === 0) return null;

  const openLetter = (group: CreditorGroup, bureauKey: string) => {
    const bureau = BUREAUS.find((b) => b.key === bureauKey);
    if (!bureau) return;
    const itemsForBureau = group.items.filter((i) => i.bureaus.includes(bureauKey));
    const body = buildCreditorLetter(bureau, group.creditor, itemsForBureau, userInfo, result.completedAt);
    const firstItem = itemsForBureau[0];
    setOpen({
      bureauKey,
      creditor: group.creditor,
      accountNumber: firstItem?.accountNumber ?? '',
      disputeCategory: firstItem?.disputeCategory ?? '',
      body,
    });
  };

  const handleBureauSelect = (creditor: string, bureauKey: string) => {
    setSelectedBureau((prev) => ({ ...prev, [creditor]: bureauKey }));
    const group = groups.find((g) => g.creditor === creditor);
    if (group) openLetter(group, bureauKey);
  };

  return (
    <>
      <section className="card" style={{ padding: 'clamp(18px,2.4vw,26px)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 22 }}>
          <span style={{ color: 'var(--blue)', flex: 'none', marginTop: 1 }}>
            <Icon name="fileText" size={22} />
          </span>
          <div>
            <h2 className="section-title">Dispute Letters</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--ink-3)' }}>
              Select a company and bureau to generate a targeted dispute letter pre-filled with that error&rsquo;s details.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {groups.map((group) => {
            const accountLabel = group.items.length === 1 ? '1 account' : `${group.items.length} accounts`;
            const bureausForGroup = group.bureaus;

            return (
              <div
                key={group.creditor}
                style={{
                  border: '1px solid var(--border)', borderRadius: 12,
                  padding: '14px 18px', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: 'var(--blue-tintbg)', border: '1px solid #bbf7d0',
                    display: 'grid', placeItems: 'center', flex: 'none',
                  }}>
                    <Icon name="file" size={18} stroke={2} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {group.creditor}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>
                      {accountLabel}
                      {group.items[0] && (
                        <span style={{ marginLeft: 8, color: 'var(--ink-3)' }}>
                          · {group.items[0].type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {BUREAUS.filter((b) => bureausForGroup.includes(b.key)).map((b) => (
                      <span
                        key={b.key}
                        style={{
                          fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                          background: b.color + '18',
                          color: b.color,
                          border: `1px solid ${b.color + '44'}`,
                        }}
                      >
                        {b.abbr}
                      </span>
                    ))}
                  </div>

                  {bureausForGroup.length > 0 ? (
                    <select
                      value={selectedBureau[group.creditor] ?? ''}
                      onChange={(e) => {
                        if (e.target.value) handleBureauSelect(group.creditor, e.target.value);
                      }}
                      style={{
                        fontSize: 13, padding: '7px 28px 7px 12px', borderRadius: 8,
                        border: '1px solid var(--border)', background: 'var(--surface)',
                        color: 'var(--ink)', cursor: 'pointer', appearance: 'none',
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 10px center',
                      }}
                    >
                      <option value="">Select bureau…</option>
                      {bureausForGroup.map((bk) => {
                        const bureau = BUREAUS.find((b) => b.key === bk);
                        return bureau ? (
                          <option key={bk} value={bk}>{bureau.name}</option>
                        ) : null;
                      })}
                    </select>
                  ) : (
                    <span style={{ fontSize: 12.5, color: 'var(--ink-4)', fontStyle: 'italic' }}>
                      No bureau data
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {open && (
        <LetterModal
          bureauKey={open.bureauKey}
          creditor={open.creditor}
          accountNumber={open.accountNumber}
          disputeCategory={open.disputeCategory}
          body={open.body}
          onClose={() => {
            setOpen(null);
            setSelectedBureau((prev) => ({ ...prev, [open.creditor]: '' }));
          }}
        />
      )}
    </>
  );
}
