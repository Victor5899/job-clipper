import { addWeeks, startOfWeek } from "date-fns";
import { daysUntilDeadline, deadlineMoment } from "../deadline";
import { JOB_STATUSES, type JobStatus } from "../model/enums";
import type { JobApplication } from "../model/types";

export const CHART_WEEKS = 8;
export const TIMELINE_DAYS = 14;
const RECENT_LIMIT = 5;
const WEEK_OPTIONS = { weekStartsOn: 1 } as const;

export interface UpcomingDeadline {
  job: JobApplication;
  due: Date;
  daysLeft: number;
}

export interface OverviewStats {
  tracked: number;
  active: number;
  savedThisWeek: number;
  appliedThisWeek: number;
  interviews: number;
  dueIn7Days: number;
  byStatus: Record<JobStatus, number>;
  /** Oldest to newest; the last entry is the current week. */
  weeklySaves: { weekStart: Date; count: number }[];
  /** Active jobs whose deadline falls within the next TIMELINE_DAYS days, soonest first. */
  upcomingDeadlines: UpcomingDeadline[];
  noDeadlineCount: number;
  recent: JobApplication[];
}

function isActive(job: JobApplication): boolean {
  return job.status !== "result";
}

export function computeOverviewStats(jobs: JobApplication[], now: Date): OverviewStats {
  const thisWeek = {
    start: startOfWeek(now, WEEK_OPTIONS),
    end: addWeeks(startOfWeek(now, WEEK_OPTIONS), 1),
  };
  const inThisWeek = (iso: string | undefined) => {
    if (!iso) return false;
    const date = new Date(iso);
    return date >= thisWeek.start && date < thisWeek.end;
  };

  const byStatus = Object.fromEntries(JOB_STATUSES.map((status) => [status, 0])) as Record<
    JobStatus,
    number
  >;
  for (const job of jobs) byStatus[job.status]++;

  const firstWeek = addWeeks(thisWeek.start, -(CHART_WEEKS - 1));
  const weeklySaves = Array.from({ length: CHART_WEEKS }, (_, index) => ({
    weekStart: addWeeks(firstWeek, index),
    count: 0,
  }));
  for (const job of jobs) {
    const saved = new Date(job.savedAt);
    const index = weeklySaves.findIndex(
      (week) => saved >= week.weekStart && saved < addWeeks(week.weekStart, 1),
    );
    const week = weeklySaves[index];
    if (week) week.count++;
  }

  const upcoming: UpcomingDeadline[] = [];
  let dueIn7Days = 0;
  let noDeadlineCount = 0;
  for (const job of jobs.filter(isActive)) {
    if (!job.deadline) {
      noDeadlineCount++;
      continue;
    }
    const due = deadlineMoment(job.deadline);
    if (due < now) continue;
    const daysLeft = daysUntilDeadline(job.deadline, now);
    if (daysLeft <= 7) dueIn7Days++;
    if (daysLeft < TIMELINE_DAYS) upcoming.push({ job, due, daysLeft });
  }
  upcoming.sort((a, b) => a.due.getTime() - b.due.getTime());

  const recent = [...jobs]
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
    .slice(0, RECENT_LIMIT);

  return {
    tracked: jobs.length,
    active: jobs.filter(isActive).length,
    savedThisWeek: jobs.filter((job) => inThisWeek(job.savedAt)).length,
    appliedThisWeek: jobs.filter((job) => inThisWeek(job.appliedAt)).length,
    interviews: byStatus.interview,
    dueIn7Days,
    byStatus,
    weeklySaves,
    upcomingDeadlines: upcoming,
    noDeadlineCount,
    recent,
  };
}
