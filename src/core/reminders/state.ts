import type { JobApplication } from "../model/types";

export type ReminderState = JobApplication["reminder"];

/** Preference fields plus the computed schedule. Undefined schedule fields are omitted. */
export function assignSchedule(
  reminder: ReminderState,
  status: ReminderState["status"],
  remindAt?: string,
  firedAt?: string,
): ReminderState {
  const next: ReminderState = {
    enabled: reminder.enabled,
    mode: reminder.mode,
    status,
  };
  if (reminder.leadDays !== undefined) next.leadDays = reminder.leadDays;
  if (reminder.atTime) next.atTime = reminder.atTime;
  if (reminder.customAt) next.customAt = reminder.customAt;
  if (remindAt) next.remindAt = remindAt;
  if (firedAt) next.firedAt = firedAt;
  return next;
}

/** Drops the one-minute overlay. The saved mode, time and delivery status stay. */
export function withoutSoon(reminder: ReminderState): ReminderState {
  if (!reminder.soonAt) return reminder;
  return {
    enabled: reminder.enabled,
    mode: reminder.mode,
    status: reminder.status,
    ...(reminder.leadDays !== undefined ? { leadDays: reminder.leadDays } : {}),
    ...(reminder.atTime ? { atTime: reminder.atTime } : {}),
    ...(reminder.customAt ? { customAt: reminder.customAt } : {}),
    ...(reminder.remindAt ? { remindAt: reminder.remindAt } : {}),
    ...(reminder.firedAt ? { firedAt: reminder.firedAt } : {}),
  };
}

/** A stored one-minute instant that is still strictly before the deadline. */
export function probeTime(reminder: ReminderState, deadlineEndsAt: number): number | null {
  if (!reminder.soonAt) return null;
  const ms = Date.parse(reminder.soonAt);
  if (!Number.isFinite(ms) || ms >= deadlineEndsAt) return null;
  return ms;
}

/** True when this alarm is the one-minute overlay, not the job's saved reminder. */
export function scheduledProbe(reminder: ReminderState, scheduledTime: number): boolean {
  if (!reminder.soonAt) return false;
  const ms = Date.parse(reminder.soonAt);
  return Number.isFinite(ms) && Math.abs(scheduledTime - ms) < 120_000;
}

export function remindersEqual(a: ReminderState, b: ReminderState): boolean {
  return (
    a.enabled === b.enabled &&
    a.mode === b.mode &&
    (a.leadDays ?? null) === (b.leadDays ?? null) &&
    (a.atTime ?? null) === (b.atTime ?? null) &&
    (a.customAt ?? null) === (b.customAt ?? null) &&
    (a.soonAt ?? null) === (b.soonAt ?? null) &&
    (a.remindAt ?? null) === (b.remindAt ?? null) &&
    a.status === b.status &&
    (a.firedAt ?? null) === (b.firedAt ?? null)
  );
}

export function wasDelivered(reminder: ReminderState): boolean {
  return reminder.status === "fired" || reminder.status === "missed";
}
