'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { BrandLogo } from '@/components/ui/Brand';
import { Icon } from '@/components/ui/Icon';

const NAV_ITEMS = [
  { href: '/home', label: 'Home', icon: 'home' },
  { href: '/dispute-letters', label: 'Dispute Letters', icon: 'fileText' },
  { href: '/action-tracker', label: 'Action Tracker', icon: 'checkSquare' },
  { href: '/letter-tracking', label: 'Letter Tracking', icon: 'clock' },
  { href: '/history', label: 'History', icon: 'layers' },
] as const;

// Same destination as /upload's form -- enter your info and upload a report,
// exactly like the original analysis flow. Kept separate from NAV_ITEMS so it
// can be styled as a distinct action rather than just another page link.
const NEW_ANALYSIS_ITEM = { href: '/upload', label: 'New Analysis', icon: 'uploadCloud' } as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 248,
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

      <nav style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
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

        <div style={{ height: 1, background: 'var(--border-2)', margin: '4px 0 10px' }} />

        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '10px 12px', borderRadius: 10,
                fontSize: 14, fontWeight: 600, textDecoration: 'none',
                color: active ? 'var(--blue-strong)' : 'var(--ink-2)',
                background: active ? 'var(--blue-tintbg)' : 'transparent',
                transition: 'background .14s, color .14s',
              }}
            >
              <Icon name={item.icon} size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-2)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <UserButton />
      </div>
    </aside>
  );
}
