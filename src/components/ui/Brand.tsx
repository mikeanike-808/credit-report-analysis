export function BrandLogo() {
  return (
    <img
      src="/logo.png"
      alt="DisputeGator"
      style={{ height: 44, width: 'auto', display: 'block' }}
    />
  );
}

export function Brand() {
  return (
    <div className="brand" style={{ gap: 0 }}>
      <BrandLogo />
    </div>
  );
}
