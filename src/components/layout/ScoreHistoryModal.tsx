'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { BUREAUS } from '@/lib/bureaus';
import type { AnalysisRecord } from '@/types';

interface ScorePoint {
  date: string;
  score: number;
}

interface ScoreHistoryModalProps {
  onClose: () => void;
  initialBureauKey?: string;
}

// Builds one chart point per past analysis -- this is real data (no separate
// scoreHistory table needed), just every analyses row's created_at + scores.
function buildHistory(analyses: AnalysisRecord[], bureauName: string): ScorePoint[] {
  return analyses
    .map((a) => {
      const score = a.result.scores.find((s) => s.bureau.toLowerCase() === bureauName.toLowerCase());
      return score?.score != null
        ? { date: new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), score: score.score }
        : null;
    })
    .filter((p): p is ScorePoint => p !== null)
    .reverse(); // analyses arrive newest-first; chart reads oldest-first
}

export function ScoreHistoryModal({ onClose, initialBureauKey }: ScoreHistoryModalProps) {
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [tab, setTab] = useState(initialBureauKey ?? 'experian');

  useEffect(() => {
    fetch('/api/analyses')
      .then((r) => r.json())
      .then((data: { success: boolean; data?: AnalysisRecord[] }) => {
        if (data.success && data.data) setAnalyses(data.data);
      })
      .catch(() => {});
  }, []);

  const bureau = BUREAUS.find((b) => b.key === tab) ?? BUREAUS[0]!;
  const series = buildHistory(analyses, bureau.name);
  const current = series.length ? series[series.length - 1]!.score : 0;
  const first = series.length ? series[0]!.score : 0;
  const delta = current - first;

  const W = 472, H = 210, padL = 38, padR = 14, padT = 14, padB = 28;
  const yMin = 300, yMax = 850;
  const x = (i: number) => series.length <= 1 ? padL + (W - padL - padR) / 2 : padL + (i / (series.length - 1)) * (W - padL - padR);
  const y = (s: number) => padT + (1 - (s - yMin) / (yMax - yMin)) * (H - padT - padB);
  const gridVals = [300, 480, 660, 850];
  const linePath = series.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.score).toFixed(1)}`).join(' ');
  const areaPath = series.length > 1
    ? `${linePath} L ${x(series.length - 1).toFixed(1)} ${(H - padB).toFixed(1)} L ${x(0).toFixed(1)} ${(H - padB).toFixed(1)} Z`
    : '';

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,.45)' }} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ position: 'relative', zIndex: 2, background: 'var(--bg)', width: 'min(560px,100%)', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-12px 0 40px rgba(15,23,42,.25)', overflow: 'hidden' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--border-2)', background: 'var(--card)' }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>Credit Score History</span>
          <button onClick={onClose} aria-label="Close" style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid var(--border)', background: '#fff', color: 'var(--ink-3)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
            <Icon name="close" size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', background: 'var(--card)', borderBottom: '1px solid var(--border-2)' }}>
          {BUREAUS.map((b) => {
            const active = tab === b.key;
            return (
              <button
                key={b.key}
                onClick={() => setTab(b.key)}
                style={{
                  flex: 1, display: 'grid', placeItems: 'center', background: 'none', border: 'none', cursor: 'pointer',
                  padding: '13px 0 11px', borderBottom: `2.5px solid ${active ? b.color : 'transparent'}`,
                  opacity: active ? 1 : 0.5, fontWeight: 800, fontSize: 13.5, color: b.color,
                }}
              >
                {b.name}
              </button>
            );
          })}
        </div>

        <div style={{ overflowY: 'auto', padding: '22px 24px 36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-3)' }}>{bureau.name} score</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontSize: 40, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-.02em' }}>{current || '—'}</span>
              {delta !== 0 && series.length > 1 && (
                <span style={{ fontSize: 13, fontWeight: 800, color: delta > 0 ? 'var(--green)' : 'var(--red)' }}>{delta > 0 ? '+' : ''}{delta}</span>
              )}
            </div>
          </div>

          <div style={{ marginTop: 18, background: 'var(--card)', border: '1px solid var(--border-2)', borderRadius: 16, padding: '16px 14px 10px' }}>
            {series.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13.5 }}>No score history yet.</div>
            ) : (
              <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
                <defs>
                  <linearGradient id={`scoreFill-${tab}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={bureau.color} stopOpacity="0.16" />
                    <stop offset="100%" stopColor={bureau.color} stopOpacity="0" />
                  </linearGradient>
                </defs>
                {gridVals.map((g) => (
                  <g key={g}>
                    <line x1={padL} y1={y(g)} x2={W - padR} y2={y(g)} stroke="var(--border-2)" strokeWidth={1} />
                    <text x={padL - 8} y={y(g) + 3.5} textAnchor="end" fontSize={10} fontWeight={700} fill="var(--muted)">{g}</text>
                  </g>
                ))}
                {areaPath && <path d={areaPath} fill={`url(#scoreFill-${tab})`} />}
                <path d={linePath} fill="none" stroke={bureau.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                {series.map((p, i) => (
                  <g key={i}>
                    <circle cx={x(i)} cy={y(p.score)} r={i === series.length - 1 ? 5 : 3.5} fill="#fff" stroke={bureau.color} strokeWidth={2.5} />
                    <text x={x(i)} y={H - 9} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--ink-3)">{p.date}</text>
                  </g>
                ))}
              </svg>
            )}
          </div>

          <div style={{ marginTop: 26 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>Reports</div>
            {[...series].reverse().map((p, i) => {
              const prev = series[series.length - 2 - i];
              const d = prev ? p.score - prev.score : null;
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '15px 0', borderBottom: i === series.length - 1 ? 'none' : '1px solid var(--border-2)' }}>
                  <span style={{ fontSize: 14, color: 'var(--ink-2)', fontWeight: 600 }}>{p.date}</span>
                  <span style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    {d != null && d !== 0 && <span style={{ fontSize: 12, fontWeight: 800, color: d > 0 ? 'var(--green)' : 'var(--red)' }}>{d > 0 ? '+' : ''}{d}</span>}
                    <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>{p.score}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
