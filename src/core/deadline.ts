import { differenceInCalendarDays, format, isValid, parse } from "date-fns";
import type { Deadline } from "./model/types";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** True only for real calendar dates such as 2026-11-30 (rejects 2026-02-30). */
export function isValidDateString(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = parse(value, "yyyy-MM-dd", new Date());
  return isValid(parsed) && format(parsed, "yyyy-MM-dd") === value;
}

export function isValidTimeString(value: string): boolean {
  return TIME_PATTERN.test(value);
}

/** The moment a deadline ends, in local time. A date without a time ends at 23:59. */
export function deadlineMoment(deadline: NonNullable<Deadline>): Date {
  return parse(`${deadline.date} ${deadline.time ?? "23:59"}`, "yyyy-MM-dd HH:mm", new Date());
}

export function formatDeadline(deadline: Deadline): string {
  if (!deadline) return "No deadline provided";
  const moment = deadlineMoment(deadline);
  return deadline.time ? format(moment, "d MMM yyyy, HH:mm") : format(moment, "d MMM yyyy");
}

/** Calendar days from today until the deadline; negative once it has passed. */
export function daysUntilDeadline(deadline: NonNullable<Deadline>, now: Date): number {
  return differenceInCalendarDays(deadlineMoment(deadline), now);
}

export type CardDeadlineTone = "none" | "ok" | "soon" | "overdue";

/** Board-card deadline: "Due 24 Nov · 3d", "No deadline provided", or "Closed 3d ago". */
export function formatCardDeadline(
  deadline: Deadline,
  now: Date,
): { text: string; tone: CardDeadlineTone } {
  if (!deadline) return { text: "No deadline provided", tone: "none" };
  const moment = deadlineMoment(deadline);
  const days = daysUntilDeadline(deadline, now);
  if (moment.getTime() < now.getTime()) {
    if (days >= 0) return { text: "Closed today", tone: "overdue" };
    return { text: `Closed ${-days}d ago`, tone: "overdue" };
  }
  const when = format(moment, "d MMM");
  const relative = days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d`;
  return { text: `Due ${when} · ${relative}`, tone: days <= 3 ? "soon" : "ok" };
}

export function describeDaysLeft(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `${days}d`;
}
