'use client';

import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';

const STEPS = [
  { label: 'Your Budget', href: '/payoff/budget' },
  { label: 'Your Payoff Plan', href: '/payoff/calculator' },
  { label: 'Stay on Track', href: '/payoff/tracker' },
  { label: 'Set It Up', href: '/payoff/setup' },
  { label: 'Make It Official', href: '/payoff/pledge' },
] as const;

export function PayoffStepper({ current }: { current: number }) {
  const router = useRouter();

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 'clamp(16px,2vw,30px)', margin: '0 0 22px', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
      {STEPS.map((step, i) => {
        const active = i === current;
        const done = i < current;
        const clickable = !!step.href;
        return (
          <button
            key={step.label}
            onClick={() => clickable && router.push(step.href!)}
            disabled={!clickable}
            title={clickable ? undefined : 'Coming soon'}
            style={{
              display: 'flex', alignItems: 'center', gap: 9, flex: 'none', padding: '0 2px 13px',
              border: 'none', background: 'transparent', cursor: clickable ? 'pointer' : 'default',
              opacity: clickable ? 1 : 0.5,
              borderBottom: `2.5px solid ${active ? 'var(--blue-strong)' : 'transparent'}`, marginBottom: -1,
            }}
          >
            <span style={{
              width: 24, height: 24, borderRadius: '50%', flex: 'none', display: 'grid', placeItems: 'center',
              fontSize: 12.5, fontWeight: 800,
              background: (active || done) ? 'var(--blue-strong)' : '#eef1f6',
              color: (active || done) ? '#fff' : 'var(--ink-3)',
            }}>
              {done ? <Icon name="check" size={13} stroke={3} /> : i + 1}
            </span>
            <span style={{ fontSize: 14, fontWeight: active ? 700 : 600, color: active ? 'var(--ink)' : 'var(--ink-3)', whiteSpace: 'nowrap' }}>{step.label}</span>
          </button>
        );
      })}
    </div>
  );
}
