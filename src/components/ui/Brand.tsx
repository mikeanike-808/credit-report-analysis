export function BrandLogo() {
  return (
    <div className="brand-logo">
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="rgba(255,255,255,.16)" />
        <path d="M8.5 12l2.4 2.4 4.6-4.8" />
      </svg>
    </div>
  );
}

export function Brand() {
  return (
    <div className="brand">
      <BrandLogo />
      <span className="brand-name">DISPUTEGATOR</span>
    </div>
  );
}
