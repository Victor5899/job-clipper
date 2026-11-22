/** Job Clipper mark: a bookmark glyph in a lime rounded square (same geometry as the PNG icons). */
export function BrandMark({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <rect width="100" height="100" rx="24" fill="var(--color-accent)" />
      <path d="M32 22H68V80L50 62L32 80Z" fill="var(--color-accent-ink)" />
    </svg>
  );
}

export function BrandLockup({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <BrandMark size={22} />
      <span className="text-[15px] font-semibold tracking-tight text-text">Job Clipper</span>
    </span>
  );
}
