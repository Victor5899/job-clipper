import { RECONCILE_ALARM_NAME } from "../core/reminders/computeRemindAt";
import type { AlarmSnapshot } from "../core/reminders/planReminders";

export type { AlarmSnapshot };

/** chrome.alarms is the only scheduler. The same alarm name replaces the previous one. */
export async function readAlarms(): Promise<AlarmSnapshot[]> {
  const alarms = await chrome.alarms.getAll();
  return alarms.map((alarm) => ({ name: alarm.name, scheduledTime: alarm.scheduledTime }));
}

export async function putAlarm(name: string, when: number): Promise<void> {
  await chrome.alarms.create(name, { when });
}

export async function removeAlarm(name: string): Promise<void> {
  await chrome.alarms.clear(name);
}

/** Hourly top-up. Alarms can be cleared on browser restart and on extension update. */
export async function ensureReconcileAlarm(): Promise<void> {
  await chrome.alarms.create(RECONCILE_ALARM_NAME, { periodInMinutes: 60 });
}
