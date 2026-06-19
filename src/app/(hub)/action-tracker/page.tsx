'use client';

import { Icon } from '@/components/ui/Icon';
import { useAnalysis } from '@/context/AnalysisContext';
import { useEnsureAnalysis } from '@/lib/useEnsureAnalysis';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import type { ActionItem } from '@/types';

const IMPACT_COLOR: Record<string, string> = {
  High: '#dc2626',
  Medium: '#b45309',
  Low: '#16a34a',
  Positive: '#16a34a',
};

const IMPACT_BG: Record<string, string> = {
  High: '#fde8e8',
  Medium: '#fdf0d5',
  Low: '#dcfce7',
  Positive: '#f0fdf4',
};

interface ActionRowProps {
  action: ActionItem;
  index: number;
  done: boolean;
  onToggle: () => void;
}

function ActionRow({ action, index, done, onToggle }: ActionRowProps) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 18px',
        background: done ? 'var(--card-soft)' : '#fff', borderRadius: 14,
        border: `1px solid ${done ? 'var(--border-2)' : 'var(--border)'}`,
        cursor: 'pointer', transition: 'background .14s, border-color .14s',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          flex: 'none', width: 26, height: 26, borderRadius: 8, marginTop: 1,
          border: `2px solid ${done ? '#16a34a' : 'var(--border)'}`,
          background: done ? '#16a34a' : '#fff',
          display: 'grid', placeItems: 'center', color: '#fff',
          transition: 'background .14s, border-color .14s',
        }}
      >
        {done && <Icon name="check" size={15} stroke={3} />}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 700, fontSize: 14.5, color: 'var(--ink)',
          textDecoration: done ? 'line-through' : 'none',
          opacity: done ? 0.6 : 1,
        }}>
          {index + 1}. {action.title}
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4, opacity: done ? 0.6 : 1 }}>
          {action.description}
        </div>
      </div>
      <span style={{
        display: 'inline-block', padding: '4px 11px', borderRadius: 999, flex: 'none',
        background: IMPACT_BG[action.impact], color: IMPACT_COLOR[action.impact],
        fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
      }}>
        Impact: {action.impact}
      </span>
    </div>
  );
}

export default function ActionTrackerPage() {
  const { result, analysisId, completedActions, setCompletedActions } = useAnalysis();
  const { ready } = useEnsureAnalysis();

  if (!ready || !result) return <PageSkeleton />;

  const items = result.actionPlan;
  const doneSet = new Set(completedActions);
  const doneCount = doneSet.size;
  const pct = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;

  const toggle = (index: number) => {
    const next = doneSet.has(index)
      ? completedActions.filter((i) => i !== index)
      : [...completedActions, index];
    setCompletedActions(next);

    if (!analysisId) return;
    fetch(`/api/analyses/${analysisId}/actions`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completedActions: next }),
    }).catch(() => {});
  };

  return (
    <div style={{ padding: 'clamp(22px,3vw,36px) clamp(18px,3vw,38px) 44px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 26 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'clamp(26px,3.4vw,34px)', fontWeight: 800, letterSpacing: '-.02em', color: 'var(--ink)' }}>
            Action Plan Tracker
          </h1>
          <p style={{ margin: '7px 0 0', color: 'var(--ink-3)', fontSize: 14.5 }}>
            The exact action plan from your latest analysis. Check off each step as you complete it.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '8px 14px' }}>
          <span style={{ color: 'var(--green)', display: 'grid', placeItems: 'center' }}>
            <Icon name="checkCircle" size={17} />
          </span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--green)' }}>
              {doneCount} of {items.length} done
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{pct}% complete</div>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#fff', border: '1px solid var(--border)', borderRadius: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--ink)', marginBottom: 8 }}>No action items</div>
          <p style={{ color: 'var(--ink-3)', fontSize: 14 }}>Your latest analysis didn&rsquo;t produce an action plan.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((action, i) => (
            <ActionRow key={i} action={action} index={i} done={doneSet.has(i)} onToggle={() => toggle(i)} />
          ))}
        </div>
      )}
    </div>
  );
}
