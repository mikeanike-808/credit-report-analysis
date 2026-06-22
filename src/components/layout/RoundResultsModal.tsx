'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { useAnalysis } from '@/context/AnalysisContext';
import { diffNegativeItems, type NegativeItemDiff } from '@/lib/roundCycle';
import type { AnalysisRecord } from '@/types';

const SEEN_KEY_PREFIX = 'dg_seen_round_results_';

/**
 * Compares the active analysis against the one immediately before it and
 * surfaces a one-time celebration/summary if anything changed (items
 * deleted or newly appeared). "Seen" state lives in localStorage keyed by
 * analysisId -- this app has no notifications table yet (that's Phase 7),
 * so a per-analysis dismissal flag is the simplest correct mechanism for
 * "show this once."
 */
export function useRoundResults(): { diff: NegativeItemDiff | null; dismiss: () => void } {
  const { result, analysisId } = useAnalysis();
  const [diff, setDiff] = useState<NegativeItemDiff | null>(null);

  useEffect(() => {
    if (!result || !analysisId) return;
    const seenKey = SEEN_KEY_PREFIX + analysisId;
    if (typeof window !== 'undefined' && window.localStorage.getItem(seenKey)) return;

    fetch('/api/analyses')
      .then((r) => r.json())
      .then((data: { success: boolean; data?: AnalysisRecord[] }) => {
        if (!data.success || !data.data) return;
        const idx = data.data.findIndex((a) => a.id === analysisId);
        const previous = idx !== -1 ? data.data[idx + 1] : undefined;
        if (!previous) return;

        const computed = diffNegativeItems(previous.result.negativeItems, result.negativeItems);
        if (computed.deleted.length > 0 || computed.newItems.length > 0) {
          setDiff(computed);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId, result]);

  const dismiss = () => {
    if (analysisId && typeof window !== 'undefined') {
      window.localStorage.setItem(SEEN_KEY_PREFIX + analysisId, '1');
    }
    setDiff(null);
  };

  return { diff, dismiss };
}

interface RoundResultsModalProps {
  diff: NegativeItemDiff;
  onClose: () => void;
}

export function RoundResultsModal({ diff, onClose }: RoundResultsModalProps) {
  const router = useRouter();
  const hasDeleted = diff.deleted.length > 0;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5vh 16px' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, width: 'min(440px,100%)', boxShadow: '0 24px 60px rgba(15,23,42,.3)', overflow: 'hidden', textAlign: 'center', padding: '30px 26px 24px' }}>
        <div style={{
          width: 72, height: 72, margin: '0 auto', borderRadius: '50%',
          background: hasDeleted ? 'linear-gradient(150deg,#22c55e,#15803d)' : 'var(--blue-tintbg)',
          display: 'grid', placeItems: 'center', color: hasDeleted ? '#fff' : 'var(--blue-strong)',
        }}>
          <Icon name={hasDeleted ? 'trophy' : 'refresh'} size={32} stroke={2.2} />
        </div>
        <div style={{ marginTop: 14, fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--blue-strong)' }}>
          {hasDeleted ? 'Progress! 🎉' : "Here's what changed"}
        </div>
        <h2 style={{ margin: '6px 0 0', fontSize: 21, fontWeight: 800, color: 'var(--ink)' }}>
          {hasDeleted ? 'Your report is improving' : 'New report compared'}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16, textAlign: 'left' }}>
          {[
            { n: diff.deleted.length, label: 'Deleted from your report', icon: 'checkCircle', color: 'var(--green)' },
            { n: diff.stillReporting.length, label: 'Still reporting', icon: 'clock', color: 'var(--amber)' },
            { n: diff.newItems.length, label: 'New negative items', icon: 'alert', color: 'var(--red)' },
          ].filter((r) => r.n > 0).map((r) => (
            <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', borderRadius: 11, border: '1px solid var(--border-2)' }}>
              <span style={{ flex: 'none', width: 32, height: 32, borderRadius: 9, background: 'var(--card-soft)', color: r.color, display: 'grid', placeItems: 'center' }}>
                <Icon name={r.icon} size={17} />
              </span>
              <span style={{ flex: 1, fontWeight: 700, fontSize: 13.5, color: 'var(--ink)', textAlign: 'left' }}>{r.label}</span>
              <span className="tnum" style={{ fontWeight: 900, fontSize: 21, color: r.color }}>{r.n}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 9, marginTop: 18 }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ height: 44, padding: '0 16px' }}>Close</button>
          <button onClick={() => router.push('/dispute-letters')} className="btn btn-primary" style={{ flex: 1, height: 44 }}>
            View Dispute Letters <Icon name="arrowRight" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
