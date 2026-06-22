import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-pad" style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Sidebar and content are two independent cards (own border/radius/shadow),
          not one shared shell -- each is a fixed, equal-height panel that never
          resizes itself; only its own internal area scrolls. */}
      <div style={{ display: 'flex', gap: 18, flex: 1, minHeight: 0, maxWidth: 1180, margin: '0 auto', width: '100%' }}>
        <Sidebar />
        <div
          style={{
            flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden',
            background: 'var(--shell)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-shell)', boxShadow: 'var(--sh-shell)',
          }}
        >
          <TopBar />
          {/* overflowY: 'scroll' (not 'auto') always reserves the scrollbar's
              gutter, even on short pages that don't need to scroll -- otherwise
              the visible content width shifts a few pixels between pages
              depending on whether their content happens to overflow. */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'scroll', overflowX: 'hidden' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
