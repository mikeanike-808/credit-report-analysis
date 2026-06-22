'use client';

import { useMemo } from 'react';

/** Small confetti burst radiating from a point -- used around a medallion when a goal is marked reached. */
export function ConfettiBurst() {
  const bits = useMemo(() => Array.from({ length: 11 }, (_, i) => {
    const ang = (Math.PI * 2 * i) / 11 + Math.random() * 0.5;
    const dist = 24 + Math.random() * 20;
    return {
      dx: (Math.cos(ang) * dist).toFixed(1) + 'px',
      dy: (Math.sin(ang) * dist - 8).toFixed(1) + 'px',
      rot: ((Math.random() * 360) | 0) + 'deg',
      color: ['#16a34a', '#22c55e', '#f59e0b', '#bbf7d0', '#fff'][i % 5],
      delay: (Math.random() * 70) | 0,
      sq: i % 3 === 0,
    };
  }), []);

  return (
    <span style={{ position: 'absolute', left: '50%', top: '50%', pointerEvents: 'none', zIndex: 6 }}>
      {bits.map((b, i) => (
        <span
          key={i}
          style={{
            position: 'absolute', width: b.sq ? 7 : 5, height: b.sq ? 4 : 5, borderRadius: b.sq ? 1 : '50%',
            background: b.color,
            ['--dx' as string]: b.dx, ['--dy' as string]: b.dy, ['--rot' as string]: b.rot,
            animation: `dg-confetti .9s ${b.delay}ms cubic-bezier(.18,.7,.3,1) forwards`,
          }}
        />
      ))}
    </span>
  );
}

/** Full-viewport falling confetti -- used behind celebration modals (e.g. All Clear, item deleted). */
export function ConfettiRain({ count = 70 }: { count?: number }) {
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => ({
    left: +(Math.random() * 100).toFixed(1),
    bg: ['#16a34a', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899', '#bbf7d0'][i % 6],
    delay: +(Math.random() * 2.4).toFixed(2),
    dur: +(2.6 + Math.random() * 1.8).toFixed(2),
    size: 6 + Math.round(Math.random() * 7),
    round: i % 3 === 0,
  })), [count]);

  return (
    <>
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            position: 'absolute', top: -30, left: `${p.left}%`,
            width: p.size, height: p.round ? p.size : p.size * 1.6,
            borderRadius: p.round ? '50%' : 2, background: p.bg,
            animation: `dg-fall ${p.dur}s linear ${p.delay}s infinite`, zIndex: 1,
          }}
        />
      ))}
    </>
  );
}
