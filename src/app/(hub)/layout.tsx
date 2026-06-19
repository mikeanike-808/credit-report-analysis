import { Sidebar } from '@/components/layout/Sidebar';

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-pad" style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="shell" style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Sidebar />
        <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
