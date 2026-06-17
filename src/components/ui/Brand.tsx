// Shield + wordmark. If public/logo.png is present it takes over via the img tag.
// Colors: #53A02C (gator green), #010D18 (dark), #E3E2E2 (light)

export function BrandLogo({ size = 38 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Shield body */}
      <path d="M19 2 L34 8 L34 20 C34 28 19 36 19 36 C19 36 4 28 4 20 L4 8 Z" fill="#010D18" />
      <path d="M19 2 L34 8 L34 20 C34 28 19 36 19 36 C19 36 4 28 4 20 L4 8 Z" stroke="#53A02C" strokeWidth="1.5" />
      {/* G letterform */}
      <text x="19" y="25" textAnchor="middle" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="17" fill="#53A02C">G</text>
    </svg>
  );
}

export function Brand() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
      <BrandLogo size={38} />
      <span style={{ fontFamily: "'Arial Black', 'Impact', sans-serif", fontWeight: 900, fontSize: 18, letterSpacing: '-.01em', lineHeight: 1 }}>
        <span style={{ color: 'var(--ink)' }}>DISPUTE</span>
        <span style={{ color: '#53A02C' }}>GATOR</span>
      </span>
    </div>
  );
}
