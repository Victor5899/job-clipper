import type { ReactNode } from "react";

interface PanelProps {
  title: string;
  titleId: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  /** The single lit panel in a composition. */
  glow?: boolean;
}

export function Panel({ title, titleId, aside, children, className = "", glow }: PanelProps) {
  return (
    <section
      aria-labelledby={titleId}
      className={`panel-surface flex flex-col p-5 ${glow ? "glow-focus" : ""} ${className}`}
    >
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 id={titleId} className="micro-label flex items-center gap-2 text-text-muted">
          <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
          {title}
        </h2>
        {aside}
      </header>
      {children}
    </section>
  );
}
