import {
  MIN_ALARM_DELAY_MS,
  MAX_SCHEDULED_REMINDERS,
  REMINDER_ALARM_PREFIX,
  SOON_DELAY_MS,
  alarmNameForJob,
  computeRemindAt,
  deadlineEnd,
  jobIdFromAlarmName,
} from "./computeRemindAt";
import {
  assignSchedule,
  probeTime,
  remindersEqual,
  scheduledProbe,
  wasDelivered,
  withoutSoon,
  type ReminderState,
} from "./state";
import type { JobApplication, Settings } from "../model/types";

export interface AlarmSnapshot {
  name: string;
  scheduledTime?: number;
}

export interface PlannedCreate {
  name: string;
  jobId: string;
  when: number;
}

export interface PlannedClear {
  name: string;
  /** Drop a visible notification only when this job should no longer remind anyone. */
  dismissNotification: boolean;
}

export interface PlannedNotify {
  jobId: string;
  /** `probe` is the one-minute overlay. It does not mark the saved reminder fired or missed. */
  kind: "missed" | "soon" | "probe";
}

export interface PlannedUpdate {
  id: string;
  updatedAt: string;
  reminder: ReminderState;
}

export interface ReminderPlan {
  create: PlannedCreate[];
  clear: PlannedClear[];
  notify: PlannedNotify[];
  updates: PlannedUpdate[];
}

interface Decision {
  job: JobApplication;
  reminder: ReminderState;
  /**
   * Epoch ms of the alarm this job should have, or null when it should have none.
   * A time that already matches the stored alarm is kept; it is not created again.
   */
  alarmAt: number | null;
  notify: "missed" | "soon" | "probe" | null;
  dismissNotification: boolean;
}

function armProbe(probeMs: number, end: Date, now: Date): number | null {
  let when = probeMs;
  if (when < now.getTime() + MIN_ALARM_DELAY_MS) when = now.getTime() + SOON_DELAY_MS;
  return when < end.getTime() ? when : null;
}

function alarmWhen(ideal: Date, end: Date, now: Date): { when: number } | "notify" {
  let when = ideal.getTime();
  if (when < now.getTime() + MIN_ALARM_DELAY_MS) when = now.getTime() + SOON_DELAY_MS;
  if (when < end.getTime()) return { when };
  if (end.getTime() - now.getTime() > MIN_ALARM_DELAY_MS) {
    return { when: end.getTime() - 1000 };
  }
  return "notify";
}

function decide(
  job: JobApplication,
  now: Date,
  settings: Settings["reminders"],
  existing: AlarmSnapshot | undefined,
): Decision {
  const end = deadlineEnd(job.deadline);
  const passed = Boolean(end && end.getTime() <= now.getTime());
  if (passed || !end) {
    return {
      job,
      reminder: assignSchedule(job.reminder, passed ? "expired" : "none"),
      alarmAt: null,
      notify: null,
      dismissNotification: passed ? !wasDelivered(job.reminder) : true,
    };
  }

  const probeMs = probeTime(job.reminder, end.getTime());
  const pendingAt =
    existing?.scheduledTime !== undefined && existing.scheduledTime > now.getTime()
      ? existing.scheduledTime
      : null;
  if (job.reminder.enabled && probeMs !== null && probeMs > now.getTime()) {
    const when = armProbe(probeMs, end, now);
    if (when !== null) {
      return {
        job,
        reminder: job.reminder,
        alarmAt: when,
        notify: null,
        dismissNotification: false,
      };
    }
  }
  if (
    job.reminder.enabled &&
    probeMs !== null &&
    pendingAt !== null &&
    scheduledProbe(job.reminder, pendingAt)
  ) {
    return {
      job,
      reminder: job.reminder,
      alarmAt: pendingAt,
      notify: null,
      dismissNotification: false,
    };
  }
  if (job.reminder.enabled && probeMs !== null) {
    const follow = decide(
      { ...job, reminder: withoutSoon(job.reminder) },
      now,
      settings,
      undefined,
    );
    return {
      job,
      reminder: follow.reminder,
      alarmAt: follow.alarmAt,
      notify: follow.notify ?? "probe",
      dismissNotification: follow.dismissNotification,
    };
  }

  const ideal = computeRemindAt(job.deadline, job.reminder, settings, now);
  if (!ideal) {
    return {
      job,
      reminder: assignSchedule(job.reminder, "none"),
      alarmAt: null,
      notify: null,
      dismissNotification: true,
    };
  }

  const idealIso = ideal.toISOString();
  const sameIdeal = job.reminder.remindAt === idealIso;

  if (sameIdeal && wasDelivered(job.reminder)) {
    return {
      job,
      reminder: job.reminder,
      alarmAt: null,
      notify: null,
      dismissNotification: false,
    };
  }

  if (sameIdeal && job.reminder.status === "scheduled") {
    if (ideal.getTime() >= now.getTime() + MIN_ALARM_DELAY_MS) {
      const matches = pendingAt !== null && Math.abs(pendingAt - ideal.getTime()) < 1000;
      return {
        job,
        reminder: job.reminder,
        alarmAt: matches ? pendingAt : ideal.getTime(),
        notify: null,
        dismissNotification: false,
      };
    }
    if (pendingAt !== null) {
      return {
        job,
        reminder: job.reminder,
        alarmAt: pendingAt,
        notify: null,
        dismissNotification: false,
      };
    }
    return {
      job,
      reminder: assignSchedule(job.reminder, "missed", idealIso, now.toISOString()),
      alarmAt: null,
      notify: "missed",
      dismissNotification: false,
    };
  }

  const slot = alarmWhen(ideal, end, now);
  if (slot === "notify") {
    return {
      job,
      reminder: assignSchedule(job.reminder, "fired", idealIso, now.toISOString()),
      alarmAt: null,
      notify: "soon",
      dismissNotification: false,
    };
  }
  return {
    job,
    reminder: assignSchedule(job.reminder, "scheduled", idealIso),
    alarmAt: slot.when,
    notify: null,
    dismissNotification: false,
  };
}

