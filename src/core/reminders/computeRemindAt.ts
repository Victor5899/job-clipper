import { isValid, parse, subDays } from "date-fns";
import { deadlineMoment, isValidDateString, isValidTimeString } from "../deadline";
import type { Deadline, JobApplication, Settings } from "../model/types";

/** Presets offered in Settings and on a job. 0 is the deadline's own day. */
export const LEAD_DAY_PRESETS = [0, 1, 2, 3, 7] as const;
export type LeadDayPreset = (typeof LEAD_DAY_PRESETS)[number];

/** Chrome's shortest alarm delay (Chrome 120+). Real deadlines are much further out. */
export const MIN_ALARM_DELAY_MS = 30_000;
/** Used when the ideal reminder time has already passed but the deadline has not. */
export const SOON_DELAY_MS = 60_000;
/** Chrome caps alarms near 500. Leave room for the hourly reconcile alarm. */
export const MAX_SCHEDULED_REMINDERS = 400;

export const REMINDER_ALARM_PREFIX = "jc:reminder:";
export const RECONCILE_ALARM_NAME = "jc:reconcile";

export type ReminderChoice = Pick<
  JobApplication["reminder"],
  "enabled" | "mode" | "leadDays" | "atTime" | "customAt"
>;

export function isLeadPreset(value: number): value is LeadDayPreset {
  return (LEAD_DAY_PRESETS as readonly number[]).includes(value);
}

export function alarmNameForJob(jobId: string): string {
  return `${REMINDER_ALARM_PREFIX}${jobId}`;
}

export function jobIdFromAlarmName(name: string): string | null {
  if (!name.startsWith(REMINDER_ALARM_PREFIX)) return null;
  const id = name.slice(REMINDER_ALARM_PREFIX.length);
  return id.length > 0 ? id : null;
}

/** A deadline Job Clipper is willing to remind about: a real local calendar date, time optional. */
export function isValidDeadline(deadline: NonNullable<Deadline>): boolean {
  if (!isValidDateString(deadline.date)) return false;
  if (deadline.time !== undefined && !isValidTimeString(deadline.time)) return false;
  return isValid(deadlineMoment(deadline));
}

/** The local instant the deadline ends, or null when the deadline is missing or not a real date. */
export function deadlineEnd(deadline: Deadline): Date | null {
  if (!deadline || !isValidDeadline(deadline)) return null;
  return deadlineMoment(deadline);
}

function leadDaysFor(reminder: ReminderChoice, settings: Settings["reminders"]): number {
  if (reminder.leadDays !== undefined && isLeadPreset(reminder.leadDays)) return reminder.leadDays;
  if (isLeadPreset(settings.leadDays)) return settings.leadDays;
  return 1;
}

function atTimeFor(reminder: ReminderChoice, settings: Settings["reminders"]): string {
  if (reminder.atTime && isValidTimeString(reminder.atTime)) return reminder.atTime;
  if (isValidTimeString(settings.atTime)) return settings.atTime;
  return "09:00";
}

/** Local wall-clock time on a calendar day. Hours stay at the requested clock time across DST. */
function atLocalTime(day: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const result = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes, 0, 0);
  return result;
}

/**
 * The ideal reminder instant in the browser's local time zone.
 * Returns null when no alarm should exist: reminders off, no valid deadline, a passed
 * deadline, or a custom time that is missing or not strictly before the deadline.
 * The instant may already be in the past; the planner decides whether to catch up or
 * mark the reminder missed.
 */
export function computeRemindAt(
  deadline: Deadline,
  reminder: ReminderChoice,
  settings: Settings["reminders"],
  now: Date,
): Date | null {
  if (!reminder.enabled || !deadline) return null;
  const end = deadlineEnd(deadline);
  if (!end || end.getTime() <= now.getTime()) return null;

  if (reminder.mode === "custom") {
    if (!reminder.customAt) return null;
    const custom = new Date(reminder.customAt);
    if (Number.isNaN(custom.getTime()) || custom.getTime() >= end.getTime()) return null;
    return custom;
  }

  const day = parse(deadline.date, "yyyy-MM-dd", now);
  const target = atLocalTime(
    subDays(day, leadDaysFor(reminder, settings)),
    atTimeFor(reminder, settings),
  );
  if (target.getTime() < end.getTime()) return target;
  // The preset lands on or after the deadline (for example same-day 09:00 when the
  // deadline is 08:00). There is no valid preset instant; the caller treats it as past.
  return new Date(now.getTime() - 1);
}
