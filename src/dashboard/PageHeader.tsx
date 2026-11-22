import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-10">
      <p className="micro-label mb-3 text-text-subtle">{eyebrow}</p>
      <h1 className="font-serif text-[clamp(40px,5vw,56px)] leading-[1] text-text">{title}</h1>
      {children && <p className="mt-3 max-w-2xl text-[15px] text-text-muted">{children}</p>}
    </header>
  );
}