/**
 * Pure reminder plan. `alarms.create` with the same name replaces an alarm, so the
 * create list never contains two entries for one job.
 * Only the soonest MAX_SCHEDULED_REMINDERS alarms are created; the rest stay scheduled
 * in storage and are topped up on the next reconcile.
 */
export function planReminders(
  jobs: JobApplication[],
  now: Date,
  existingAlarms: readonly AlarmSnapshot[],
  settings: Settings["reminders"],
): ReminderPlan {
  const alarmsByName = new Map(existingAlarms.map((alarm) => [alarm.name, alarm]));
  const decisions = jobs.map((job) =>
    decide(job, now, settings, alarmsByName.get(alarmNameForJob(job.id))),
  );

  const wanting = decisions
    .filter((decision): decision is Decision & { alarmAt: number } => decision.alarmAt !== null)
    .sort((a, b) => a.alarmAt - b.alarmAt || a.job.id.localeCompare(b.job.id));
  const allowed = new Set(
    wanting.slice(0, MAX_SCHEDULED_REMINDERS).map((decision) => decision.job.id),
  );

  const create: PlannedCreate[] = [];
  const desiredNames = new Set<string>();
  for (const decision of wanting) {
    if (!allowed.has(decision.job.id)) continue;
    const name = alarmNameForJob(decision.job.id);
    desiredNames.add(name);
    const existing = alarmsByName.get(name);
    const same =
      existing?.scheduledTime !== undefined &&
      Math.abs(existing.scheduledTime - decision.alarmAt) < 1000;
    if (!same) create.push({ name, jobId: decision.job.id, when: decision.alarmAt });
  }

  const clear: PlannedClear[] = [];
  const decidedById = new Map(decisions.map((decision) => [decision.job.id, decision]));
  for (const alarm of existingAlarms) {
    if (!alarm.name.startsWith(REMINDER_ALARM_PREFIX)) continue;
    if (desiredNames.has(alarm.name)) continue;
    const jobId = jobIdFromAlarmName(alarm.name);
    const decision = jobId ? decidedById.get(jobId) : undefined;
    clear.push({
      name: alarm.name,
      dismissNotification: decision ? decision.dismissNotification : true,
    });
  }

  const notify: PlannedNotify[] = [];
  const updates: PlannedUpdate[] = [];
  for (const decision of decisions) {
    if (decision.notify) notify.push({ jobId: decision.job.id, kind: decision.notify });
    if (!remindersEqual(decision.job.reminder, decision.reminder)) {
      updates.push({
        id: decision.job.id,
        updatedAt: decision.job.updatedAt,
        reminder: decision.reminder,
      });
    }
  }

  return { create, clear, notify, updates };
}
