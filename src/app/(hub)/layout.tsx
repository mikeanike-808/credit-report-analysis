import { Sidebar } from '@/components/layout/Sidebar';

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-pad">
      <div className="shell" style={{ display: 'flex', minHeight: 600 }}>
        <Sidebar />
        <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
