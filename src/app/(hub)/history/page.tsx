'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { BUREAUS } from '@/lib/bureaus';
import { buildCreditorLetter } from '@/lib/letters';
import { useAnalysis } from '@/context/AnalysisContext';
import type { AnalysisRecord, Bureau, NegativeItem } from '@/types';

function bureauByKey(key: string): Bureau {
  return BUREAUS.find((b) => b.key === key.toLowerCase()) ?? BUREAUS[0]!;
}

// ─── Read-only letter viewer -- no "Mark as Sent" here, that lives on Dispute Letters ───

interface LetterViewModalProps {
  bureau: Bureau;
  creditor: string;
  disputeCategory: string;
  body: string;
  onClose: () => void;
}

function LetterViewModal({ bureau, creditor, disputeCategory, body, onClose }: LetterViewModalProps) {
  const [copied, setCopied] = useState(false);

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
        <div style={{ height: 5, background: bureau.color }} />
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 22px', borderBottom: '1px solid var(--border-2)',
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>
              {bureau.name} — {creditor}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 1 }}>
              {disputeCategory} · generated letter (read-only)
            </div>
          </div>
          <button className="btn btn-ghost" style={{ padding: 8, borderRadius: 8 }} onClick={onClose} aria-label="Close">
            <Icon name="close" size={17} />
          </button>
        </div>

        <div style={{ padding: '22px 26px', overflowY: 'auto', background: '#fafcf9', flex: 1 }}>
          <pre style={{
            margin: 0, whiteSpace: 'pre-wrap',
            fontFamily: "'Plus Jakarta Sans', Georgia, serif",
            fontSize: 13.5, lineHeight: 1.75, color: '#1e293b',
          }}>
            {body}
          </pre>
        </div>

        <div style={{ borderTop: '1px solid var(--border-2)', padding: '14px 22px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
      </div>
    </div>
  );
}

// ─── One generated letter row inside an analysis card ──────────────────────────

interface LetterRowProps {
  item: NegativeItem;
  onView: () => void;
  isLast: boolean;
}

function LetterRow({ item, onView, isLast }: LetterRowProps) {
  const bureau = bureauByKey(item.primaryBureau || item.bureaus[0] || 'experian');
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
      padding: '12px 4px', borderBottom: isLast ? 'none' : '1px solid var(--border-2)',
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)' }}>{item.creditor}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
            background: 'var(--blue-tintbg)', color: 'var(--blue-ink)',
          }}>
            {item.disputeCategory}
          </span>
          <span>{item.bureaus.map((b) => bureauByKey(b).abbr).join(', ')}</span>
        </div>
      </div>
      <button
        onClick={onView}
        title="View generated letter"
        style={{
          width: 32, height: 32, borderRadius: 8, flex: 'none',
          display: 'grid', placeItems: 'center',
          background: 'var(--blue-tintbg)', border: `1px solid ${bureau.color}33`,
          color: bureau.color, cursor: 'pointer',
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
    </div>
  );
}

// ─── One AI call's card -- all letters generated by that analysis ─────────────

interface AnalysisCardProps {
  analysis: AnalysisRecord;
  index: number;
  total: number;
  onView: (item: NegativeItem) => void;
  onDelete: (id: string) => void;
}

