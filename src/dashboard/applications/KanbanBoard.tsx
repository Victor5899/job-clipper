import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  JOB_STATUSES,
  RESULT_LABELS,
  STATUS_LABELS,
  type JobStatus,
  type ResultOutcome,
} from "../../core/model/enums";
import {
  InvalidInterviewDateError,
  InvalidStageError,
  applyStageMove,
  compareForBoard,
  groupByStage,
  stageFromDropId,
} from "../../core/model/stage";
import type { JobApplication } from "../../core/model/types";
import {
  JobConflictError,
  JobNotFoundError,
  moveJob,
  recordInterviewDate,
} from "../../storage/jobRepository";
import { JobCardPreview } from "./JobCard";
import { KanbanColumn } from "./KanbanColumn";
import { InterviewDateDialog, OutcomePicker } from "./StageDialogs";

interface KanbanBoardProps {
  jobs: JobApplication[];
  now: Date;
  onOpen: (id: string) => void;
  onNotice: (message: string) => void;
  compare?: (a: JobApplication, b: JobApplication) => number;
}

export function KanbanBoard({
  jobs,
  now,
  onOpen,
  onNotice,
  compare = compareForBoard,
}: KanbanBoardProps) {
  const [mobileStage, setMobileStage] = useState<JobStatus>("saved");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Map<string, JobApplication>>(() => new Map());
  const [interviewFor, setInterviewFor] = useState<string | null>(null);
  const [outcomeFor, setOutcomeFor] = useState<string | null>(null);
  const [, bump] = useState(0);
  const latest = useRef(new Map<string, JobApplication>());
  const queue = useRef(new Map<string, Promise<void>>());

  useEffect(() => {
    for (const job of jobs) {
      const known = latest.current.get(job.id);
      if (!known || job.updatedAt >= known.updatedAt) latest.current.set(job.id, job);
    }
  }, [jobs]);

  const displayed = useMemo(
    () =>
      jobs.map((job) => {
        const optimistic = overrides.get(job.id);
        if (!optimistic || job.updatedAt >= optimistic.updatedAt) return job;
        return optimistic;
      }),
    [jobs, overrides],
  );
  const groups = useMemo(() => groupByStage(displayed, compare), [displayed, compare]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const remember = (job: JobApplication) => {
    latest.current.set(job.id, job);
    setOverrides((current) => {
      const next = new Map(current);
      next.set(job.id, job);
      return next;
    });
  };

  const clearOverride = (id: string) => {
    setOverrides((current) => {
      if (!current.has(id)) return current;
      const next = new Map(current);
      next.delete(id);
      return next;
    });
  };

  const enqueue = (id: string, task: () => Promise<void>) => {
    const previous = queue.current.get(id) ?? Promise.resolve();
    const run = previous.then(task, task);
    queue.current.set(id, run);
  };

  const fail = (job: JobApplication, error: unknown) => {
    clearOverride(job.id);
    bump((value) => value + 1);
    if (error instanceof JobConflictError) {
      latest.current.set(job.id, error.current);
      onNotice(`“${job.title}” changed somewhere else. The board is showing the saved version.`);
      return;
    }
    if (error instanceof InvalidStageError) {
      onNotice("That stage isn't available. Use Saved, Applied, Interview or Result.");
      return;
    }
    if (error instanceof JobNotFoundError) {
      onNotice("That application is no longer saved on this device.");
      return;
    }
    onNotice(`Couldn't move “${job.title}”. It is still ${STATUS_LABELS[job.status]}.`);
  };

  const move = (id: string, status: string, result: string | null = null) => {
    enqueue(id, async () => {
      const job = latest.current.get(id);
      if (!job) return;
      const at = new Date();
      let optimistic: JobApplication;
      try {
        optimistic = applyStageMove(job, status, at, result);
      } catch (error) {
        fail(job, error);
        return;
      }
      if (optimistic === job) return;
      remember(optimistic);
      try {
        const updated = await moveJob(id, status, at, {
          result,
          expectedUpdatedAt: job.updatedAt,
        });
        latest.current.set(id, updated);
        setMobileStage(updated.status);
        if (updated.status !== job.status) {
          onNotice(`Moved “${job.title}” at ${job.company} to ${STATUS_LABELS[updated.status]}.`);
        } else if (updated.result) {
          onNotice(`Recorded ${RESULT_LABELS[updated.result]} for “${job.title}”.`);
        } else {
          onNotice(`Cleared the outcome for “${job.title}”.`);
        }
        if (updated.status === "interview" && job.status !== "interview" && !updated.interviewAt) {
          setInterviewFor(updated.id);
        }
        if (updated.status === "result" && job.status !== "result") setOutcomeFor(updated.id);
      } catch (error) {
        fail(job, error);
      }
    });
  };

  const saveInterviewDate = async (date: string) => {
    const id = interviewFor;
    const job = id ? latest.current.get(id) : undefined;
    if (!id || !job) return;
    try {
      const updated = await recordInterviewDate(id, date, new Date(), {
        expectedUpdatedAt: job.updatedAt,
      });
      latest.current.set(id, updated);
      onNotice(`Saved the interview date for “${job.title}”.`);
      setInterviewFor(null);
    } catch (error) {
      if (error instanceof InvalidInterviewDateError) throw error;
      if (error instanceof JobConflictError) {
        latest.current.set(id, error.current);
        onNotice(`“${job.title}” changed somewhere else. The board is showing the saved version.`);
      } else {
        onNotice(`Couldn't save the interview date for “${job.title}”.`);
      }
      setInterviewFor(null);
    }
  };

  const nameOf = (id: unknown) => {
    const job = displayed.find((item) => item.id === id);
    return job ? `${job.title} at ${job.company}` : "Application";
  };

  const announcements: Announcements = {
    onDragStart({ active }) {
      return `Picked up ${nameOf(active.id)}. Use the arrow keys to change stage, space to drop, or escape to cancel.`;
    },
    onDragOver({ active, over }) {
      const stage = stageFromDropId(over?.id);
      if (!stage) return `${nameOf(active.id)} is not over a stage.`;
      return `${nameOf(active.id)} is over ${STATUS_LABELS[stage]}.`;
    },
    onDragEnd({ active, over }) {
      const stage = stageFromDropId(over?.id);
      const job = displayed.find((item) => item.id === active.id);
      if (!job || !stage || stage === job.status) {
        return `Left ${nameOf(active.id)} in ${job ? STATUS_LABELS[job.status] : "its stage"}.`;
      }
      return `Moving ${nameOf(active.id)} to ${STATUS_LABELS[stage]}.`;
    },
    onDragCancel({ active }) {
      return `Cancelled moving ${nameOf(active.id)}.`;
    },
  };

  const onDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id));
  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const stage = stageFromDropId(event.over?.id);
    if (!stage) return;
    const id = String(event.active.id);
    const job = latest.current.get(id);
    if (!job || job.status === stage) return;
    move(id, stage);
  };

  const activeJob = displayed.find((job) => job.id === activeId) ?? null;
  const dragging = activeId !== null;
  const interviewJob = displayed.find((job) => job.id === interviewFor) ?? null;
  const outcomeJob = displayed.find((job) => job.id === outcomeFor) ?? null;

  return (
    <div>
      <div className="mb-3 flex gap-1 overflow-x-auto md:hidden" role="group" aria-label="Stages">
        {JOB_STATUSES.map((status) => {
          const selected = status === mobileStage;
          return (
            <button
              key={status}
              type="button"
              aria-pressed={selected}
              onClick={() => setMobileStage(status)}
              className={[
                "shrink-0 rounded-full px-3 py-1.5 text-[12.5px]",
                selected ? "bg-surface-2 text-text" : "text-text-muted",
              ].join(" ")}
            >
              {STATUS_LABELS[status]}
              <span className="ml-1.5 font-mono text-[11px] text-text-subtle tabular-nums">
                {groups[status].length}
              </span>
            </button>
          );
        })}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              "Press space to pick up a card. Use the arrow keys to move between stages, space to drop, and escape to cancel. The Move to list changes the stage without dragging.",
          },
        }}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4 md:overflow-x-auto md:snap-x md:snap-mandatory md:pb-3 xl:grid xl:grid-cols-4 xl:overflow-visible">
          {JOB_STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              jobs={groups[status]}
              now={now}
              visible={dragging || status === mobileStage}
              onOpen={onOpen}
              onMove={move}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeJob ? <JobCardPreview job={activeJob} now={now} /> : null}
        </DragOverlay>
      </DndContext>

      <InterviewDateDialog
        open={Boolean(interviewJob)}
        jobTitle={interviewJob?.title ?? ""}
        onSave={saveInterviewDate}
        onClose={() => setInterviewFor(null)}
      />
      <OutcomePicker
        open={Boolean(outcomeJob)}
        jobTitle={outcomeJob?.title ?? ""}
        onChoose={(result: ResultOutcome) => {
          if (!outcomeJob) return;
          setOutcomeFor(null);
          move(outcomeJob.id, "result", result);
        }}
        onClose={() => setOutcomeFor(null)}
      />
    </div>
  );
}
