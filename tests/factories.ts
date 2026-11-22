import { createJobFromManualEntry } from "../src/core/model/defaults";
import type { JobApplication } from "../src/core/model/types";

let counter = 0;

/** A valid JobApplication for tests; override any field. */
export function makeJob(overrides: Partial<JobApplication> = {}): JobApplication {
  counter++;
  const base = createJobFromManualEntry(
    {
      title: `Data Analyst Intern ${counter}`,
      company: `Company ${counter}`,
      url: `https://example.com/jobs/${counter}`,
      deadline: null,
    },
    { id: `job-${counter}`, now: new Date("2026-11-20T10:00:00") },
  );
  return { ...base, ...overrides };
}
