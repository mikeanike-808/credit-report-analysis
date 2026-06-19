import { Sidebar } from '@/components/layout/Sidebar';

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-pad" style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="shell" style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Sidebar />
        {/* overflowY: 'scroll' (not 'auto') always reserves the scrollbar's
            gutter, even on short pages that don't need to scroll -- otherwise
            the visible content width shifts a few pixels between pages
            depending on whether their content happens to overflow. */}
        <div style={{ flex: 1, minWidth: 0, overflowY: 'scroll', overflowX: 'hidden' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
