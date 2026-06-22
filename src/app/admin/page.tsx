'use client';

import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { ADMIN_STAGES, ADMIN_STAGE_ORDER } from '@/lib/adminStages';
import type { AdminMember, AdminStageKey } from '@/lib/adminStages';

const AVATAR_COLORS = ['#16a34a', '#2563eb', '#9333ea', '#db2777', '#ea580c', '#0891b2', '#65a30d', '#dc2626'];
function avatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]!;
}
function initials(name: string): string {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function timeAgo(iso: string | null): string {
  if (!iso) return 'Never';
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function Avatar({ member, size = 38 }: { member: AdminMember; size?: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: '50%', flex: 'none', display: 'grid', placeItems: 'center', background: avatarColor(member.id), color: '#fff', fontWeight: 800, fontSize: size * 0.36, letterSpacing: '-.02em' }}>
      {initials(member.name)}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <span style={{ display: 'block', height: 6, borderRadius: 999, background: '#eef1f6', overflow: 'hidden' }}>
      <span style={{ display: 'block', height: '100%', width: `${value}%`, background: value === 0 ? '#cbd5e1' : 'var(--blue-strong)', borderRadius: 999, transition: 'width .5s ease' }} />
    </span>
  );
}

function Sparkline({ history, w = 116, h = 34 }: { history: AdminMember['scoreHistory']; w?: number; h?: number }) {
  if (history.length === 0) return <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>No report yet</span>;
  if (history.length === 1) return <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>{history[0]!.avgScore}</span>;

  const series = history.map((p) => p.avgScore);
  const min = Math.min(...series), max = Math.max(...series), span = Math.max(1, max - min);
  const pts = series.map((v, i) => [(i / (series.length - 1)) * (w - 2) + 1, h - 3 - ((v - min) / span) * (h - 8)]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0]!.toFixed(1) + ' ' + p[1]!.toFixed(1)).join(' ');
  const up = series[series.length - 1]! >= series[0]!;
  const color = up ? 'var(--blue-strong)' : 'var(--red)';

  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 3 : 1.7} fill={i === pts.length - 1 ? color : '#fff'} stroke={color} strokeWidth={1.4} />
      ))}
    </svg>
  );
}

function Kpi({ icon, label, value, sub, tint, color }: { icon: string; label: string; value: string | number; sub?: string; tint: string; color: string }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 0, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ width: 32, height: 32, borderRadius: 9, background: tint, color, display: 'grid', placeItems: 'center', flex: 'none' }}><Icon name={icon} size={17} /></span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)' }}>{label}</span>
      </div>
      <div className="tnum" style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-.02em', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

