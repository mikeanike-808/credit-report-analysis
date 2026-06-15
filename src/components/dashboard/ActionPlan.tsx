import { Icon } from '@/components/ui/Icon';
import type { AnalysisResult } from '@/types';

const IMPACT_COLOR: Record<string, string> = {
  High:     '#dc2626',
  Medium:   '#b45309',
  Low:      '#16a34a',
  Positive: '#16a34a',
};

const IMPACT_BG: Record<string, string> = {
  High:     '#fde8e8',
  Medium:   '#fdf0d5',
  Low:      '#dcfce7',
  Positive: '#f0fdf4',
};

function ActionBadge({ impact }: { impact: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '4px 11px', borderRadius: 999,
      background: IMPACT_BG[impact], color: IMPACT_COLOR[impact],
      fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      Impact: {impact}
    </span>
  );
}

interface ActionPlanProps {
  items: AnalysisResult['actionPlan'];
}

export function ActionPlan({ items }: ActionPlanProps) {
  return (
    <section className="card" style={{ padding: 'clamp(18px,2.4vw,26px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <span style={{ color: 'var(--ink-3)' }}><Icon name="fileText" size={20} /></span>
        <h2 className="section-title">Action Plan</h2>
      </div>
      <p style={{ margin: '0 0 18px', fontSize: 13, color: 'var(--ink-3)' }}>
        Follow this prioritized plan to improve your credit.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 14px', background: 'var(--card-soft)', borderRadius: 12, border: '1px solid var(--border-2)' }}>
            <span style={{
              width: 28, height: 28, borderRadius: '50%', flex: 'none',
              display: 'grid', placeItems: 'center', fontSize: 13.5, fontWeight: 800,
              color: '#fff', background: IMPACT_COLOR[a.impact],
            }}>
              {i + 1}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{a.title}</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 3 }}>{a.description}</div>
            </div>
            <ActionBadge impact={a.impact} />
          </div>
        ))}
      </div>
    </section>
  );
}
