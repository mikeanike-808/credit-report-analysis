'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { NegativeItem } from '@/types';

function NegativeRow({ n, open, onToggle, last }: {
  n: NegativeItem;
  open: boolean;
  onToggle: () => void;
  last: boolean;
}) {
  return (
    <div style={{ borderBottom: last ? 'none' : '1px solid var(--border-2)' }}>
      <div className="neg-grid" style={{ alignItems: 'start', padding: '16px 22px', cursor: 'pointer' }} onClick={onToggle}>
        <div><span className={'badge ' + n.priority.toLowerCase()}>{n.priority}</span></div>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 14 }}>{n.creditor}</div>
          <div style={{ color: 'var(--ink-3)', fontSize: 12.5, marginTop: 2 }}>Account #: {n.accountNumber}</div>
        </div>
        <div style={{ color: 'var(--ink-2)', fontSize: 13.5 }}>{n.type}</div>
        <div style={{ color: 'var(--ink-2)', fontSize: 13.5, fontWeight: 600 }} className="tnum">{n.balance}</div>
        <div style={{ color: 'var(--ink-2)', fontSize: 13.5 }}>
          {n.status}<br />
          <span style={{ color: 'var(--ink-3)', fontSize: 12.5 }}>{n.dateReported}</span>
        </div>
        <div style={{ color: 'var(--ink-2)', fontSize: 13 }}>
          {n.reasons.map((r) => (
            <div key={r} style={{ display: 'flex', gap: 6, marginBottom: 3 }}>
              <span style={{ color: 'var(--muted)' }}>•</span><span>{r}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div className={'impact-' + n.impact.toLowerCase()} style={{ fontWeight: 700, fontSize: 13.5 }}>{n.impact}</div>
            <div style={{ color: 'var(--ink-3)', fontSize: 12 }}>Score Impact</div>
            <div style={{ color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 600 }}>{n.impactPoints}</div>
          </div>
          <span style={{ color: 'var(--muted)', transition: '.2s', transform: open ? 'rotate(180deg)' : 'none', marginTop: 2 }}>
            <Icon name="chevronDown" size={18} />
          </span>
        </div>
      </div>

      {open && (
        <div style={{ padding: '0 22px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }} className="neg-expand">
          <div style={{ background: 'var(--card-soft)', border: '1px solid var(--border-2)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.05em', color: 'var(--ink-3)', textTransform: 'uppercase', marginBottom: 9 }}>
              Applicable Laws
            </div>
            {n.laws.map((l) => (
              <div key={l} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--ink-2)', marginBottom: 6 }}>
                <span style={{ color: 'var(--blue)', marginTop: 1 }}><Icon name="scale" size={14} /></span>
                {l}
              </div>
            ))}
          </div>
          <div style={{ background: '#f1f7ff', border: '1px solid #dce8fb', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.05em', color: 'var(--blue-ink)', textTransform: 'uppercase', marginBottom: 9 }}>
              Recommended Action
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55 }}>{n.recommendedAction}</div>
          </div>
        </div>
      )}
    </div>
  );
}

interface NegativeItemsProps {
  items: NegativeItem[];
}

export function NegativeItems({ items }: NegativeItemsProps) {
  const [openRow, setOpenRow] = useState<number | null>(null);
  const [sectionOpen, setSectionOpen] = useState(true);

  return (
    <section className="card" style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
      {/* Section header — click to collapse/expand the whole list */}
      <button
        onClick={() => setSectionOpen((v) => !v)}
        style={{
          width: '100%', textAlign: 'left', background: 'none', border: 'none',
          borderBottom: sectionOpen ? '1px solid var(--border-2)' : 'none',
          padding: '20px 22px 14px', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 className="section-title" style={{ margin: 0 }}>Errors</h2>
            <span style={{ background: 'var(--red-bg)', color: 'var(--red)', borderRadius: 999, padding: '2px 10px', fontSize: 12.5, fontWeight: 700 }}>
              {items.length}
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>
            These errors are negatively impacting your credit scores.
          </p>
        </div>
        <svg
          width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="var(--ink-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ flex: 'none', transition: 'transform .2s', transform: sectionOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {sectionOpen && (
        <>
          <div className="neg-grid" style={{ padding: '10px 22px', background: '#f8fafd', borderBottom: '1px solid var(--border-2)' }}>
            {['Priority', 'Account Details', 'Type', 'Balance', 'Status / Reported', 'Reason Flagged', 'Impact'].map((col) => (
              <div key={col} style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.05em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>
                {col}
              </div>
            ))}
          </div>

          {items.map((n, i) => (
            <NegativeRow
              key={n.accountNumber + i}
              n={n}
              open={openRow === i}
              onToggle={() => setOpenRow(openRow === i ? null : i)}
              last={i === items.length - 1}
            />
          ))}
        </>
      )}
    </section>
  );
}
