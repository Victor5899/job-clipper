import { GripVertical } from "lucide-react";
import type { KeyboardEvent } from "react";
import {
  useDraggable,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from "@dnd-kit/core";
import { formatCardDeadline, type CardDeadlineTone } from "../../core/deadline";
import {
  ELIGIBILITY_LABELS,
  JOB_STATUSES,
  RESULT_LABELS,
  RESULT_OUTCOMES,
  STATUS_LABELS,
} from "../../core/model/enums";
import type { JobApplication } from "../../core/model/types";
import { CompanyAvatar } from "../../ui/components/CompanyAvatar";
import { SourceTag } from "../../ui/components/SourceTag";

const DEADLINE_CLASS: Record<CardDeadlineTone, string> = {
  none: "text-text-subtle",
  ok: "text-text-muted",
  soon: "text-warn",
  overdue: "text-danger",
};

interface JobCardProps {
  job: JobApplication;
  now: Date;
  overlay?: boolean;
  onOpen?: (id: string) => void;
  onMove?: (id: string, status: string, result?: string | null) => void;
}

export function JobCard({ job, now, onOpen, onMove }: Omit<JobCardProps, "overlay">) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: job.id,
  });

  return (
    <JobCardView
      job={job}
      now={now}
      isDragging={isDragging}
      articleRef={setNodeRef}
      handleRef={setActivatorNodeRef}
      handleAttributes={attributes}
      handleListeners={listeners}
      onOpen={onOpen}
      onMove={onMove}
    />
  );
}

/** Drag preview. It is not a second draggable, so it does not register another copy of the card. */
export function JobCardPreview({ job, now }: { job: JobApplication; now: Date }) {
  return <JobCardView job={job} now={now} overlay isDragging={false} />;
}

function JobCardView({
  job,
  now,
  overlay,
  isDragging,
  articleRef,
  handleRef,
  handleAttributes,
  handleListeners,
  onOpen,
  onMove,
}: JobCardProps & {
  isDragging: boolean;
  articleRef?: (element: HTMLElement | null) => void;
  handleRef?: (element: HTMLElement | null) => void;
  handleAttributes?: DraggableAttributes;
  handleListeners?: DraggableSyntheticListeners;
}) {
  const deadline = formatCardDeadline(job.deadline, now);
  const accent =
    deadline.tone === "overdue"
      ? "bg-danger"
      : deadline.tone === "soon"
        ? "bg-warn"
        : job.status === "interview" || job.result === "selected"
          ? "bg-accent"
          : "bg-transparent";

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!onMove || overlay) return;
    if (event.key !== "[" && event.key !== "]") return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
    const index = JOB_STATUSES.indexOf(job.status);
    if (index < 0) return;
    const status = JOB_STATUSES[index + (event.key === "]" ? 1 : -1)];
    if (!status) return;
    event.preventDefault();
    onMove(job.id, status);
  };

  return (
    <article
      ref={articleRef}
      data-job-id={job.id}
      onKeyDown={onKeyDown}
      className={[
        "relative rounded-[14px] border bg-surface-2",
        overlay
          ? "border-accent shadow-[0_18px_40px_-24px_rgb(0_0_0/0.85)] motion-safe:scale-[1.02]"
          : "border-border",
        isDragging && !overlay ? "opacity-40" : "",
      ].join(" ")}
    >
      <span
        className={`absolute inset-y-2 left-0 w-0.5 rounded-full ${accent}`}
        aria-hidden="true"
      />
      <div className="flex items-start gap-2 py-2.5 pr-2 pl-3.5">
        <CompanyAvatar company={job.company} />
        <div className="min-w-0 flex-1">
          {overlay || !onOpen ? (
            <p className="truncate text-sm font-medium text-text">{job.title}</p>
          ) : (
            <button
              type="button"
              onClick={() => onOpen(job.id)}
              className="block max-w-full truncate rounded-sm text-left text-sm font-medium text-text hover:text-accent"
            >
              {job.title}
            </button>
          )}
          <p className="mt-0.5 flex items-center gap-2 truncate text-[12.5px] text-text-muted">
            <span className="truncate">{job.company}</span>
            <SourceTag source={job.source} />
          </p>
        </div>
        {!overlay && onMove && (
          <button
            type="button"
            ref={handleRef}
            className="grid size-7 shrink-0 cursor-grab place-items-center rounded-md text-text-subtle hover:bg-surface-1 hover:text-text active:cursor-grabbing"
            aria-label={`Drag ${job.title} at ${job.company}`}
            {...handleAttributes}
            {...handleListeners}
          >
            <GripVertical size={15} aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="flex flex-col gap-1.5 px-3.5 pb-3">
        <p className={`text-[12.5px] ${DEADLINE_CLASS[deadline.tone]}`}>{deadline.text}</p>
        <p className="text-[12.5px] text-text-muted">
          <span className="text-text-subtle">India eligibility · </span>
          {ELIGIBILITY_LABELS[job.eligibility.value]}
        </p>
        {job.status === "result" && (
          <p className={`text-[12.5px] ${job.result === "selected" ? "text-accent" : "text-text"}`}>
            {job.result ? RESULT_LABELS[job.result] : "Outcome not set"}
          </p>
        )}
        {!overlay && onMove && (
          <label className="mt-1 flex flex-col gap-1">
            <span className="text-[11px] text-text-subtle">Move to</span>
            <select
              aria-label={`Move to ${job.title} at ${job.company}`}
              value={job.status}
              onChange={(event) => onMove(job.id, event.target.value)}
              className="h-8 w-full rounded-[8px] border border-border-strong bg-surface-1 px-2 text-[12.5px] text-text"
            >
              {JOB_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>
        )}
        {!overlay && onMove && job.status === "result" && (
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-text-subtle">Outcome</span>
            <select
              aria-label={`Outcome for ${job.title} at ${job.company}`}
              value={job.result ?? ""}
              onChange={(event) => onMove(job.id, "result", event.target.value || null)}
              className="h-8 w-full rounded-[8px] border border-border-strong bg-surface-1 px-2 text-[12.5px] text-text"
            >
              <option value="">Outcome not set</option>
              {RESULT_OUTCOMES.map((outcome) => (
                <option key={outcome} value={outcome}>
                  {RESULT_LABELS[outcome]}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </article>
  );
}