function Funnel({ members }: { members: AdminMember[] }) {
  const total = members.length || 1;
  const counts = ADMIN_STAGE_ORDER.map((key) => ({ key, ...ADMIN_STAGES[key], n: members.filter((m) => m.stage === key).length }));
  const max = Math.max(...counts.map((c) => c.n), 1);
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h2 className="section-title" style={{ marginBottom: 14 }}>Signup Funnel</h2>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${counts.length}, 1fr)`, gap: 10 }}>
        {counts.map((c) => (
          <div key={c.key}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 7 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>{c.label}</span>
              <span className="tnum" style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>{Math.round((c.n / total) * 100)}%</span>
            </div>
            <span style={{ display: 'block', height: 8, borderRadius: 999, background: '#eef1f6', overflow: 'hidden' }}>
              <span style={{ display: 'block', height: '100%', width: `${(c.n / max) * 100}%`, background: 'var(--blue-strong)', borderRadius: 999 }} />
            </span>
            <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 6 }}>Step {c.step} of {counts.length} · {c.n}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailDrawer({ member, onClose }: { member: AdminMember; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const stageInfo = ADMIN_STAGES[member.stage];
  const removalRate = member.itemsFound ? Math.round((member.itemsRemoved / member.itemsFound) * 100) : 0;

  const Stat = ({ icon, label, value, color }: { icon: string; label: string; value: number; color?: string }) => (
    <div style={{ background: 'var(--card-soft)', border: '1px solid var(--border-2)', borderRadius: 12, padding: '13px 15px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--ink-3)', fontSize: 11.5, fontWeight: 600, marginBottom: 7 }}><Icon name={icon} size={14} />{label}</div>
      <div className="tnum" style={{ fontSize: 22, fontWeight: 800, color: color ?? 'var(--ink)' }}>{value}</div>
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(15,23,32,.5)', display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(520px, 96vw)', background: 'var(--bg)', height: '100%', overflowY: 'auto', boxShadow: '-20px 0 60px rgba(0,0,0,.25)' }}>
        <div style={{ padding: '20px 24px', background: '#fff', borderBottom: '1px solid var(--border-2)', display: 'flex', alignItems: 'center', gap: 13, position: 'sticky', top: 0 }}>
          <Avatar member={member} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>{member.name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{member.email}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 6, display: 'grid', placeItems: 'center' }}>
            <Icon name="close" size={19} />
          </button>
        </div>

        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Joined {fmtDate(member.joined)} · Active {timeAgo(member.lastActiveAt)}</div>

          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Journey progress</span>
              <span className="tnum" style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)' }}>{stageInfo.progress}%</span>
            </div>
            <ProgressBar value={stageInfo.progress} />
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 7 }}>Step {stageInfo.step} of 5 — {stageInfo.label}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Stat icon="send" label="Dispute rounds" value={member.disputeRounds} />
            <Stat icon="fileText" label="Letters sent" value={member.lettersSent} />
            <Stat icon="alert" label="Items found" value={member.itemsFound} color={member.itemsFound ? undefined : 'var(--muted)'} />
            <Stat icon="checkCircle" label="Items removed" value={member.itemsRemoved} color={member.itemsRemoved ? 'var(--green)' : 'var(--muted)'} />
          </div>

          {member.itemsFound > 0 && (
            <div className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Removal rate</span>
                <span className="tnum" style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>{member.itemsRemoved} / {member.itemsFound} · {removalRate}%</span>
              </div>
              <ProgressBar value={removalRate} />
            </div>
          )}

          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Average score history</span>
              {member.lift > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--green)', fontSize: 12, fontWeight: 700 }}><Icon name="trending" size={14} />+{member.lift} pts</span>}
            </div>
            {member.scoreHistory.length > 0 ? (
              <Sparkline history={member.scoreHistory} w={420} h={60} />
            ) : (
              <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>No credit report pulled yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [q, setQ] = useState('');
  const [stageFilter, setStageFilter] = useState<AdminStageKey | 'All'>('All');
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'name', dir: 'asc' });
  const [selected, setSelected] = useState<AdminMember | null>(null);

  useEffect(() => {
    fetch('/api/admin/members')
      .then((r) => r.json())
      .then((data: { success: boolean; data?: AdminMember[]; error?: string }) => {
        if (data.success && data.data) setMembers(data.data);
        else if (data.error === 'forbidden') setForbidden(true);
      })
      .catch(() => setForbidden(true))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => members.filter((m) =>
    (stageFilter === 'All' || m.stage === stageFilter) &&
    (q === '' || m.name.toLowerCase().includes(q.toLowerCase()) || m.email.toLowerCase().includes(q.toLowerCase())),
  ), [members, q, stageFilter]);

  const cols: { label: string; key: string; get: (m: AdminMember) => string | number }[] = [
    { label: 'Member', key: 'name', get: (m) => m.name.toLowerCase() },
    { label: 'Progress', key: 'step', get: (m) => ADMIN_STAGES[m.stage].step },
    { label: 'Disputes', key: 'disputeRounds', get: (m) => m.disputeRounds },
    { label: 'Found', key: 'itemsFound', get: (m) => m.itemsFound },
    { label: 'Removed', key: 'itemsRemoved', get: (m) => m.itemsRemoved },
    { label: 'Avg Score', key: 'avgScore', get: (m) => m.avgScore ?? 0 },
    { label: 'Signed up', key: 'joined', get: (m) => m.joined },
  ];
  const sortCol = cols.find((c) => c.key === sort.key) ?? cols[0]!;
  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const va = sortCol.get(a), vb = sortCol.get(b);
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return sort.dir === 'asc' ? cmp : -cmp;
  }), [filtered, sort, sortCol]);

  const toggleSort = (key: string) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  const totalSignups = members.length;
  const activeDisputers = members.filter((m) => m.lettersSent > 0).length;
  const itemsFound = members.reduce((a, m) => a + m.itemsFound, 0);
  const itemsRemoved = members.reduce((a, m) => a + m.itemsRemoved, 0);
  const lifts = members.filter((m) => m.lift > 0).map((m) => m.lift);
  const avgLift = lifts.length ? Math.round(lifts.reduce((a, b) => a + b, 0) / lifts.length) : 0;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--ink-3)' }}>
        <div style={{ textAlign: 'center' }}>
          <span className="spin" style={{ display: 'inline-block', marginBottom: 12 }} />
          <div>Loading admin…</div>
        </div>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', marginBottom: 8 }}>Access denied</div>
          <p style={{ color: 'var(--ink-3)', fontSize: 14 }}>Your account isn&rsquo;t on the admin allowlist.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ background: '#0f1f17', color: '#fff', padding: '0 clamp(20px,3vw,40px)', height: 56, display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-.01em' }}>DisputeGator</span>
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', background: 'rgba(255,255,255,.14)', borderRadius: 6, padding: '3px 8px' }}>Admin</span>
        <div style={{ flex: 1 }} />
        <a href="/home" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,.8)', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
          <Icon name="external" size={14} /> Member app
        </a>
      </div>

      <div style={{ padding: 'clamp(20px,3vw,32px) clamp(20px,3vw,40px) 60px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ marginBottom: 18 }}>
          <h1 style={{ margin: 0, fontSize: 'clamp(24px,3vw,30px)', fontWeight: 800, letterSpacing: '-.02em', color: 'var(--ink)' }}>Members</h1>
          <p style={{ margin: '5px 0 0', color: 'var(--ink-3)', fontSize: 13.5 }}>Every signup, where they are in the journey, and their results.</p>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <Kpi icon="user" label="Total signups" value={totalSignups} tint="#e7eefc" color="#2563eb" />
          <Kpi icon="send" label="Active disputers" value={activeDisputers} tint="#dcfce7" color="#16a34a" />
          <Kpi icon="alert" label="Items found" value={itemsFound} sub="across all members" tint="#fef3c7" color="#b45309" />
          <Kpi icon="checkCircle" label="Items removed" value={itemsRemoved} sub={itemsFound ? `${Math.round((itemsRemoved / itemsFound) * 100)}% of found` : '—'} tint="#dcfce7" color="#15803d" />
          <Kpi icon="trending" label="Avg score lift" value={`+${avgLift}`} sub="among disputers" tint="#e0f2f1" color="#0d9488" />
        </div>

        <Funnel members={members} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or email…"
            className="input"
            style={{ flex: 1, minWidth: 220, maxWidth: 340 }}
          />
          <div style={{ display: 'flex', gap: 4, background: '#fff', border: '1px solid var(--border)', borderRadius: 11, padding: 4 }}>
            {(['All', ...ADMIN_STAGE_ORDER] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStageFilter(s)}
                style={{ border: 'none', cursor: 'pointer', borderRadius: 8, padding: '7px 12px', fontSize: 12.5, fontWeight: 700, background: stageFilter === s ? 'var(--blue-strong)' : 'transparent', color: stageFilter === s ? '#fff' : 'var(--ink-3)' }}
              >
                {s === 'All' ? 'All' : ADMIN_STAGES[s].label}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 12.5, color: 'var(--ink-3)', marginLeft: 'auto' }}>{filtered.length} of {members.length}</span>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 920 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.6fr .8fr .7fr .8fr 1fr 1fr 1fr', gap: 12, padding: '11px 20px', background: '#f8fafd', borderBottom: '1px solid var(--border-2)' }}>
                {cols.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => toggleSort(c.key)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', color: sort.key === c.key ? 'var(--blue-strong)' : 'var(--ink-3)', textTransform: 'uppercase', textAlign: 'left' }}
                  >
                    {c.label}
                    <Icon name="chevronDown" size={12} style={{ opacity: sort.key === c.key ? 1 : 0.25, transform: sort.key === c.key && sort.dir === 'asc' ? 'rotate(180deg)' : 'none' }} />
                  </button>
                ))}
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>History</div>
              </div>
              {sorted.map((m, i) => {
                const st = ADMIN_STAGES[m.stage];
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelected(m)}
                    style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.6fr .8fr .7fr .8fr 1fr 1fr 1fr', gap: 12, padding: '13px 20px', alignItems: 'center', borderBottom: i === sorted.length - 1 ? 'none' : '1px solid var(--border-2)', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                      <Avatar member={m} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email}</div>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 600, marginBottom: 5 }}>{st.label}</div>
                      <ProgressBar value={st.progress} />
                    </div>
                    <div className="tnum" style={{ fontSize: 13.5, fontWeight: 700, color: m.disputeRounds ? 'var(--ink)' : 'var(--muted)' }}>{m.disputeRounds || '—'}</div>
                    <div className="tnum" style={{ fontSize: 13.5, fontWeight: 700, color: m.itemsFound ? 'var(--ink)' : 'var(--muted)' }}>{m.itemsFound || '—'}</div>
                    <div className="tnum" style={{ fontSize: 13.5, fontWeight: 700, color: m.itemsRemoved ? 'var(--green)' : 'var(--muted)' }}>{m.itemsRemoved || '—'}</div>
                    <div>
                      <div className="tnum" style={{ fontSize: 14, fontWeight: 800, color: m.avgScore ? 'var(--ink)' : 'var(--muted)' }}>{m.avgScore ?? '—'}</div>
                      {m.lift > 0 && <div className="tnum" style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', marginTop: 2 }}>+{m.lift}</div>}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                      {timeAgo(m.lastActiveAt)}
                      <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2, whiteSpace: 'nowrap' }}>Joined {fmtDate(m.joined)}</div>
                    </div>
                    <div><Sparkline history={m.scoreHistory} /></div>
                  </div>
                );
              })}
              {filtered.length === 0 && <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>No members match.</div>}
            </div>
          </div>
        </div>
      </div>

      {selected && <DetailDrawer member={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
