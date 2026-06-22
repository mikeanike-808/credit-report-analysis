'use client';

import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';

interface RoundReadyModalProps {
  onClose: () => void;
}

// Entry point for the 45-day re-dispute cycle: once the wait is over, this
// offers to re-pull/re-analyze the report. The actual "what changed" diff
// (deleted/still-reporting/new items) is computed and shown on Home after
// the new analysis comes back -- see RoundResultsModal.
export function RoundReadyModal({ onClose }: RoundReadyModalProps) {
  const router = useRouter();

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5vh 16px' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: 'min(440px,100%)', boxShadow: '0 24px 60px rgba(15,23,42,.3)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '16px 18px', borderBottom: '1px solid var(--border-2)' }}>
          <span style={{ flex: 'none', width: 34, height: 34, borderRadius: 9, background: 'var(--blue-tintbg)', color: 'var(--blue-strong)', display: 'grid', placeItems: 'center' }}>
            <Icon name="refresh" size={18} />
          </span>
          <span style={{ flex: 1, fontSize: 11, fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Round 2 is ready</span>
          <button onClick={onClose} title="Later" style={{ flex: 'none', width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: '#fff', color: 'var(--ink-3)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
            <Icon name="close" size={15} />
          </button>
        </div>
        <div style={{ padding: '18px 20px 20px' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>Your 45 days are up</h2>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.55 }}>
            Let&rsquo;s pull a fresh 3-bureau report, see what got deleted, and re-dispute anything still on file.
          </p>
          <div style={{ display: 'flex', gap: 9, marginTop: 18 }}>
            <button onClick={onClose} className="btn btn-ghost" style={{ height: 44, padding: '0 16px' }}>Later</button>
            <button onClick={() => router.push('/upload')} className="btn btn-primary" style={{ flex: 1, height: 44 }}>
              <Icon name="refresh" size={16} /> Pull my updated report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
