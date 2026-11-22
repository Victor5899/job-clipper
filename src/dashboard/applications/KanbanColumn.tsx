import { useDroppable } from "@dnd-kit/core";
import { STATUS_LABELS, type JobStatus } from "../../core/model/enums";
import type { JobApplication } from "../../core/model/types";
import { JobCard } from "./JobCard";

interface KanbanColumnProps {
  status: JobStatus;
  jobs: JobApplication[];
  now: Date;
  /** On small screens only the chosen stage is shown, unless a drag is in progress. */
  visible: boolean;
  onOpen: (id: string) => void;
  onMove: (id: string, status: string, result?: string | null) => void;
}

export function KanbanColumn({ status, jobs, now, visible, onOpen, onMove }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const count = jobs.length;
  const noun = count === 1 ? "application" : "applications";

  return (
    <section
      ref={setNodeRef}
      aria-label={`${STATUS_LABELS[status]}, ${count} ${noun}`}
      className={[
        "min-h-64 snap-start flex-col rounded-[14px] border border-border bg-surface-1/70",
        "md:flex md:w-[280px] md:shrink-0 xl:w-auto xl:min-w-0",
        visible ? "flex" : "hidden",
        isOver
          ? "shadow-[inset_0_0_0_1px_rgb(198_241_53/0.55),inset_0_0_48px_rgb(198_241_53/0.08)]"
          : "",
      ].join(" ")}
    >
      <header className="flex items-baseline justify-between gap-2 px-3 pt-3 pb-2">
        <h2 className="text-sm font-medium text-text">{STATUS_LABELS[status]}</h2>
        <span className="font-mono text-xs text-text-muted tabular-nums">{count}</span>
      </header>
      <ul className="flex flex-1 flex-col gap-2 px-2 pb-2">
        {jobs.length === 0 ? (
          <li className="px-2 py-8 text-center text-[13px] text-text-subtle">No applications</li>
        ) : (
          jobs.map((job) => (
            <li key={job.id}>
              <JobCard job={job} now={now} onOpen={onOpen} onMove={onMove} />
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
