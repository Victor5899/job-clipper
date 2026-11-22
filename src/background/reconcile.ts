import {
  RECONCILE_ALARM_NAME,
  computeRemindAt,
  deadlineEnd,
  jobIdFromAlarmName,
} from "../core/reminders/computeRemindAt";
import { planReminders } from "../core/reminders/planReminders";
import type { JobApplication } from "../core/model/types";
import { assignSchedule, scheduledProbe, wasDelivered, withoutSoon } from "../core/reminders/state";
import { getJob, listJobs, writeReminder } from "../storage/jobRepository";
import { getSettings } from "../storage/settingsRepository";
import { isJobKey } from "../storage/chromeStorage";
import {
  clearJobNotification,
  jobIdFromNotificationId,
  listNotificationIds,
  openJobFromNotification,
  showReminderNotification,
  showTestNotification,
  type ReminderNotice,
} from "./notifications";
import { ensureReconcileAlarm, putAlarm, readAlarms, removeAlarm } from "./reminders";

let tail: Promise<void> = Promise.resolve();

/** One reconcile or delivery at a time, so a startup pass and an alarm cannot both notify. */
function enqueue(task: () => Promise<void>): Promise<void> {
  const run = tail.then(task, task);
  tail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function deliver(jobId: string, kind: ReminderNotice, now: Date): Promise<void> {
  const fresh = await getJob(jobId);
  if (!fresh) return;
  if (wasDelivered(fresh.reminder) && fresh.reminder.remindAt) {
    if (fresh.reminder.soonAt) {
      await writeReminder(fresh.id, withoutSoon(fresh.reminder), fresh.updatedAt);
    }
    return;
  }
  await showReminderNotification(fresh, kind);
  const settings = await getSettings();
  const ideal = computeRemindAt(fresh.deadline, fresh.reminder, settings.reminders, now);
  const remindAt = ideal?.toISOString() ?? fresh.reminder.remindAt;
  const status = kind === "missed" ? "missed" : "fired";
  await writeReminder(
    fresh.id,
    assignSchedule(fresh.reminder, status, remindAt, now.toISOString()),
    fresh.updatedAt,
  );
}

/** The one-minute overlay. The saved reminder status is left for the plan update. */
async function deliverProbe(jobId: string, now: Date): Promise<void> {
  const fresh = await getJob(jobId);
  const soonMs = fresh?.reminder.soonAt ? Date.parse(fresh.reminder.soonAt) : NaN;
  if (!fresh || !Number.isFinite(soonMs) || soonMs > now.getTime()) return;
  await showReminderNotification(fresh, "missed");
  await writeReminder(fresh.id, withoutSoon(fresh.reminder), fresh.updatedAt);
}

/** A fired alarm is already gone, so a deleted job's notification has to be found by id. */
async function dismissOrphanNotifications(jobs: JobApplication[]): Promise<void> {
  const live = new Set(jobs.map((job) => job.id));
  const ids = await listNotificationIds();
  for (const id of ids) {
    const jobId = jobIdFromNotificationId(id);
    if (!jobId || live.has(jobId)) continue;
    await clearJobNotification(jobId);
  }
}

async function reconcileOnce(now: Date): Promise<void> {
  await ensureReconcileAlarm();
  const [jobs, settings, alarms] = await Promise.all([listJobs(), getSettings(), readAlarms()]);
  const plan = planReminders(jobs, now, alarms, settings.reminders);

  for (const item of plan.clear) {
    await removeAlarm(item.name);
    if (!item.dismissNotification) continue;
    const jobId = jobIdFromAlarmName(item.name);
    if (jobId) await clearJobNotification(jobId);
  }

  for (const item of plan.create) {
    await putAlarm(item.name, item.when);
  }

  for (const item of plan.notify) {
    if (item.kind === "probe") await deliverProbe(item.jobId, now);
    else await deliver(item.jobId, item.kind, now);
  }

  const notified = new Set(
    plan.notify.filter((item) => item.kind !== "probe").map((item) => item.jobId),
  );
  for (const update of plan.updates) {
    if (notified.has(update.id)) continue;
    await writeReminder(update.id, update.reminder, update.updatedAt);
  }

  await dismissOrphanNotifications(jobs);
}

export function reconcileReminders(now: Date = new Date()): Promise<void> {
  return enqueue(() => reconcileOnce(now));
}

export function handleStorageChanged(
  changes: Record<string, chrome.storage.StorageChange>,
  area: string,
): Promise<void> | undefined {
  if (area !== "local") return undefined;
  const relevant = Object.keys(changes).some((key) => key === "settings" || isJobKey(key));
  if (!relevant) return undefined;
  return reconcileReminders().catch((error: unknown) => {
    console.error("Job Clipper: reminder reconcile failed", error);
  });
}

const SOON_WINDOW_MS = 60_000;

export interface FiredAlarm {
  name: string;
  scheduledTime?: number;
}

/** Re-reads the job so a cleared deadline or a reminder that already fired is not notified. */
export function handleAlarm(alarm: FiredAlarm, now: Date = new Date()): Promise<void> {
  if (alarm.name === RECONCILE_ALARM_NAME) return reconcileReminders(now);
  const jobId = jobIdFromAlarmName(alarm.name);
  if (!jobId) return Promise.resolve();
  return enqueue(() => deliverAlarm(alarm, jobId, now));
}

async function deliverAlarm(alarm: FiredAlarm, jobId: string, now: Date): Promise<void> {
  const job = await getJob(jobId);
  if (!job) {
    await removeAlarm(alarm.name);
    await clearJobNotification(jobId);
    return;
  }

  const end = deadlineEnd(job.deadline);
  const scheduled = alarm.scheduledTime ?? now.getTime();
  if (!end || end.getTime() <= now.getTime()) {
    const status = end && end.getTime() <= now.getTime() ? "expired" : "none";
    await writeReminder(job.id, assignSchedule(job.reminder, status), job.updatedAt);
    await removeAlarm(alarm.name);
    if (status === "none" || !wasDelivered(job.reminder)) await clearJobNotification(jobId);
    return;
  }

  if (job.reminder.enabled && scheduledProbe(job.reminder, scheduled)) {
    await showReminderNotification(job, "due");
    await writeReminder(job.id, withoutSoon(job.reminder), job.updatedAt);
    return;
  }

  const settings = await getSettings();
  const ideal = computeRemindAt(job.deadline, job.reminder, settings.reminders, now);
  if (!ideal) {
    await writeReminder(job.id, assignSchedule(job.reminder, "none"), job.updatedAt);
    await removeAlarm(alarm.name);
    await clearJobNotification(jobId);
    return;
  }

  const idealIso = ideal.toISOString();
  if (wasDelivered(job.reminder) && job.reminder.remindAt === idealIso) return;
  if (scheduled + SOON_WINDOW_MS < ideal.getTime()) {
    await removeAlarm(alarm.name);
    return;
  }

  const kind: ReminderNotice = scheduled - ideal.getTime() > SOON_WINDOW_MS ? "soon" : "due";
  await showReminderNotification(job, kind);
  await writeReminder(
    job.id,
    assignSchedule(job.reminder, "fired", idealIso, now.toISOString()),
    job.updatedAt,
  );
}

export function handleNotificationClick(notificationId: string): Promise<void> {
  return openJobFromNotification(notificationId);
}

export async function sendTestNotification(): Promise<
  { ok: true } | { ok: false; reason: string }
> {
  try {
    await showTestNotification();
    return { ok: true };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
