import type { CSSProperties } from 'react';

const ICON_PATHS: Record<string, React.ReactNode> = {
  shield:      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  check:       <path d="M20 6L9 17l-5-5" />,
  user:        <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  key:         <><circle cx="7.5" cy="15.5" r="4.5" /><path d="M10.7 12.3 21 2m-4 1 3 3m-6 0 3 3" /></>,
  file:        <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></>,
  fileText:    <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h8M8 9h2" /></>,
  uploadCloud: <><path d="M16 16l-4-4-4 4M12 12v9" /><path d="M20.4 18.6A5 5 0 0 0 18 9h-1.3A8 8 0 1 0 3 16.3" /></>,
  lock:        <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  calendar:    <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  eye:         <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff:      <><path d="M9.9 4.2A9.5 9.5 0 0 1 12 4c6.5 0 10 7 10 7a13.2 13.2 0 0 1-2.2 3M6.6 6.6A13.3 13.3 0 0 0 2 11s3.5 7 10 7a9.6 9.6 0 0 0 4-.9M3 3l18 18M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
  external:    <><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></>,
  refresh:     <><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" /></>,
  sparkle:     <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />,
  checkCircle: <><circle cx="12" cy="12" r="9" /><path d="M8.5 12.2l2.4 2.4 4.6-4.8" /></>,
  xCircle:     <><circle cx="12" cy="12" r="9" /><path d="M15 9l-6 6M9 9l6 6" /></>,
  info:        <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  chevronDown: <path d="M6 9l6 6 6-6" />,
  chevronRight:<path d="M9 6l6 6-6 6" />,
  arrowRight:  <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  trending:    <><path d="M22 7l-8.5 8.5-5-5L2 17" /><path d="M16 7h6v6" /></>,
  gauge:       <><path d="M12 14l3.5-3.5" /><path d="M4.2 17a8 8 0 1 1 15.6 0" /></>,
  copy:        <><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
  download:    <><path d="M12 3v12M7 10l5 5 5-5" /><path d="M5 21h14" /></>,
  print:       <><path d="M6 9V2h12v7" /><rect x="6" y="13" width="12" height="8" /><path d="M6 17H4a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2" /></>,
  close:       <path d="M18 6 6 18M6 6l12 12" />,
  layers:      <><path d="M12 2 2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5M2 12l10 5 10-5" /></>,
  alert:       <><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></>,
  hash:        <path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18" />,
  percent:     <><path d="M19 5 5 19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></>,
  scale:       <><path d="M12 3v18M5 7h14" /><path d="M5 7l-3 6a3 3 0 0 0 6 0L5 7zM19 7l-3 6a3 3 0 0 0 6 0l-3-6z" /></>,
  home:        <><path d="M3 11l9-8 9 8" /><path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" /></>,
  clock:       <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>,
  trash:       <><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" /><path d="M10 11v6M14 11v6" /></>,
  checkSquare: <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 12.5l2.5 2.5L16 9.5" /></>,
};

interface IconProps {
  name: string;
  size?: number;
  stroke?: number;
  fill?: string;
  className?: string;
  style?: CSSProperties;
}

export function Icon({ name, size = 18, stroke = 2, fill = 'none', className = '', style = {} }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}
