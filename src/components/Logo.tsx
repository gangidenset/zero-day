/** 0 と照準を組み合わせたロゴマーク（SVG） */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="logo">
      <rect x="1" y="1" width="30" height="30" rx="6" fill="var(--panel-2)" stroke="var(--line-strong)" />
      <ellipse cx="16" cy="16" rx="7" ry="9.5" fill="none" stroke="var(--cyan)" strokeWidth="2.4" />
      <line x1="10.5" y1="22.5" x2="21.5" y2="9.5" stroke="var(--green)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M4 16h3M25 16h3M16 4v2.5M16 25.5V28" stroke="var(--text-faint)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
