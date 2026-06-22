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

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationsBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);

  useEffect(() => {
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((data: { success: boolean; data?: AppNotification[] }) => {
        if (data.success && data.data) setItems(data.data);
      })
      .catch(() => {});
  }, []);

  const unread = items.filter((n) => !n.read).length;

  const markAll = () => {
    setItems((arr) => arr.map((n) => ({ ...n, read: true })));
    fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }).catch(() => {});
  };

  const openNotification = (n: AppNotification) => {
    setItems((arr) => arr.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: n.id }) }).catch(() => {});
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        title="Notifications"
        onClick={() => setOpen((v) => !v)}
        style={{
          position: 'relative', width: 38, height: 38, borderRadius: 11,
          border: `1px solid ${open ? '#bbf7d0' : 'var(--border)'}`,
          background: open ? 'var(--blue-tintbg)' : 'var(--card)',
          color: open ? 'var(--blue-strong)' : 'var(--ink-2)', display: 'grid', placeItems: 'center', cursor: 'pointer',
        }}
      >
        <Icon name="bell" size={17} />
        {unread > 0 && <span style={{ position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: '50%', background: 'var(--blue-strong)', border: '1.5px solid var(--card)' }} />}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 360, maxWidth: '90vw', background: '#fff', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 20px 50px rgba(15,23,42,.20)', zIndex: 41, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border-2)' }}>
              <span style={{ fontWeight: 800, fontSize: 14.5, color: 'var(--ink)' }}>Notifications</span>
              {unread > 0 && <button onClick={markAll} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: 'var(--blue-strong)' }}>Mark all read</button>}
            </div>
            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
              {items.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>No notifications yet.</div>
              ) : items.slice(0, 8).map((n) => {
                const style = TYPE_STYLE[n.type];
                return (
                  <div key={n.id} onClick={() => openNotification(n)} style={{ display: 'flex', gap: 12, padding: '13px 16px', borderBottom: '1px solid var(--border-2)', background: n.read ? '#fff' : 'var(--blue-tintbg)', cursor: 'pointer' }}>
                    <span style={{ flex: 'none', width: 36, height: 36, borderRadius: '50%', background: style.tint, color: style.color, display: 'grid', placeItems: 'center' }}><Icon name={style.icon} size={17} /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)' }}>{n.title}</span>
                        {!n.read && <span style={{ flex: 'none', width: 7, height: 7, borderRadius: '50%', background: 'var(--blue-strong)' }} />}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2, lineHeight: 1.45 }}>{n.body}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>{timeAgo(n.created_at)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: '12px 16px', textAlign: 'center' }}>
              <button onClick={() => { setOpen(false); router.push('/notifications'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--blue-strong)' }}>View all notifications</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
