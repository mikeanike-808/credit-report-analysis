'use client';

import { useState, useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { BureauMark } from '@/components/ui/BureauMark';
import { BUREAUS } from '@/lib/bureaus';
import { buildCreditorLetter } from '@/lib/letters';
import { useAnalysis } from '@/context/AnalysisContext';
import type { NegativeItem } from '@/types';

// Groups negative items by creditor name, collecting the union of bureaus across all accounts.
interface CreditorGroup {
  creditor: string;
  items: NegativeItem[];
  bureaus: string[]; // union of all bureaus across this creditor's items
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
  body: string;
  onClose: () => void;
}

function LetterModal({ bureauKey, creditor, body, onClose }: LetterModalProps) {
  const [copied, setCopied] = useState(false);
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

        <div style={{ padding: '22px 26px', overflow: 'auto', background: '#fbfcfe' }}>
          <pre style={{
            margin: 0, whiteSpace: 'pre-wrap',
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 13.5, lineHeight: 1.7, color: '#1e293b',
          }}>
            {body}
          </pre>
        </div>

        <div style={{
          display: 'flex', gap: 10, padding: '16px 22px',
          borderTop: '1px solid var(--border-2)', flexWrap: 'wrap',
        }}>
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
      </div>
    </div>
  );
}

export function DisputeLetters() {
  const { result, userInfo } = useAnalysis();
  const [open, setOpen] = useState<{ bureauKey: string; creditor: string; body: string } | null>(null);
  const [selectedBureau, setSelectedBureau] = useState<Record<string, string>>({});

  const groups = useMemo(
    () => (result ? groupByCreditor(result.negativeItems) : []),
    [result]
  );

  if (!result || !userInfo || groups.length === 0) return null;

  const openLetter = (group: CreditorGroup, bureauKey: string) => {
    const bureau = BUREAUS.find((b) => b.key === bureauKey);
    if (!bureau) return;
    // Only include items from this creditor that are reported on the selected bureau
    const itemsForBureau = group.items.filter((i) => i.bureaus.includes(bureauKey));
    const body = buildCreditorLetter(bureau, group.creditor, itemsForBureau, userInfo, result.completedAt);
    setOpen({ bureauKey, creditor: group.creditor, body });
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
                {/* Left: creditor info */}
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

                {/* Right: bureau pills + dropdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {/* Bureau indicator pills — only show bureaus that actually reported this error */}
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

                  {/* Bureau selector dropdown */}
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
