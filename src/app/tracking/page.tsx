'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, SignInButton } from '@clerk/nextjs';
import { Brand } from '@/components/ui/Brand';
import { Icon } from '@/components/ui/Icon';
import { BUREAUS } from '@/lib/bureaus';
import type { DisputeRecord, DisputeStatus } from '@/types';

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
      {/* Top bar — bureau color accent */}
      <div style={{ height: 4, background: color }} />

      <div style={{ padding: '18px 20px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15.5, color: 'var(--ink)' }}>{dispute.creditor}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 3 }}>
              {dispute.dispute_category}
              {dispute.account_number && <span style={{ marginLeft: 8 }}>· #{dispute.account_number}</span>}
            </div>
          </div>
          {/* Bureau pill */}
          <span style={{
            fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
            background: color + '18', color, border: `1px solid ${color}44`,
          }}>
            {bureauAbbr(dispute.bureau_key)} · {bureauName(dispute.bureau_key)}
          </span>
        </div>

        {/* Timeline row */}
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

        {/* Status + actions */}
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
              <button
                className="btn btn-outline"
                style={{ fontSize: 12.5, padding: '6px 14px' }}
                onClick={() => update('responded')}
                disabled={updating}
              >
                Mark Responded
              </button>
              <button
                className="btn btn-outline"
                style={{ fontSize: 12.5, padding: '6px 14px' }}
                onClick={() => update('resolved')}
                disabled={updating}
              >
                Mark Resolved
              </button>
            </div>
          )}
          {dispute.status === 'responded' && (
            <button
              className="btn btn-outline"
              style={{ fontSize: 12.5, padding: '6px 14px' }}
              onClick={() => update('resolved')}
              disabled={updating}
            >
              Mark Resolved
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TrackingPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const [disputes, setDisputes] = useState<DisputeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { setLoading(false); return; }

    fetch('/api/disputes')
      .then((r) => r.json())
      .then((data: { success: boolean; data?: DisputeRecord[] }) => {
        if (data.success && data.data) setDisputes(data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isLoaded, isSignedIn]);

  const handleStatusUpdate = (id: string, status: DisputeStatus) => {
    setDisputes((prev) => prev.map((d) => d.id === id ? { ...d, status } : d));
  };

  const active = disputes.filter((d) => d.status === 'sent');
  const responded = disputes.filter((d) => d.status === 'responded');
  const closed = disputes.filter((d) => d.status === 'resolved' || d.status === 'expired');

  return (
    <div className="page-pad">
      <div className="shell">
        <header className="topbar">
          <Brand />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn btn-ghost" style={{ fontSize: 14 }} onClick={() => router.push('/results')}>
              <Icon name="refresh" size={15} /> Back to Results
            </button>
          </div>
        </header>

        <div style={{ padding: 'clamp(22px,3vw,36px) clamp(18px,3vw,38px) 44px' }}>
          <div style={{ marginBottom: 30 }}>
            <h1 style={{ margin: 0, fontSize: 'clamp(26px,3.4vw,34px)', fontWeight: 800, letterSpacing: '-.02em', color: 'var(--ink)' }}>
              Dispute Tracker
            </h1>
            <p style={{ margin: '7px 0 0', color: 'var(--ink-3)', fontSize: 14.5 }}>
              Track your sent dispute letters and FCRA response deadlines.
            </p>
          </div>

          {!isLoaded || loading ? (
            <div style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 60 }}>
              <span className="spin" style={{ display: 'inline-block', marginBottom: 12 }} />
              <div>Loading disputes…</div>
            </div>
          ) : !isSignedIn ? (
            <div style={{
              textAlign: 'center', padding: 60, background: '#fff',
              border: '1px solid var(--border)', borderRadius: 16,
            }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--ink)', marginBottom: 8 }}>Sign in to view your tracker</div>
              <p style={{ color: 'var(--ink-3)', fontSize: 14, marginBottom: 24, maxWidth: 360, margin: '0 auto 24px' }}>
                Create a free account to save and track your dispute letters and FCRA response deadlines.
              </p>
              <SignInButton mode="modal">
                <button className="btn btn-primary" style={{ fontSize: 15, padding: '11px 24px' }}>
                  Sign In or Create Account
                </button>
              </SignInButton>
            </div>
          ) : disputes.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: 60, background: '#fff',
              border: '1px solid var(--border)', borderRadius: 16,
            }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--ink)', marginBottom: 8 }}>No disputes tracked yet</div>
              <p style={{ color: 'var(--ink-3)', fontSize: 14, maxWidth: 380, margin: '0 auto 24px' }}>
                Open your dispute letters from your analysis results and click "Mark as Sent" to start tracking the 30-day FCRA deadline.
              </p>
              <button className="btn btn-primary" style={{ fontSize: 14 }} onClick={() => router.push('/results')}>
                Go to My Results
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              {/* Summary stats */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {[
                  { label: 'Active', value: active.length, color: '#16a34a' },
                  { label: 'Responded', value: responded.length, color: '#b45309' },
                  { label: 'Resolved', value: closed.length, color: '#64748b' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{
                    flex: 1, minWidth: 100, padding: '16px 20px', background: '#fff',
                    border: '1px solid var(--border)', borderRadius: 12, textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
                    <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>

              {active.length > 0 && (
                <div>
                  <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
                    Active — Awaiting Response ({active.length})
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {active.map((d) => (
                      <DisputeCard key={d.id} dispute={d} onStatusUpdate={handleStatusUpdate} />
                    ))}
                  </div>
                </div>
              )}

              {responded.length > 0 && (
                <div>
                  <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
                    Bureau Responded ({responded.length})
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {responded.map((d) => (
                      <DisputeCard key={d.id} dispute={d} onStatusUpdate={handleStatusUpdate} />
                    ))}
                  </div>
                </div>
              )}

              {closed.length > 0 && (
                <div>
                  <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
                    Closed ({closed.length})
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {closed.map((d) => (
                      <DisputeCard key={d.id} dispute={d} onStatusUpdate={handleStatusUpdate} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 28, color: 'var(--muted)', fontSize: 12.8 }}>
            <Icon name="lock" size={14} /> Dispute records are stored securely and tied to your account only.
          </div>
        </div>
      </div>
    </div>
  );
}
