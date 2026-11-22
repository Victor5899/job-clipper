import { initials } from "../../core/normalize/text";

/** Initials only: company logos are never fetched (offline and privacy, PROJECT_SPEC section 19). */
export function CompanyAvatar({ company }: { company: string }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-8 shrink-0 place-items-center rounded-full border border-border-strong bg-surface-2 font-mono text-[10.5px] font-medium tracking-wide text-text-muted"
    >
      {initials(company)}
    </span>
  );
}
