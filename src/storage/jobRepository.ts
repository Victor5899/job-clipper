import { findDuplicates, type DuplicateMatch } from "../core/duplicates";
import { createJobFromManualEntry } from "../core/model/defaults";
import {
  applyJobEdits,
  validateJobForm,
  type JobFormErrors,
  type JobFormValues,
} from "../core/model/jobForm";
import {
  validateManualEntry,
  type ManualEntryErrors,
  type ManualEntryValues,
} from "../core/model/manualEntry";
import type { JobApplication } from "../core/model/types";
import { isJobKey, jobKey, localStore } from "./chromeStorage";

export class ManualEntryValidationError extends Error {
  constructor(readonly errors: ManualEntryErrors) {
    super("Manual entry is invalid");
    this.name = "ManualEntryValidationError";
  }
}

export class JobValidationError extends Error {
  constructor(readonly errors: JobFormErrors) {
    super("Job edit is invalid");
    this.name = "JobValidationError";
  }
}

/** An exact URL match. Nothing is written; the caller decides whether saving again is intentional. */
export class DuplicateJobError extends Error {
  constructor(readonly matches: DuplicateMatch[]) {
    super("An application with this link is already saved");
    this.name = "DuplicateJobError";
  }
}

export class JobNotFoundError extends Error {
  constructor(readonly id: string) {
    super("Application not found");
    this.name = "JobNotFoundError";
  }
}

/** The copy being saved is older than the copy in storage. The stored job is left as it is. */
export class JobConflictError extends Error {
  constructor(readonly current: JobApplication) {
    super("Application was updated somewhere else");
    this.name = "JobConflictError";
  }
}

export interface WriteOptions {
  /** Save a second application even though one with the same link already exists. */
  allowDuplicate?: boolean;
  /** When set, the write is refused if storage has a newer copy than the one the form loaded. */
  expectedUpdatedAt?: string;
}

async function exactMatches(
  candidate: {
    title: string;
    company: string;
    url: string;
    source?: JobApplication["source"];
    sourceJobId?: string;
  },
  now: Date,
  ignoreId?: string,
): Promise<DuplicateMatch[]> {
  const matches = findDuplicates(candidate, await listJobs(), now, ignoreId);
  return matches.filter((match) => match.kind === "exact");
}

/** Every match, exact or probable, for a manual entry that has already passed validation. */
export async function findManualDuplicates(
  values: ManualEntryValues,
  now: Date = new Date(),
  ignoreId?: string,
): Promise<DuplicateMatch[]> {
  const result = validateManualEntry(values);
  if (!result.ok) return [];
  return findDuplicates(
    { title: result.value.title, company: result.value.company, url: result.value.url },
    await listJobs(),
    now,
    ignoreId,
  );
}

/** Validates again before writing, so storage never holds an invalid job. */
export async function createJob(
  values: ManualEntryValues,
  now: Date = new Date(),
  options?: WriteOptions,
): Promise<JobApplication> {
  const result = validateManualEntry(values);
  if (!result.ok) throw new ManualEntryValidationError(result.errors);
  const job = createJobFromManualEntry(result.value, { id: crypto.randomUUID(), now });
  if (!options?.allowDuplicate) {
    const matches = await exactMatches(job, now);
    if (matches.length > 0) throw new DuplicateJobError(matches);
  }
  await localStore.set({ [jobKey(job.id)]: job });
  return job;
}

export async function getJob(id: string): Promise<JobApplication | undefined> {
  return localStore.get(jobKey(id));
}

/** Replaces one saved application. Never creates a job and never modifies a different one. */
export async function updateJob(
  id: string,
  values: JobFormValues,
  now: Date = new Date(),
  options?: WriteOptions,
): Promise<JobApplication> {
  const existing = await getJob(id);
  if (!existing) throw new JobNotFoundError(id);
  if (options?.expectedUpdatedAt && existing.updatedAt !== options.expectedUpdatedAt) {
    throw new JobConflictError(existing);
  }
  const result = validateJobForm(values);
  if (!result.ok) throw new JobValidationError(result.errors);
  const next = applyJobEdits(existing, result.value, now);
  if (!options?.allowDuplicate) {
    const matches = await exactMatches(next, now, id);
    if (matches.length > 0) throw new DuplicateJobError(matches);
  }
  await localStore.set({ [jobKey(id)]: next });
  return next;
}

export async function deleteJob(id: string): Promise<void> {
  const existing = await getJob(id);
  if (!existing) throw new JobNotFoundError(id);
  await localStore.remove(jobKey(id));
}

/** All saved jobs, most recently saved first. */
export async function listJobs(): Promise<JobApplication[]> {
  const items = await localStore.getAll();
  const jobs: JobApplication[] = [];
  for (const [key, value] of Object.entries(items)) {
    if (isJobKey(key)) jobs.push(value as JobApplication);
  }
  return jobs.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

/**
 * Emits the current job list immediately, then again whenever any job key changes
 * (including writes from other extension pages). Returns an unsubscribe function.
 */
export function subscribeJobs(
  listener: (jobs: JobApplication[]) => void,
  onError: (error: unknown) => void = () => {},
): () => void {
  let active = true;
  let latestRequest = 0;

  const refresh = () => {
    const request = ++latestRequest;
    listJobs().then(
      (jobs) => {
        if (active && request === latestRequest) listener(jobs);
      },
      (error: unknown) => {
        if (active) onError(error);
      },
    );
  };

  const unsubscribe = localStore.onChanged((changes) => {
    if (Object.keys(changes).some(isJobKey)) refresh();
  });
  refresh();

  return () => {
    active = false;
    unsubscribe();
  };
}
