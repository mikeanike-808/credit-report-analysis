'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { BUREAUS } from '@/lib/bureaus';
import { useAnalysis } from '@/context/AnalysisContext';
import { daysUntilNextRound } from '@/lib/roundCycle';
import { ScoreHistoryModal } from '@/components/layout/ScoreHistoryModal';
import { RoundReadyModal } from '@/components/layout/RoundReadyModal';
import type { AnalysisRecord, Bite } from '@/types';

// Passively hydrates AnalysisContext if it's empty (e.g. landing directly on
// /history or /letter-tracking, which don't call useEnsureAnalysis
// themselves) -- but unlike useEnsureAnalysis, never redirects on failure,
// since TopBar also renders on /upload where having no analysis yet is
// completely normal for a first-time user.
function usePassiveAnalysisHydration() {
  const { result, setResult } = useAnalysis();

  useEffect(() => {
    if (result) return;
    fetch('/api/analyses/latest')
      .then((r) => r.json())
      .then((data: { success: boolean; data?: AnalysisRecord | null }) => {
        if (data.success && data.data) {
          setResult(data.data.result, data.data.user_info, data.data.id, data.data.completed_actions);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

function useLastBiteSentAt() {
  const [sentAt, setSentAt] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/bites')
      .then((r) => r.json())
      .then((data: { success: boolean; data?: Bite[] }) => {
        if (data.success && data.data && data.data.length > 0) setSentAt(data.data[0]!.sent_at);
      })
      .catch(() => {});
  }, []);

  return sentAt;
}

function NextMailingCountdown() {
  const lastSentAt = useLastBiteSentAt();
  const [showReady, setShowReady] = useState(false);
  const days = daysUntilNextRound(lastSentAt);

  if (days === null) return null;

  const ready = days === 0;
  const dateStr = (() => {
    const d = lastSentAt ? new Date(lastSentAt) : new Date();
    d.setDate(d.getDate() + 45);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  })();

  return (
    <>
      <button
        title="Next dispute round"
        onClick={() => ready && setShowReady(true)}
        style={{
          height: 38, padding: '0 12px', borderRadius: 999, cursor: ready ? 'pointer' : 'default',
          border: `1px solid ${ready ? '#bbf7d0' : 'var(--border)'}`,
          background: ready ? 'var(--blue-tintbg)' : 'transparent',
          display: 'flex', alignItems: 'center', gap: 9,
        }}
      >
        <Icon name="clock" size={16} style={{ color: 'var(--blue-strong)' }} />
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.1 }}>
          {ready ? (
            <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--blue-strong)' }}>Ready to mail</span>
          ) : (
            <>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-2)' }}>Next dispute</span>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)' }}>{days} days · {dateStr}</span>
            </>
          )}
        </span>
      </button>
      {showReady && <RoundReadyModal onClose={() => setShowReady(false)} />}
    </>
  );
}

function HeaderScores() {
  const { result } = useAnalysis();
  const [showHistory, setShowHistory] = useState<string | null>(null);

  if (!result) return null;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'stretch', padding: '4px 2px', borderRadius: 12, border: '1px solid var(--border)' }}>
        {BUREAUS.map((b, i) => {
          const score = result.scores.find((s) => s.bureau.toLowerCase() === b.key)?.score;
          return (
            <button
              key={b.key}
              onClick={() => setShowHistory(b.key)}
              title={`${b.name} score history`}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, padding: '0 11px',
                background: 'none', border: 'none', cursor: 'pointer',
                borderRight: i < BUREAUS.length - 1 ? '1px solid var(--border-2)' : 'none',
              }}
            >
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.06em', color: b.color }}>{b.abbr}</span>
              <span className="tnum" style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>{score ?? '—'}</span>
            </button>
          );
        })}
      </div>
      {showHistory && <ScoreHistoryModal initialBureauKey={showHistory} onClose={() => setShowHistory(null)} />}
    </>
  );
}

export function TopBar() {
  usePassiveAnalysisHydration();

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10,
      padding: '14px 24px', borderBottom: '1px solid var(--border-2)', flex: 'none',
    }}>
      <NextMailingCountdown />
      <HeaderScores />
      <button
        title="Notifications (coming soon)"
        disabled
        style={{
          width: 38, height: 38, borderRadius: 11, border: '1px solid var(--border)',
          background: 'var(--card)', color: 'var(--ink-3)', display: 'grid', placeItems: 'center',
          cursor: 'default', opacity: 0.6,
        }}
      >
        <Icon name="bell" size={17} />
      </button>
    </header>
  );
}
