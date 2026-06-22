'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import type { AppNotification, NotificationType } from '@/types';

const TYPE_STYLE: Record<NotificationType, { icon: string; tint: string; color: string }> = {
  letter_mailed: { icon: 'send', tint: 'var(--blue-tintbg)', color: 'var(--blue-strong)' },
  items_deleted: { icon: 'checkCircle', tint: '#dcfce7', color: 'var(--green)' },
  new_report: { icon: 'fileText', tint: '#f1f5f9', color: 'var(--ink-2)' },
  round_ready: { icon: 'refresh', tint: 'var(--blue-tintbg)', color: 'var(--blue-strong)' },
};

type Tab = 'new' | 'read';

export default function NotificationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [tab, setTab] = useState<Tab>('new');

  useEffect(() => {
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((data: { success: boolean; data?: AppNotification[] }) => {
        if (data.success && data.data) setItems(data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markAll = () => {
    setItems((arr) => arr.map((n) => ({ ...n, read: true })));
    fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }).catch(() => {});
  };

  const open = (n: AppNotification) => {
    setItems((arr) => arr.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: n.id }) }).catch(() => {});
    if (n.link) router.push(n.link);
  };

  const newCount = items.filter((n) => !n.read).length;
  const readCount = items.length - newCount;
  const shown = items.filter((n) => (tab === 'new' ? !n.read : n.read));

  if (loading) {
    return (
      <div style={{ padding: 'clamp(22px,3vw,36px) clamp(18px,3vw,38px) 44px', textAlign: 'center', color: 'var(--ink-3)' }}>
        <span className="spin" style={{ display: 'inline-block', marginBottom: 12 }} />
        <div>Loading…</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 'clamp(22px,3vw,36px) clamp(18px,3vw,38px) 44px', maxWidth: 860 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'clamp(26px,3.4vw,34px)', fontWeight: 800, letterSpacing: '-.02em', color: 'var(--ink)' }}>Notifications</h1>
          <p style={{ margin: '7px 0 0', color: 'var(--ink-3)', fontSize: 14.5 }}>Updates on your disputes, deletions, and new reports.</p>
        </div>
        {newCount > 0 && (
          <button onClick={markAll} className="btn btn-outline">
            <Icon name="checkCircle" size={15} /> Mark all as read
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {([{ key: 'new', label: `New (${newCount})` }, { key: 'read', label: `Read (${readCount})` }] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              height: 34, padding: '0 16px', borderRadius: 999, cursor: 'pointer',
              border: `1px solid ${tab === t.key ? '#bbf7d0' : 'var(--border)'}`,
              background: tab === t.key ? 'var(--blue-tintbg)' : '#fff',
              color: tab === t.key ? 'var(--blue-strong)' : 'var(--ink-2)', fontWeight: 700, fontSize: 13,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {shown.length === 0 ? (
          <div style={{ padding: 'clamp(36px,5vw,56px) 24px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>
            {tab === 'new' ? "You're all caught up — no new notifications." : 'Nothing read yet.'}
          </div>
        ) : shown.map((n, idx) => {
          const style = TYPE_STYLE[n.type];
          return (
            <div
              key={n.id}
              onClick={() => open(n)}
              style={{ display: 'flex', gap: 14, padding: '16px 20px', borderBottom: idx === shown.length - 1 ? 'none' : '1px solid var(--border-2)', background: n.read ? '#fff' : 'var(--blue-tintbg)', cursor: 'pointer' }}
            >
              <span style={{ flex: 'none', width: 40, height: 40, borderRadius: '50%', background: style.tint, color: style.color, display: 'grid', placeItems: 'center' }}>
                <Icon name={style.icon} size={19} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--ink)' }}>{n.title}</span>
                  {!n.read && <span style={{ flex: 'none', width: 7, height: 7, borderRadius: '50%', background: 'var(--blue-strong)' }} />}
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--ink-3)', marginTop: 3, lineHeight: 1.5 }}>{n.body}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 5 }}>{new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
