'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { BrandLogo } from '@/components/ui/Brand';
import { Icon } from '@/components/ui/Icon';

const NAV_ITEMS = [
  { href: '/home', label: 'Home', icon: 'home' },
  { href: '/dispute-letters', label: 'Dispute Letters', icon: 'fileText' },
  { href: '/letter-tracking', label: 'Letter Tracking', icon: 'clock' },
  { href: '/history', label: 'History', icon: 'layers' },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 248,
        flex: 'none',
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
        borderRight: '1px solid var(--border-2)',
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

      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
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
        <Link
          href="/upload"
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            fontSize: 12.5, fontWeight: 700, color: 'var(--ink-3)', textDecoration: 'none',
          }}
        >
          <Icon name="refresh" size={13} /> New Analysis
        </Link>
      </div>
    </aside>
  );
}
