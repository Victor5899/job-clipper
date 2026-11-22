import { daysUntilDeadline, deadlineMoment, isValidDateString } from "../deadline";
import {
  EMPLOYMENT_TYPES,
  EXPERIENCE_LEVELS,
  INDIA_ELIGIBILITY,
  JOB_CATEGORIES,
  JOB_STATUSES,
  RESULT_OUTCOMES,
  SOURCE_LABELS,
  WORK_ARRANGEMENTS,
  type EmploymentType,
  type ExperienceLevel,
  type IndiaEligibility,
  type JobCategory,
  type JobStatus,
  type ResultOutcome,
  type SourceId,
  type WorkArrangement,
} from "../model/enums";
import type { JobApplication } from "../model/types";
import { matchesQuery } from "./searchIndex";
import { compareJobs, isSortId, type SortId } from "./sort";

export const DEADLINE_FILTERS = ["overdue", "next7", "next30", "none", "custom"] as const;
export type DeadlineFilter = (typeof DEADLINE_FILTERS)[number];

export const DEADLINE_FILTER_LABELS: Record<DeadlineFilter, string> = {
  overdue: "Overdue",
  next7: "Next 7 days",
  next30: "Next 30 days",
  none: "No deadline provided",
  custom: "Custom range",
};

const SOURCE_IDS = Object.keys(SOURCE_LABELS) as SourceId[];

export interface BoardQuery {
  q: string;
  status: JobStatus[];
  result: ResultOutcome[];
  source: SourceId[];
  employment: EmploymentType[];
  category: JobCategory[];
  eligibility: IndiaEligibility[];
  arrangement: WorkArrangement[];
  experience: ExperienceLevel[];
  deadline: DeadlineFilter[];
  from: string;
  to: string;
  sort: SortId;
}

export function emptyQuery(): BoardQuery {
  return {
    q: "",
    status: [],
    result: [],
    source: [],
    employment: [],
    category: [],
    eligibility: [],
    arrangement: [],
    experience: [],
    deadline: [],
    from: "",
    to: "",
    sort: "deadline",
  };
}

function readList<T extends string>(
  params: URLSearchParams,
  key: string,
  allowed: readonly T[],
): T[] {
  const raw = params.get(key);
  if (!raw) return [];
  const seen = new Set<T>();
  for (const part of raw.split(",")) {
    if ((allowed as readonly string[]).includes(part)) seen.add(part as T);
  }
  return [...seen];
}

function readDate(params: URLSearchParams, key: string): string {
  const value = params.get(key) ?? "";
  return isValidDateString(value) ? value : "";
}

/** Reads a board query from the hash. Unknown values are dropped. Sort defaults to deadline. */
export function queryFromParams(params: URLSearchParams): BoardQuery {
  const from = readDate(params, "from");
  const to = readDate(params, "to");
  const deadline = readList(params, "deadline", DEADLINE_FILTERS);
  if ((from || to) && !deadline.includes("custom")) deadline.push("custom");
  const sortValue = params.get("sort") ?? "";
  return {
    q: (params.get("q") ?? "").slice(0, 200),
    status: readList(params, "status", JOB_STATUSES),
    result: readList(params, "result", RESULT_OUTCOMES),
    source: readList(params, "source", SOURCE_IDS),
    employment: readList(params, "employment", EMPLOYMENT_TYPES),
    category: readList(params, "category", JOB_CATEGORIES),
    eligibility: readList(params, "eligibility", INDIA_ELIGIBILITY),
    arrangement: readList(params, "arrangement", WORK_ARRANGEMENTS),
    experience: readList(params, "experience", EXPERIENCE_LEVELS),
    deadline,
    from,
    to,
    sort: isSortId(sortValue) ? sortValue : "deadline",
  };
}

function writeList(params: URLSearchParams, key: string, values: readonly string[]): void {
  if (values.length > 0) params.set(key, values.join(","));
}

/** Hash for the applications page. Keeps an open job sheet. Omits values that match the default. */
export function applicationsHash(current: URLSearchParams, query: BoardQuery): string {
  const params = new URLSearchParams();
  const q = query.q.trim();
  if (q) params.set("q", q.slice(0, 200));
  writeList(params, "status", query.status);
  writeList(params, "result", query.result);
  writeList(params, "source", query.source);
  writeList(params, "employment", query.employment);
  writeList(params, "category", query.category);
  writeList(params, "eligibility", query.eligibility);
  writeList(params, "arrangement", query.arrangement);
  writeList(params, "experience", query.experience);
  writeList(params, "deadline", query.deadline);
  if (query.deadline.includes("custom")) {
    if (query.from) params.set("from", query.from);
    if (query.to) params.set("to", query.to);
  }
  if (query.sort !== "deadline") params.set("sort", query.sort);
  const job = current.get("job");
  if (job) params.set("job", job);
  if (current.get("edit") === "1") params.set("edit", "1");
  const search = params.toString();
  return `#/applications${search ? `?${search}` : ""}`;
}

export function queryNarrows(query: BoardQuery): boolean {
  return (
    query.q.trim().length > 0 ||
    query.status.length > 0 ||
    query.result.length > 0 ||
    query.source.length > 0 ||
    query.employment.length > 0 ||
    query.category.length > 0 ||
    query.eligibility.length > 0 ||
    query.arrangement.length > 0 ||
    query.experience.length > 0 ||
    query.deadline.length > 0 ||
    query.from.length > 0 ||
    query.to.length > 0
  );
}

function includes<T extends string>(selected: readonly T[], value: T): boolean {
  return selected.length === 0 || selected.includes(value);
}

function deadlineMatches(job: JobApplication, query: BoardQuery, now: Date): boolean {
  const presets = query.deadline.filter((item) => item !== "custom");
  const custom = query.deadline.includes("custom") && (query.from !== "" || query.to !== "");
  if (presets.length === 0 && !custom) return true;
  if (!job.deadline) return presets.includes("none");

  const moment = deadlineMoment(job.deadline).getTime();
  const upcoming = moment >= now.getTime();
  const days = daysUntilDeadline(job.deadline, now);
  const checks: boolean[] = [];
  if (presets.includes("overdue")) checks.push(moment < now.getTime());
  if (presets.includes("next7")) checks.push(upcoming && days <= 7);
  if (presets.includes("next30")) checks.push(upcoming && days <= 30);
  if (custom) {
    const from = query.from || "0000-01-01";
    const to = query.to || "9999-12-31";
    checks.push(from <= to && job.deadline.date >= from && job.deadline.date <= to);
  }
  return checks.some(Boolean);
}

export function jobMatches(job: JobApplication, query: BoardQuery, now: Date): boolean {
  return (
    matchesQuery(job, query.q) &&
    includes(query.status, job.status) &&
    (query.result.length === 0 ||
      (job.result !== undefined && query.result.includes(job.result))) &&
    includes(query.source, job.source) &&
    includes(query.employment, job.employmentType) &&
    includes(query.category, job.category) &&
    includes(query.eligibility, job.eligibility.value) &&
    includes(query.arrangement, job.workArrangement) &&
    includes(query.experience, job.experience.level) &&
    deadlineMatches(job, query, now)
  );
}

/** Jobs that match, in the selected order. This is the set the board and filtered export use. */
export function applyQuery(
  jobs: readonly JobApplication[],
  query: BoardQuery,
  now: Date,
): JobApplication[] {
  return jobs
    .filter((job) => jobMatches(job, query, now))
    .sort((a, b) => compareJobs(query.sort, a, b));
}
