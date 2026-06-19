'use client';

import { useEffect, useState } from 'react';

// Stage thresholds are calibrated against scripts/run-pipeline.ts timing runs:
// Call 1 (extraction) typically finishes ~20-25s in, Call 2 (analysis) adds
// another ~20-30s on top of that. These are estimates, not guarantees -- the
// AI's output size varies report to report, so actual completion can land
// earlier or later than the labels suggest.
const STAGES = [
  { at: 0, label: 'Uploading and reading your report…' },
  { at: 4, label: 'Combing through every account and bureau entry…' },
  { at: 20, label: 'Finding errors and FCRA violations…' },
  { at: 35, label: 'Building your personalized action plan…' },
  { at: 55, label: 'Finalizing your results — almost there…' },
] as const;

const EXPECTED_TOTAL_SECONDS = 55;

export function AnalyzingProgress() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const stage = [...STAGES].reverse().find((s) => elapsed >= s.at) ?? STAGES[0];
  const pct = Math.min(96, Math.round((elapsed / EXPECTED_TOTAL_SECONDS) * 100));

  return (
    <div style={{
      marginTop: 16, padding: '18px 20px', borderRadius: 14,
      background: 'var(--blue-tintbg)', border: '1px solid #bbf7d0',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span className="spin" style={{ borderColor: 'rgba(22,163,74,.25)', borderTopColor: 'var(--blue-strong)' }} />
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--blue-ink)' }}>{stage.label}</span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: '#dcfce7', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 999, background: 'var(--blue-strong)',
          width: `${pct}%`, transition: 'width 1s linear',
        }} />
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-3)' }}>
        Usually takes about 45–60 seconds · {elapsed}s elapsed
      </div>
    </div>
  );
}
