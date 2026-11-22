import { STATUS_LABELS, type JobStatus } from "../../core/model/enums";

const STYLES: Record<JobStatus, string> = {
  saved: "border-border-strong text-text-muted",
  applied: "border-accent/60 text-accent",
  interview: "border-accent bg-accent text-accent-ink",
  result: "border-olive bg-olive-surface text-text",
};

export function StatusPill({ status }: { status: JobStatus }) {
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center rounded-full border px-2.5 text-[11.5px] font-medium ${STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
