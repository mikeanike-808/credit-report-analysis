// Shown by /home and /dispute-letters while useEnsureAnalysis() recovers a
// saved analysis from the server after a fresh page load -- replaces a blank
// flash (the page used to just render null until data arrived) with a
// placeholder shaped roughly like the real content, so nothing visually pops.

function SkelCard({ height }: { height: number }) {
  return <div className="card skel" style={{ height }} />;
}

export function PageSkeleton() {
  return (
    <div style={{ padding: 'clamp(22px,3vw,36px) clamp(18px,3vw,38px) 44px' }}>
      {/* Heading row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 26 }}>
        <div>
          <div className="skel" style={{ width: 260, height: 32, marginBottom: 10 }} />
          <div className="skel" style={{ width: 340, height: 16 }} />
        </div>
        <div className="skel" style={{ width: 190, height: 44, borderRadius: 12 }} />
      </div>

      <SkelCard height={160} />
      <div style={{ height: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="sw-grid">
        <SkelCard height={140} />
        <SkelCard height={140} />
      </div>
      <div style={{ height: 16 }} />
      <SkelCard height={220} />
      <div style={{ height: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16 }} className="ap-grid">
        <SkelCard height={180} />
        <SkelCard height={180} />
      </div>
    </div>
  );
}
