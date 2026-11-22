import { deadlineMoment, isValidDateString } from "../deadline";
import { JOB_STATUSES, RESULT_OUTCOMES, type JobStatus, type ResultOutcome } from "./enums";
import type { JobApplication } from "./types";

/** A stage or result value that is not one of the four board stages or four outcomes. */
export class InvalidStageError extends Error {
  constructor(readonly value: string) {
    super(`Unknown stage: ${value}`);
    this.name = "InvalidStageError";
  }
}

export class InvalidInterviewDateError extends Error {
  constructor() {
    super("Enter a real calendar date.");
    this.name = "InvalidInterviewDateError";
  }
}

export function isJobStatus(value: string): value is JobStatus {
  return (JOB_STATUSES as readonly string[]).includes(value);
}

export function isResultOutcome(value: string): value is ResultOutcome {
  return (RESULT_OUTCOMES as readonly string[]).includes(value);
}

/** Droppable ids are the stage values. Anything else is not a column. */
export function stageFromDropId(id: unknown): JobStatus | null {
  return typeof id === "string" && isJobStatus(id) ? id : null;
}

/**
 * Moves a job to a stage. Sets `appliedAt` the first time it enters Applied.
 * A Result move may record an outcome; leaving Result clears it. Other fields stay.
 * Returns the same job when nothing changed.
 */
export function applyStageMove(
  job: JobApplication,
  status: string,
  now: Date,
  result: string | null = null,
): JobApplication {
  if (!isJobStatus(status)) throw new InvalidStageError(status);

  let outcome: ResultOutcome | undefined;
  if (status === "result" && result !== null) {
    if (!isResultOutcome(result)) throw new InvalidStageError(result);
    outcome = result;
  }

  const sameStatus = job.status === status;
  const sameResult = (job.result ?? undefined) === outcome;
  if (sameStatus && sameResult) return job;

  const next: JobApplication = {
    ...job,
    status,
    statusHistory: [
      ...job.statusHistory,
      { status, ...(outcome ? { result: outcome } : {}), at: now.toISOString() },
    ],
    updatedAt: now.toISOString(),
  };

  if (status === "applied" && !next.appliedAt) next.appliedAt = now.toISOString();
  if (outcome) next.result = outcome;
  else delete next.result;

  return next;
}

/** Stores an interview date without changing the stage. Noon local time, matching the editor. */
export function applyInterviewDate(job: JobApplication, date: string, now: Date): JobApplication {
  if (!isValidDateString(date)) throw new InvalidInterviewDateError();
  const [year, month, day] = date.split("-").map(Number);
  const interviewAt = new Date(year!, (month ?? 1) - 1, day ?? 1, 12, 0, 0).toISOString();
  if (job.interviewAt === interviewAt) return job;
  return { ...job, interviewAt, updatedAt: now.toISOString() };
}

/** Soonest deadline first. Jobs with no deadline stay at the bottom of the column. */
export function compareForBoard(a: JobApplication, b: JobApplication): number {
  const time = (job: JobApplication) =>
    job.deadline ? deadlineMoment(job.deadline).getTime() : Number.POSITIVE_INFINITY;
  const byDeadline = time(a) - time(b);
  if (byDeadline !== 0) return byDeadline;
  return b.savedAt.localeCompare(a.savedAt);
}

export function groupByStage(
  jobs: readonly JobApplication[],
  compare: (a: JobApplication, b: JobApplication) => number = compareForBoard,
): Record<JobStatus, JobApplication[]> {
  const groups: Record<JobStatus, JobApplication[]> = {
    saved: [],
    applied: [],
    interview: [],
    result: [],
  };
  for (const job of jobs) {
    if (!isJobStatus(job.status)) continue;
    groups[job.status].push(job);
  }
  for (const status of JOB_STATUSES) groups[status].sort(compare);
  return groups;
}
