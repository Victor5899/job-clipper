import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
}

export function EmptyState({ icon, title, children, actions, compact }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center text-center ${compact ? "gap-2 py-6" : "gap-3 py-10"}`}
    >
      {icon && (
        <span
          aria-hidden="true"
          className="mb-1 grid size-10 place-items-center rounded-full border border-border-strong bg-surface-2 text-accent"
        >
          {icon}
        </span>
      )}
      <p className={`font-serif text-text ${compact ? "text-xl" : "text-2xl"}`}>{title}</p>
      {children && <div className="max-w-sm text-sm text-text-muted">{children}</div>}
      {actions && <div className="mt-2 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}
