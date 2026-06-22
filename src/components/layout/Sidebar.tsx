'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { UserButton } from '@clerk/nextjs';
import { BrandLogo } from '@/components/ui/Brand';
import { Icon } from '@/components/ui/Icon';
import { ConfettiBurst } from '@/components/ui/Celebration';

// Sub-nav for the Credit Plan goal -- the only goal with real pages today.
// Payoff Plan and Grow & Rebuild gain their own pages in later phases.
const CREDIT_PLAN_NAV = [
  { href: '/home', label: 'Home', icon: 'home' },
  { href: '/dispute-letters', label: 'Dispute Letters', icon: 'fileText' },
  { href: '/action-tracker', label: 'Action Tracker', icon: 'checkSquare' },
  { href: '/letter-tracking', label: 'Letter Tracking', icon: 'clock' },
  { href: '/history', label: 'History', icon: 'layers' },
] as const;

const NEW_ANALYSIS_ITEM = { href: '/upload', label: 'New Analysis', icon: 'uploadCloud' } as const;

const JOURNEY_GOALS = [
  { label: 'Credit Plan', icon: 'gauge', href: '/home' },
  { label: 'Payoff Plan', icon: 'dollarSign', href: '/payoff' },
  { label: 'Grow & Rebuild', icon: 'trending', href: '/grow' },
] as const;

interface JourneyApiResponse {
  success: boolean;
  data?: { current_goal_index: number };
}