function AnalysisCard({ analysis, index, total, onView, onDelete }: AnalysisCardProps) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const items = analysis.result.negativeItems;
  // Oldest analysis = call #1, regardless of display order (newest-first)
  const callNumber = total - index;

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/analyses/${analysis.id}`, { method: 'DELETE' });
      const data = await res.json() as { success: boolean };
      if (data.success) onDelete(analysis.id);
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 14, background: '#fff', overflow: 'hidden' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 8px 6px 20px',
      }}>
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            flex: 1, textAlign: 'left', border: 'none', background: 'transparent',
            padding: '12px 0', cursor: 'pointer', display: 'flex', alignItems: 'center',
            gap: 14, minWidth: 0,
          }}
        >
          <svg
            width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="var(--ink-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ flex: 'none', transition: 'transform .2s', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15.5, color: 'var(--ink)' }}>
              Analysis #{callNumber} — {items.length} Letter{items.length !== 1 ? 's' : ''} Generated
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>
              {new Date(analysis.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              {' · '}
              {new Date(analysis.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </div>
          </div>
        </button>

        {confirming ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 'none' }}>
            <span style={{ fontSize: 12.5, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>Delete this analysis?</span>
            <button
              className="btn btn-outline"
              style={{ fontSize: 12, padding: '5px 10px', color: 'var(--red)', borderColor: 'var(--red)' }}
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? <span className="spin" /> : 'Delete'}
            </button>
            <button
              className="btn btn-ghost"
              style={{ fontSize: 12, padding: '5px 10px' }}
              onClick={() => setConfirming(false)}
              disabled={deleting}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            className="btn btn-ghost"
            title="Delete this analysis"
            style={{ flex: 'none', padding: 8, borderRadius: 8, color: 'var(--ink-3)' }}
            onClick={() => setConfirming(true)}
          >
            <Icon name="trash" size={15} />
          </button>
        )}
      </div>

      {open && (
        <div style={{ padding: '0 20px 18px' }}>
          {items.length === 0 ? (
            <div style={{ padding: '16px 4px', color: 'var(--ink-4)', fontSize: 13 }}>
              No negative items were found in this analysis.
            </div>
          ) : (
            items.map((item, idx) => (
              <LetterRow
                key={`${item.creditor}-${item.accountNumber}-${idx}`}
                item={item}
                onView={() => onView(item)}
                isLast={idx === items.length - 1}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── One past report card -- click opens that analysis on Home ───────────────

interface ReportCardProps {
  analysis: AnalysisRecord;
  callNumber: number;
  onOpen: () => void;
}

function ReportCard({ analysis, callNumber, onOpen }: ReportCardProps) {
  const { overall, negativeItems } = analysis.result;
  return (
    <button
      onClick={onOpen}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        width: '100%', textAlign: 'left', cursor: 'pointer',
        border: '1px solid var(--border)', borderRadius: 14, background: '#fff',
        padding: '14px 16px', transition: 'border-color .14s, box-shadow .14s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--blue-strong)';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(0,0,0,.06)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 14.5, color: 'var(--ink)' }}>
          Report #{callNumber}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 3 }}>
          {new Date(analysis.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          {' · '}
          {new Date(analysis.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
          {negativeItems.length} negative item{negativeItems.length !== 1 ? 's' : ''}
        </div>
      </div>
      <div style={{
        flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        width: 46, height: 46, borderRadius: '50%', background: 'var(--blue-tintbg)',
        border: '1px solid #bbf7d0', justifyContent: 'center',
      }}>
        <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--blue-strong)', lineHeight: 1 }}>{overall.health}</span>
      </div>
    </button>
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const { setResult } = useAnalysis();
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ bureau: Bureau; item: NegativeItem; body: string } | null>(null);

  useEffect(() => {
    fetch('/api/analyses')
      .then((r) => r.json())
      .then((data: { success: boolean; data?: AnalysisRecord[] }) => {
        if (data.success && data.data) setAnalyses(data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalLetters = useMemo(
    () => analyses.reduce((sum, a) => sum + a.result.negativeItems.length, 0),
    [analyses],
  );

  const openLetter = (analysis: AnalysisRecord, item: NegativeItem) => {
    const bureau = bureauByKey(item.primaryBureau || item.bureaus[0] || 'experian');
    const itemsForBureau = analysis.result.negativeItems.filter(
      (n) => n.creditor === item.creditor &&
        n.bureaus.map((b) => b.toLowerCase()).includes(bureau.key)
    );
    const body = buildCreditorLetter(
      bureau, item.creditor, itemsForBureau.length > 0 ? itemsForBureau : [item],
      analysis.user_info, analysis.result.completedAt,
    );
    setModal({ bureau, item, body });
  };

  const handleDelete = (id: string) => {
    setAnalyses((prev) => prev.filter((a) => a.id !== id));
  };

  // Loads a past analysis into AnalysisContext as the active one and takes
  // the user to Home to view it -- same context the live analyze flow uses,
  // so Home renders it exactly as it did right after that original AI call.
  const openReport = (analysis: AnalysisRecord) => {
    setResult(analysis.result, analysis.user_info);
    router.push('/home');
  };

  return (
    <div style={{ padding: 'clamp(22px,3vw,36px) clamp(18px,3vw,38px) 44px' }}>
      <div style={{ marginBottom: 30 }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(26px,3.4vw,34px)', fontWeight: 800, letterSpacing: '-.02em', color: 'var(--ink)' }}>
          History
        </h1>
        <p style={{ margin: '7px 0 0', color: 'var(--ink-3)', fontSize: 14.5 }}>
          Every dispute letter ever generated, grouped by the AI analysis call that created it
          {totalLetters > 0 && ` — ${totalLetters} letter${totalLetters !== 1 ? 's' : ''} across ${analyses.length} analys${analyses.length !== 1 ? 'es' : 'is'}`}.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 60 }}>
          <span className="spin" style={{ display: 'inline-block', marginBottom: 12 }} />
          <div>Loading history…</div>
        </div>
      ) : analyses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#fff', border: '1px solid var(--border)', borderRadius: 16 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🗂️</div>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--ink)', marginBottom: 8 }}>No analyses yet</div>
          <p style={{ color: 'var(--ink-3)', fontSize: 14, maxWidth: 380, margin: '0 auto' }}>
            Every time you run a new analysis, the letters it generates will show up here as their own batch.
          </p>
        </div>
      ) : (
        <div className="ap-grid" style={{ display: 'grid', gap: 18, alignItems: 'start' }}>
          <div>
            <div style={{ marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>Dispute Letters</h2>
              <p style={{ margin: '4px 0 0', color: 'var(--ink-3)', fontSize: 13 }}>
                Every letter generated, grouped by the analysis that created it.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {analyses.map((analysis, idx) => (
                <AnalysisCard
                  key={analysis.id}
                  analysis={analysis}
                  index={idx}
                  total={analyses.length}
                  onView={(item) => openLetter(analysis, item)}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>

          <div>
            <div style={{ marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>Past Reports</h2>
              <p style={{ margin: '4px 0 0', color: 'var(--ink-3)', fontSize: 13 }}>
                Click a report to view its full analysis on Home.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {analyses.map((analysis, idx) => (
                <ReportCard
                  key={analysis.id}
                  analysis={analysis}
                  callNumber={analyses.length - idx}
                  onOpen={() => openReport(analysis)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 28, color: 'var(--muted)', fontSize: 12.8 }}>
        <Icon name="lock" size={14} /> Every generated letter is saved here, whether or not you've sent it.
      </div>

      {modal && (
        <LetterViewModal
          bureau={modal.bureau}
          creditor={modal.item.creditor}
          disputeCategory={modal.item.disputeCategory}
          body={modal.body}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
