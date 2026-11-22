import { createJobFromManualEntry } from "../core/model/defaults";
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

/** Validates again before writing, so storage never holds an invalid job. */
export async function createJob(
  values: ManualEntryValues,
  now: Date = new Date(),
): Promise<JobApplication> {
  const result = validateManualEntry(values);
  if (!result.ok) throw new ManualEntryValidationError(result.errors);
  const job = createJobFromManualEntry(result.value, { id: crypto.randomUUID(), now });
  await localStore.set({ [jobKey(job.id)]: job });
  return job;
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