// Fetches/mutates current_goal_index from /api/journey. A goal can only be
// marked done if it's the current goal (advance) or un-marked if it's the
// most recently completed one (retreat) -- this mirrors the server route's
// own +1/-1 clamping, so the UI and the API agree on what's a legal move.
function useJourney() {
  const [currentGoalIndex, setCurrentGoalIndex] = useState(0);

  useEffect(() => {
    fetch('/api/journey')
      .then((r) => r.json())
      .then((data: JourneyApiResponse) => {
        if (data.success && data.data) setCurrentGoalIndex(data.data.current_goal_index);
      })
      .catch(() => {});
  }, []);

  const toggle = async (action: 'advance' | 'retreat') => {
    const res = await fetch('/api/journey', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const data = await res.json() as JourneyApiResponse;
    if (data.success && data.data) setCurrentGoalIndex(data.data.current_goal_index);
  };

  return { currentGoalIndex, toggle };
}

interface JourneyStepRowProps {
  label: string;
  icon: string;
  href?: string;
  active: boolean;
  done: boolean;
  locked: boolean;
  isCurrent: boolean;
  last: boolean;
  celebrating: boolean;
  index: number;
  onToggle: () => void;
}

function JourneyStepRow({ label, icon, href, active, done, locked, isCurrent, last, celebrating, index, onToggle }: JourneyStepRowProps) {
  const labelBlock = (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 800,
        letterSpacing: '.06em', textTransform: 'uppercase', color: done ? 'var(--blue-strong)' : 'var(--muted)',
      }}>
        {done ? <><Icon name="trophy" size={11} /> Reached</> : (isCurrent ? 'Current goal' : `Goal ${index + 1}`)}
      </div>
      <div style={{
        fontSize: 14.5, fontWeight: (isCurrent || done) ? 700 : 600,
        color: active ? 'var(--blue-strong)' : done ? 'var(--blue-strong)' : (locked ? 'var(--muted)' : 'var(--ink)'),
      }}>
        {label}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 8px', opacity: locked ? 0.55 : 1 }}>
      <span style={{ position: 'relative', flex: 'none', display: 'grid', placeItems: 'center' }}>
        {!last && (
          <span style={{
            position: 'absolute', left: '50%', top: 26, transform: 'translateX(-50%)',
            width: 2, height: 18, background: done ? 'var(--blue-strong)' : 'var(--border-2)',
          }} />
        )}
        {celebrating && (
          <span style={{
            position: 'absolute', inset: -5, borderRadius: '50%',
            border: '2px solid #4ade80', animation: 'dg-ring .8s ease-out forwards',
          }} />
        )}
        {celebrating && <ConfettiBurst />}
        <button
          onClick={onToggle}
          disabled={locked && !isCurrent}
          title={done ? 'Goal reached — click to undo' : (locked ? 'Complete the goal above first' : 'Mark this goal reached')}
          style={{
            position: 'relative', zIndex: 2, width: 30, height: 30, flex: 'none', borderRadius: '50%',
            display: 'grid', placeItems: 'center', padding: 0,
            cursor: (locked && !isCurrent) ? 'not-allowed' : 'pointer',
            background: done ? 'linear-gradient(150deg,#22c55e,#16a34a)' : '#eef1f6',
            color: done ? '#fff' : (locked ? 'var(--muted)' : 'var(--ink-3)'),
            border: isCurrent ? '2px dashed var(--border)' : '2px solid transparent',
            boxShadow: done ? '0 3px 9px rgba(22,163,74,.40)' : 'none',
            animation: celebrating ? 'dg-pop .55s ease-out' : 'none',
            transition: 'background .2s, color .2s',
          }}
        >
          {done ? <Icon name="check" size={16} stroke={3} /> : (locked ? <Icon name="lock" size={13} /> : <Icon name={icon} size={15} />)}
        </button>
      </span>
      {!locked && href ? (
        <Link href={href} style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}>{labelBlock}</Link>
      ) : labelBlock}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { currentGoalIndex, toggle } = useJourney();
  const [celebrating, setCelebrating] = useState<number | null>(null);

  const handleToggle = (index: number) => {
    if (index === currentGoalIndex) {
      toggle('advance');
      setCelebrating(index);
      setTimeout(() => setCelebrating(null), 1100);
    } else if (index === currentGoalIndex - 1) {
      toggle('retreat');
    }
  };

  const total = JOURNEY_GOALS.length;
  const doneCount = currentGoalIndex;
  const pct = Math.round((doneCount / total) * 100);
  const allDone = doneCount === total;
  const cheer = allDone ? 'Every goal reached!' : doneCount === 0 ? 'Start with your Credit Plan below.' : `${total - doneCount} to go — keep it up!`;

  return (
    <aside
      style={{
        width: 264,
        flex: 'none',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-shell)',
        boxShadow: 'var(--sh-shell)',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '22px 20px', borderBottom: '1px solid var(--border-2)' }}>
        <Link href="/home" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <BrandLogo size={32} />
          <span style={{ fontFamily: "'Arial Black', 'Impact', sans-serif", fontWeight: 900, fontSize: 15.5, letterSpacing: '-.01em', lineHeight: 1 }}>
            <span style={{ color: 'var(--ink)' }}>DISPUTE</span>
            <span style={{ color: '#53A02C' }}>GATOR</span>
          </span>
        </Link>
      </div>

      <nav style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {(() => {
          const active = pathname === NEW_ANALYSIS_ITEM.href || pathname.startsWith(NEW_ANALYSIS_ITEM.href + '/');
          return (
            <Link
              href={NEW_ANALYSIS_ITEM.href}
              style={{
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '10px 12px', borderRadius: 10, marginBottom: 10,
                fontSize: 14, fontWeight: 700, textDecoration: 'none',
                color: active ? '#fff' : 'var(--blue-strong)',
                background: active ? 'var(--blue-strong)' : 'var(--blue-tintbg)',
                border: '1px solid ' + (active ? 'var(--blue-strong)' : '#bbf7d0'),
                transition: 'background .14s, color .14s',
              }}
            >
              <Icon name={NEW_ANALYSIS_ITEM.icon} size={17} />
              {NEW_ANALYSIS_ITEM.label}
            </Link>
          );
        })()}

        {/* Journey progress card */}
        <div style={{
          margin: '2px 0 12px', padding: '13px 14px', borderRadius: 14,
          background: allDone ? 'linear-gradient(150deg,#16a34a,#15803d)' : 'var(--blue-tintbg)',
          border: allDone ? 'none' : '1px solid #bbf7d0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{
              width: 30, height: 30, flex: 'none', borderRadius: '50%', display: 'grid', placeItems: 'center',
              background: allDone ? 'rgba(255,255,255,.2)' : 'var(--blue-strong)', color: '#fff',
            }}>
              <Icon name={allDone ? 'trophy' : 'star'} size={16} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.04em', textTransform: 'uppercase', color: allDone ? '#fff' : 'var(--blue-strong)' }}>
                Your Journey
              </div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: allDone ? 'rgba(255,255,255,.9)' : 'var(--ink-3)' }}>
                {doneCount} of {total} goals
              </div>
            </div>
          </div>
          <div style={{ marginTop: 10, height: 7, borderRadius: 999, background: allDone ? 'rgba(255,255,255,.25)' : '#dce8df', overflow: 'hidden' }}>
            <div style={{ width: pct + '%', height: '100%', borderRadius: 999, background: allDone ? '#fff' : 'linear-gradient(90deg,#22c55e,#16a34a)', transition: 'width .5s cubic-bezier(.3,.8,.3,1)' }} />
          </div>
          <div style={{ marginTop: 8, fontSize: 11.5, fontWeight: 700, color: allDone ? '#fff' : 'var(--blue-strong)' }}>
            {allDone ? '🎉 ' : ''}{cheer}
          </div>
        </div>

        {JOURNEY_GOALS.map((goal, i) => (
          <div key={goal.label}>
            <JourneyStepRow
              index={i}
              label={goal.label}
              icon={goal.icon}
              href={goal.href}
              active={!!goal.href && (pathname === goal.href || pathname.startsWith(goal.href + '/'))}
              done={i < currentGoalIndex}
              locked={i > currentGoalIndex}
              isCurrent={i === currentGoalIndex}
              last={i === JOURNEY_GOALS.length - 1}
              celebrating={celebrating === i}
              onToggle={() => handleToggle(i)}
            />
            {i === 0 && (
              <div style={{ marginLeft: 42, marginTop: 2, marginBottom: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {CREDIT_PLAN_NAV.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 10px', borderRadius: 9,
                        fontSize: 13.5, fontWeight: 600, textDecoration: 'none',
                        color: active ? 'var(--blue-strong)' : 'var(--ink-2)',
                        background: active ? 'var(--blue-tintbg)' : 'transparent',
                        transition: 'background .14s, color .14s',
                      }}
                    >
                      <Icon name={item.icon} size={15} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-2)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <UserButton />
      </div>
    </aside>
  );
}
