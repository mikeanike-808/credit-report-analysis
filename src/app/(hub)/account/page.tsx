'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Icon } from '@/components/ui/Icon';
import type { Profile, ProfileAddress, IdentityDocument, IdentityDocType, AnalysisRecord } from '@/types';

const DOC_SLOTS: { type: IdentityDocType; icon: string; label: string; hint: string }[] = [
  { type: 'drivers_license', icon: 'user', label: "Driver's License", hint: 'Photo or PDF' },
  { type: 'ssn_proof', icon: 'lock', label: 'Social Security Card', hint: 'Photo or PDF' },
  { type: 'address_proof', icon: 'home', label: 'Proof of Address', hint: 'Utility bill, lease' },
];

const STATUS_STYLE: Record<IdentityDocument['status'], { bg: string; fg: string; label: string }> = {
  pending: { bg: 'var(--amber-bg)', fg: 'var(--amber)', label: 'Pending review' },
  verified: { bg: '#dcfce7', fg: 'var(--green)', label: 'Verified' },
  rejected: { bg: '#fde8e8', fg: 'var(--red)', label: 'Rejected' },
};

function DocSlot({ slot, doc, onUploaded, onRemoved }: {
  slot: typeof DOC_SLOTS[number];
  doc: IdentityDocument | undefined;
  onUploaded: (doc: IdentityDocument) => void;
  onRemoved: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('doc_type', slot.type);
      formData.append('file', file);
      const res = await fetch('/api/identity-documents', { method: 'POST', body: formData });
      const data = await res.json() as { success: boolean; data?: IdentityDocument };
      if (data.success && data.data) onUploaded(data.data);
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    if (!doc) return;
    await fetch(`/api/identity-documents/${doc.id}`, { method: 'DELETE' });
    onRemoved();
  };

  const status = doc ? STATUS_STYLE[doc.status] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Icon name={slot.icon} size={17} style={{ color: 'var(--blue-strong)' }} />
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{slot.label}</span>
      </div>
      {doc ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 14px', border: `1px solid ${status!.fg}33`, background: status!.bg, borderRadius: 12, flex: 1 }}>
          <span style={{ width: 34, height: 34, borderRadius: 9, flex: 'none', display: 'grid', placeItems: 'center', background: '#fff', color: status!.fg }}>
            <Icon name="fileText" size={17} />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--ink)' }}>{slot.label}</div>
            <div style={{ fontSize: 11.5, color: status!.fg, marginTop: 1, fontWeight: 700 }}>{status!.label}</div>
          </div>
          <button onClick={remove} title="Remove" style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--muted)', display: 'grid', placeItems: 'center' }}>
            <Icon name="close" size={15} />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) upload(f); }}
          onClick={() => !uploading && inputRef.current?.click()}
          style={{
            border: `1.5px dashed ${drag ? 'var(--blue-strong)' : '#c5d3ea'}`, background: drag ? 'var(--blue-tintbg)' : '#f7f9fd',
            borderRadius: 12, padding: '20px 14px', textAlign: 'center', cursor: uploading ? 'default' : 'pointer',
            flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}
        >
          <input ref={inputRef} type="file" accept="image/*,.pdf" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
          {uploading ? (
            <span className="spin" style={{ margin: '0 auto', borderColor: 'rgba(22,163,74,.25)', borderTopColor: 'var(--blue-strong)' }} />
          ) : (
            <>
              <Icon name="uploadCloud" size={26} stroke={1.7} style={{ color: 'var(--blue-strong)' }} />
              <div style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--blue-strong)', marginTop: 7 }}>Upload or drop file</div>
              <div style={{ color: 'var(--muted)', fontSize: 11.5, marginTop: 3 }}>{slot.hint}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState<ProfileAddress>({ street: '', city: '', state: '', zip: '' });
  const [saved, setSaved] = useState(false);
  const [docs, setDocs] = useState<IdentityDocument[]>([]);
  const [latestAnalysis, setLatestAnalysis] = useState<AnalysisRecord | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/profile').then((r) => r.json()) as Promise<{ success: boolean; data?: Profile | null }>,
      fetch('/api/identity-documents').then((r) => r.json()) as Promise<{ success: boolean; data?: IdentityDocument[] }>,
      fetch('/api/analyses/latest').then((r) => r.json()) as Promise<{ success: boolean; data?: AnalysisRecord | null }>,
    ]).then(([profileRes, docsRes, analysisRes]) => {
      if (profileRes.success && profileRes.data) {
        setDob(profileRes.data.dob ?? '');
        setPhone(profileRes.data.phone ?? '');
        setAddress(profileRes.data.address ?? { street: '', city: '', state: '', zip: '' });
      }
      if (docsRes.success && docsRes.data) setDocs(docsRes.data);
      if (analysisRes.success && analysisRes.data) setLatestAnalysis(analysisRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const saveProfile = async () => {
    await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dob, phone, address }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (loading) {
    return (
      <div style={{ padding: 'clamp(22px,3vw,36px) clamp(18px,3vw,38px) 44px', textAlign: 'center', color: 'var(--ink-3)' }}>
        <span className="spin" style={{ display: 'inline-block', marginBottom: 12 }} />
        <div>Loading…</div>
      </div>
    );
  }

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'U';

  return (
    <div style={{ padding: 'clamp(22px,3vw,36px) clamp(18px,3vw,38px) 44px', maxWidth: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <span style={{ width: 56, height: 56, borderRadius: '50%', flex: 'none', background: 'var(--blue-tintbg)', color: 'var(--blue-strong)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 19 }}>{initials}</span>
        <div>
          <h1 style={{ margin: 0, fontSize: 'clamp(24px,3vw,32px)', fontWeight: 800, letterSpacing: '-.02em', color: 'var(--ink)' }}>Profile &amp; Documents</h1>
          <p style={{ margin: '5px 0 0', color: 'var(--ink-3)', fontSize: 14 }}>Review and update your details and the documents we have on file.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Personal information */}
        <section className="card" style={{ padding: 'clamp(20px,2.4vw,28px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <h2 className="section-title">Personal Information</h2>
            <span style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600 }}>Used to personalize every dispute letter.</span>
          </div>
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <label>
              <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>First Name</span>
              <input className="input" value={user?.firstName ?? ''} disabled style={{ width: '100%', opacity: 0.7 }} />
            </label>
            <label>
              <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>Last Name</span>
              <input className="input" value={user?.lastName ?? ''} disabled style={{ width: '100%', opacity: 0.7 }} />
            </label>
          </div>
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <label>
              <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>Email Address</span>
              <input className="input" value={user?.primaryEmailAddress?.emailAddress ?? ''} disabled style={{ width: '100%', opacity: 0.7 }} />
            </label>
            <label>
              <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>Phone Number</span>
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" style={{ width: '100%' }} />
            </label>
          </div>
          <div style={{ marginTop: 16 }}>
            <label>
              <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>Date of Birth</span>
              <input className="input" value={dob} onChange={(e) => setDob(e.target.value)} placeholder="MM/DD/YYYY" style={{ width: 220 }} />
            </label>
          </div>
          <div style={{ marginTop: 16 }}>
            <label>
              <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>Street Address</span>
              <input className="input" value={address.street} onChange={(e) => setAddress((a) => ({ ...a, street: e.target.value }))} style={{ width: '100%' }} />
            </label>
          </div>
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <label>
              <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>City</span>
              <input className="input" value={address.city} onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))} style={{ width: '100%' }} />
            </label>
            <label>
              <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>State</span>
              <input className="input" value={address.state} onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))} style={{ width: '100%' }} />
            </label>
            <label>
              <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>Zip Code</span>
              <input className="input" value={address.zip} onChange={(e) => setAddress((a) => ({ ...a, zip: e.target.value }))} style={{ width: '100%' }} />
            </label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 14, marginTop: 18 }}>
            {saved && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--green)' }}><Icon name="checkCircle" size={16} /> Changes saved</span>}
            <button className="btn btn-primary" onClick={saveProfile}>Save Changes</button>
          </div>
        </section>

        {/* Credit report on file */}
        <section className="card" style={{ padding: 'clamp(20px,2.4vw,28px)' }}>
          <h2 className="section-title">Credit Report on File</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>The tri-bureau report we analyze for disputable items. Upload a fresh copy any time your report updates.</p>
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', border: '1px solid #cfe0d6', background: '#f3faf5', borderRadius: 14 }}>
            <span style={{ width: 44, height: 44, borderRadius: 11, flex: 'none', display: 'grid', placeItems: 'center', background: '#dcf3e4', color: 'var(--green)' }}>
              <Icon name="fileText" size={22} />
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--ink)' }}>
                {latestAnalysis ? `Analysis from ${new Date(latestAnalysis.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : 'No report on file'}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>
                {latestAnalysis ? `${latestAnalysis.result.negativeItems.length} negative items found` : 'Upload your latest 3-bureau report to get started.'}
              </div>
            </div>
            <button className="btn btn-ghost" onClick={() => router.push('/upload')}>
              <Icon name="uploadCloud" size={15} /> {latestAnalysis ? 'Replace' : 'Upload'}
            </button>
          </div>
        </section>

        {/* Identity documents */}
        <section className="card" style={{ padding: 'clamp(20px,2.4vw,28px)' }}>
          <h2 className="section-title">Identity Documents</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>The documents bureaus may require to process a dispute. Replace any of them if they expire or your details change.</p>
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 16 }} className="letters-grid">
            {DOC_SLOTS.map((slot) => (
              <DocSlot
                key={slot.type}
                slot={slot}
                doc={docs.find((d) => d.doc_type === slot.type)}
                onUploaded={(doc) => setDocs((prev) => [doc, ...prev.filter((d) => d.doc_type !== slot.type)])}
                onRemoved={() => setDocs((prev) => prev.filter((d) => d.doc_type !== slot.type))}
              />
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, color: 'var(--ink-3)', fontSize: 12.8 }}>
            <Icon name="lock" size={14} /> Your documents are stored privately and only used to verify your identity. Review status is shown here once an admin checks it.
          </div>
        </section>
      </div>
    </div>
  );
}
