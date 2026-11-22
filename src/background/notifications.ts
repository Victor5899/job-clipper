import { formatDeadline } from "../core/deadline";
import type { JobApplication } from "../core/model/types";

export const TEST_NOTIFICATION_ID = "jc:notif:test";
const NOTIFICATION_PREFIX = "jc:notif:";
const ICON = "icons/icon-128.png";

export type ReminderNotice = "due" | "soon" | "missed";

export function notificationIdForJob(jobId: string): string {
  return `${NOTIFICATION_PREFIX}${jobId}`;
}

export function jobIdFromNotificationId(id: string): string | null {
  if (id === TEST_NOTIFICATION_ID || !id.startsWith(NOTIFICATION_PREFIX)) return null;
  const jobId = id.slice(NOTIFICATION_PREFIX.length);
  return jobId.length > 0 ? jobId : null;
}

function iconUrl(): string {
  return chrome.runtime.getURL(ICON);
}

const TITLES: Record<ReminderNotice, string> = {
  due: "Deadline reminder",
  soon: "Deadline is soon",
  missed: "Missed reminder",
};

/** Stable id per job, so a second call replaces the notification instead of stacking one. */
export async function showReminderNotification(
  job: JobApplication,
  kind: ReminderNotice,
): Promise<void> {
  await chrome.notifications.create(notificationIdForJob(job.id), {
    type: "basic",
    iconUrl: iconUrl(),
    title: TITLES[kind],
    message: `${job.title} at ${job.company} is due ${formatDeadline(job.deadline)}.`,
  });
}

export async function showTestNotification(): Promise<void> {
  await chrome.notifications.create(TEST_NOTIFICATION_ID, {
    type: "basic",
    iconUrl: iconUrl(),
    title: "Job Clipper",
    message: "Test notification. Deadline reminders can appear on this device.",
  });
}

export async function clearJobNotification(jobId: string): Promise<void> {
  await chrome.notifications.clear(notificationIdForJob(jobId));
}

export async function listNotificationIds(): Promise<string[]> {
  const listed = await chrome.notifications.getAll();
  return Object.keys(listed);
}

/** Opens the dashboard with that job's sheet. tabs.create needs no extra permission. */
export async function openJobFromNotification(notificationId: string): Promise<void> {
  const jobId = jobIdFromNotificationId(notificationId);
  if (!jobId) return;
  const url = chrome.runtime.getURL(`dashboard.html#/job/${jobId}`);
  await chrome.tabs.create({ url });
}
