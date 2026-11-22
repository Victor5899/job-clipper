/** Decorative hero lighting: a single lime light source and a faint curtain of vertical streaks. */
export function GlowBackdrop({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 -z-10 ${className}`}>
      <div className="hero-glow absolute inset-0" />
      <div className="light-curtain absolute inset-0" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
    </div>
  );
}
