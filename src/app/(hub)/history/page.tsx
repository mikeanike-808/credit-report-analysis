'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { BUREAUS } from '@/lib/bureaus';
import type { Bite, DisputeRecord, DisputeStatus } from '@/types';

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function bureauColor(key: string): string {
  return BUREAUS.find((b) => b.key === key)?.color ?? '#94a3b8';
}

function bureauName(key: string): string {
  return BUREAUS.find((b) => b.key === key)?.name ?? key;
}

function bureauAbbr(key: string): string {
  return BUREAUS.find((b) => b.key === key)?.abbr ?? key.slice(0, 2).toUpperCase();
}

const STATUS_LABEL: Record<DisputeStatus, string> = {
  sent: 'Awaiting Response',
  responded: 'Bureau Responded',
  resolved: 'Resolved',
  expired: 'Deadline Passed',
};

const STATUS_COLOR: Record<DisputeStatus, string> = {
  sent: '#16a34a',
  responded: '#b45309',
  resolved: '#64748b',
  expired: '#dc2626',
};

const STATUS_BG: Record<DisputeStatus, string> = {
  sent: '#f0fdf4',
  responded: '#fdf0d5',
  resolved: '#f1f5f9',
  expired: '#fde8e8',
};

interface DisputeCardProps {
  dispute: DisputeRecord;
  onStatusUpdate: (id: string, status: DisputeStatus) => void;
}

function DisputeCard({ dispute, onStatusUpdate }: DisputeCardProps) {
  const [updating, setUpdating] = useState(false);
  const days = daysUntil(dispute.expected_response_by);
  const isOverdue = days < 0 && dispute.status === 'sent';
  const color = bureauColor(dispute.bureau_key);

  const update = async (status: DisputeStatus) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/disputes/${dispute.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json() as { success: boolean };
      if (data.success) onStatusUpdate(dispute.id, status);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 14,
      overflow: 'hidden', background: '#fff',
    }}>
      <div style={{ height: 4, background: color }} />
      <div style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15.5, color: 'var(--ink)' }}>{dispute.creditor}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 3 }}>
              {dispute.dispute_category}
              {dispute.account_number && <span style={{ marginLeft: 8 }}>· #{dispute.account_number}</span>}
            </div>
          </div>
          <span style={{
            fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
            background: color + '18', color, border: `1px solid ${color}44`,
          }}>
            {bureauAbbr(dispute.bureau_key)} · {bureauName(dispute.bureau_key)}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 }}>Sent</div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>
              {new Date(dispute.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 1 }}>
              {dispute.send_method === 'auto' ? '✉ Certified Mail' : '✓ Manual'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 }}>Response Due</div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: isOverdue ? '#dc2626' : 'var(--ink)' }}>
              {new Date(dispute.expected_response_by).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            {dispute.status === 'sent' && (
              <div style={{ fontSize: 11.5, marginTop: 1, fontWeight: 700, color: isOverdue ? '#dc2626' : '#16a34a' }}>
                {isOverdue ? `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}` : `${days} day${days === 1 ? '' : 's'} remaining`}
              </div>
            )}
          </div>
          {dispute.lob_tracking_number && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 }}>USPS Tracking</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--blue)', fontFamily: 'monospace' }}>
                {dispute.lob_tracking_number}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 12.5, fontWeight: 700, padding: '5px 12px', borderRadius: 20,
            background: STATUS_BG[dispute.status],
            color: STATUS_COLOR[dispute.status],
          }}>
            {STATUS_LABEL[dispute.status]}
          </span>

          {dispute.status === 'sent' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline" style={{ fontSize: 12.5, padding: '6px 14px' }} onClick={() => update('responded')} disabled={updating}>
                Mark Responded
              </button>
              <button className="btn btn-outline" style={{ fontSize: 12.5, padding: '6px 14px' }} onClick={() => update('resolved')} disabled={updating}>
                Mark Resolved
              </button>
            </div>
          )}
          {dispute.status === 'responded' && (
            <button className="btn btn-outline" style={{ fontSize: 12.5, padding: '6px 14px' }} onClick={() => update('resolved')} disabled={updating}>
              Mark Resolved
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Bite card — one dated batch of letters, collapsible ──────────────────────

interface BiteCardProps {
  bite: Bite;
  onStatusUpdate: (disputeId: string, status: DisputeStatus) => void;
}

function BiteCard({ bite, onStatusUpdate }: BiteCardProps) {
  const [open, setOpen] = useState(false);
  const disputes = bite.disputes ?? [];
  const active = disputes.filter((d) => d.status === 'sent').length;

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 14, background: '#fff', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%', textAlign: 'left', border: 'none', background: 'transparent',
          padding: '18px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <svg
            width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="var(--ink-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ flex: 'none', transition: 'transform .2s', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15.5, color: 'var(--ink)' }}>
              {bite.letter_count} Letter{bite.letter_count !== 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>
              {new Date(bite.sent_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>
        {active > 0 && (
          <span style={{
            fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
            background: '#f0fdf4', color: '#16a34a',
          }}>
            {active} Awaiting Response
          </span>
        )}
      </button>

      {open && (
        <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {disputes.map((d) => (
            <DisputeCard key={d.id} dispute={d} onStatusUpdate={onStatusUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const [bites, setBites] = useState<Bite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bites')
      .then((r) => r.json())
      .then((data: { success: boolean; data?: Bite[] }) => {
        if (data.success && data.data) setBites(data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleStatusUpdate = (disputeId: string, status: DisputeStatus) => {
    setBites((prev) => prev.map((bite) => ({
      ...bite,
      disputes: bite.disputes?.map((d) => d.id === disputeId ? { ...d, status } : d),
    })));
  };

  return (
    <div style={{ padding: 'clamp(22px,3vw,36px) clamp(18px,3vw,38px) 44px' }}>
      <div style={{ marginBottom: 30 }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(26px,3.4vw,34px)', fontWeight: 800, letterSpacing: '-.02em', color: 'var(--ink)' }}>
          History
        </h1>
        <p style={{ margin: '7px 0 0', color: 'var(--ink-3)', fontSize: 14.5 }}>
          Every batch of dispute letters you've sent, grouped by date, with FCRA response deadlines.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 60 }}>
          <span className="spin" style={{ display: 'inline-block', marginBottom: 12 }} />
          <div>Loading history…</div>
        </div>
      ) : bites.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#fff', border: '1px solid var(--border)', borderRadius: 16 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--ink)', marginBottom: 8 }}>No letters sent yet</div>
          <p style={{ color: 'var(--ink-3)', fontSize: 14, maxWidth: 380, margin: '0 auto 24px' }}>
            Open your dispute letters and click &ldquo;Mark as Sent&rdquo; to start tracking the 30-day FCRA deadline.
          </p>
          <button className="btn btn-primary" style={{ fontSize: 14 }} onClick={() => router.push('/dispute-letters')}>
            Go to Dispute Letters
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {bites.map((bite) => (
            <BiteCard key={bite.id} bite={bite} onStatusUpdate={handleStatusUpdate} />
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 28, color: 'var(--muted)', fontSize: 12.8 }}>
        <Icon name="lock" size={14} /> Dispute records are stored securely and tied to your account only.
      </div>
    </div>
  );
}
