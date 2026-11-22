import { addDays, startOfMonth, startOfWeek } from "date-fns";
import { deadlineEnd } from "./computeRemindAt";
import type { JobApplication } from "../model/types";

export type CalendarKind = "deadline" | "interview" | "reminder";

export interface CalendarEntry {
  jobId: string;
  title: string;
  company: string;
  kind: CalendarKind;
  at: Date;
  /** Local calendar day, YYYY-MM-DD. Deadline days use the stored date, not a UTC shift. */
  day: string;
}

const WEEK_START = { weekStartsOn: 1 } as const;

export function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Six Monday-first weeks covering the month. Days outside the month are included. */
export function monthMatrix(month: Date): Date[] {
  const start = startOfWeek(startOfMonth(month), WEEK_START);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function reminderVisible(job: JobApplication): boolean {
  return (
    job.reminder.status === "scheduled" ||
    job.reminder.status === "fired" ||
    job.reminder.status === "missed"
  );
}

/** Deadlines, interviews and reminder instants. Jobs with no deadline are not included. */
export function calendarEntries(jobs: readonly JobApplication[]): CalendarEntry[] {
  const entries: CalendarEntry[] = [];
  for (const job of jobs) {
    const end = deadlineEnd(job.deadline);
    if (job.deadline && end) {
      entries.push({
        jobId: job.id,
        title: job.title,
        company: job.company,
        kind: "deadline",
        at: end,
        day: job.deadline.date,
      });
    }
    if (job.interviewAt) {
      const at = new Date(job.interviewAt);
      if (!Number.isNaN(at.getTime())) {
        entries.push({
          jobId: job.id,
          title: job.title,
          company: job.company,
          kind: "interview",
          at,
          day: dayKey(at),
        });
      }
    }
    if (job.reminder.remindAt && reminderVisible(job)) {
      const at = new Date(job.reminder.remindAt);
      if (!Number.isNaN(at.getTime())) {
        entries.push({
          jobId: job.id,
          title: job.title,
          company: job.company,
          kind: "reminder",
          at,
          day: dayKey(at),
        });
      }
    }
  }
  return entries.sort((a, b) => a.at.getTime() - b.at.getTime() || a.title.localeCompare(b.title));
}

export function entriesByDay(entries: readonly CalendarEntry[]): Map<string, CalendarEntry[]> {
  const map = new Map<string, CalendarEntry[]>();
  for (const entry of entries) {
    const list = map.get(entry.day);
    if (list) list.push(entry);
    else map.set(entry.day, [entry]);
  }
  return map;
}

export function jobsWithoutDeadline(jobs: readonly JobApplication[]): JobApplication[] {
  return jobs
    .filter((job) => job.deadline === null)
    .sort((a, b) => a.company.localeCompare(b.company) || a.title.localeCompare(b.title));
}
