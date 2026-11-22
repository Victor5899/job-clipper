import { describe, expect, it } from "vitest";
import { chromeFake } from "../../tests/fakes/chrome";
import { makeJob } from "../../tests/factories";
import {
  RECONCILE_ALARM_NAME,
  alarmNameForJob,
  computeRemindAt,
} from "../core/reminders/computeRemindAt";
import { DEFAULT_SETTINGS } from "../core/model/defaults";
import type { Settings } from "../core/model/types";
import { jobKey } from "../storage/chromeStorage";
import { getJob, scheduleReminderSoon } from "../storage/jobRepository";
import { saveSettings } from "../storage/settingsRepository";
import {
  handleAlarm,
  handleNotificationClick,
  handleStorageChanged,
  reconcileReminders,
  sendTestNotification,
} from "./reconcile";

const settings: Settings["reminders"] = DEFAULT_SETTINGS.reminders;

function local(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

async function storeJob(job: ReturnType<typeof makeJob>): Promise<void> {
  await chromeFake().storage.local.set({ [jobKey(job.id)]: job, settings: DEFAULT_SETTINGS });
}

function reminderAlarms(): Promise<{ name: string; scheduledTime?: number }[]> {
  return chromeFake()
    .alarms.getAll()
    .then((alarms) => alarms.filter((alarm) => alarm.name.startsWith("jc:reminder:")));
}

async function clearReminderAlarms(): Promise<void> {
  for (const alarm of await reminderAlarms()) {
    await chromeFake().alarms.clear(alarm.name);
  }
}

describe("reconcileReminders", () => {
  const now = local(2026, 11, 22, 15, 0);

  it("schedules one alarm for a valid deadline and does not duplicate it", async () => {
    const job = makeJob({
      id: "one",
      deadline: { date: "2026-11-30", origin: "user" },
      reminder: { enabled: true, mode: "default", status: "none" },
    });
    await storeJob(job);

    await reconcileReminders(now);
    await reconcileReminders(now);

    const alarms = await reminderAlarms();
    expect(alarms).toHaveLength(1);
    expect(alarms[0]).toMatchObject({
      name: alarmNameForJob(job.id),
      scheduledTime: local(2026, 11, 29, 9, 0).getTime(),
    });
    expect(chromeFake().notifications.calls()).toEqual([]);
    expect((await getJob(job.id))?.reminder.status).toBe("scheduled");
  });

  it("does not alarm a missing or invalid deadline, then schedules when a deadline is added", async () => {
    const job = makeJob({ id: "later", deadline: null });
    await storeJob(job);
    await reconcileReminders(now);
    expect(await reminderAlarms()).toEqual([]);

    await chromeFake().storage.local.set({
      [jobKey(job.id)]: {
        ...job,
        deadline: { date: "2026-02-30", origin: "user" },
      },
    });
    await reconcileReminders(now);
    expect(await reminderAlarms()).toEqual([]);

    await chromeFake().storage.local.set({
      [jobKey(job.id)]: {
        ...job,
        deadline: { date: "2026-12-01", origin: "user" },
        reminder: { enabled: true, mode: "default", status: "none" },
      },
    });
    await reconcileReminders(now);
    expect(await reminderAlarms()).toHaveLength(1);
  });

  it("reschedules when the deadline or the default lead time changes, and clears on delete", async () => {
    const job = makeJob({
      id: "move",
      deadline: { date: "2026-11-30", origin: "user" },
      reminder: { enabled: true, mode: "default", status: "none" },
    });
    const stay = makeJob({
      id: "stay",
      deadline: { date: "2026-12-20", origin: "user" },
      reminder: { enabled: true, mode: "default", leadDays: 1, status: "none" },
    });
    await storeJob(job);
    await chromeFake().storage.local.set({ [jobKey(stay.id)]: stay });
    await reconcileReminders(now);

    const moved = {
      ...job,
      deadline: { date: "2026-12-15", origin: "user" as const },
      reminder: { enabled: true, mode: "default" as const, status: "none" as const },
    };
    await chromeFake().storage.local.set({ [jobKey(job.id)]: moved });
    await reconcileReminders(now);
    const afterMove = await reminderAlarms();
    expect(afterMove).toHaveLength(2);
    expect(afterMove.find((alarm) => alarm.name === alarmNameForJob(job.id))?.scheduledTime).toBe(
      local(2026, 12, 14, 9, 0).getTime(),
    );
    expect(afterMove.find((alarm) => alarm.name === alarmNameForJob(stay.id))?.scheduledTime).toBe(
      local(2026, 12, 19, 9, 0).getTime(),
    );

    await saveSettings({
      ...DEFAULT_SETTINGS,
      reminders: { ...settings, leadDays: 2 },
    });
    await reconcileReminders(now);
    const afterSettings = await reminderAlarms();
    expect(afterSettings).toHaveLength(2);
    expect(
      afterSettings.find((alarm) => alarm.name === alarmNameForJob(job.id))?.scheduledTime,
    ).toBe(local(2026, 12, 13, 9, 0).getTime());
    expect(
      afterSettings.find((alarm) => alarm.name === alarmNameForJob(stay.id))?.scheduledTime,
    ).toBe(local(2026, 12, 19, 9, 0).getTime());

    await chromeFake().storage.local.set({
      [jobKey(stay.id)]: {
        ...stay,
        reminder: { enabled: false, mode: "default", leadDays: 1, status: "scheduled" },
      },
    });
    await reconcileReminders(now);
    expect((await reminderAlarms()).map((alarm) => alarm.name)).toEqual([alarmNameForJob(job.id)]);

    await chromeFake().storage.local.remove(jobKey(job.id));
    await reconcileReminders(now);
    expect(await reminderAlarms()).toEqual([]);
    expect(chromeFake().notifications.clear).toHaveBeenCalledWith("jc:notif:move");
  });

  it("sends a missed notification once, and an on-time alarm only once", async () => {
    const deadline = { date: "2026-11-23", origin: "user" as const };
    const ideal = computeRemindAt(deadline, { enabled: true, mode: "default" }, settings, now);
    const missed = makeJob({
      id: "missed",
      title: "BI Intern",
      company: "Razorpay",
      deadline,
      reminder: {
        enabled: true,
        mode: "default",
        status: "scheduled",
        remindAt: ideal?.toISOString(),
      },
    });
    await storeJob(missed);
    await reconcileReminders(now);
    await reconcileReminders(now);

    const calls = chromeFake().notifications.calls();
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      id: "jc:notif:missed",
      title: "Missed reminder",
    });
    expect((await getJob(missed.id))?.reminder.status).toBe("missed");

    const upcoming = makeJob({
      id: "due",
      title: "Python Intern",
      company: "Freshworks",
      deadline: { date: "2026-11-30", origin: "user" },
      reminder: { enabled: true, mode: "default", status: "none" },
    });
    await chromeFake().storage.local.set({ [jobKey(upcoming.id)]: upcoming });
    await reconcileReminders(now);
    const alarm = (await reminderAlarms()).find(
      (item) => item.name === alarmNameForJob(upcoming.id),
    );
    expect(alarm?.scheduledTime).toBeDefined();
    await handleAlarm({ name: alarm!.name, scheduledTime: alarm!.scheduledTime! }, now);
    await handleAlarm({ name: alarm!.name, scheduledTime: alarm!.scheduledTime! }, now);

    const dueCalls = chromeFake()
      .notifications.calls()
      .filter((call) => call.id === "jc:notif:due");
    expect(dueCalls).toHaveLength(1);
    expect(dueCalls[0]?.title).toBe("Deadline reminder");
    expect((await getJob(upcoming.id))?.reminder.status).toBe("fired");
  });

  it("uses deadline-is-soon wording for a one-minute catch-up alarm", async () => {
    const nowSoon = local(2026, 11, 22, 15, 0);
    const job = makeJob({
      id: "soon",
      title: "Analyst",
      company: "Groww",
      deadline: { date: "2026-11-23", origin: "user" },
      reminder: { enabled: true, mode: "default", status: "none" },
    });
    await storeJob(job);
    await reconcileReminders(nowSoon);
    const alarm = (await reminderAlarms())[0];
    await handleAlarm({ name: alarm!.name, scheduledTime: alarm!.scheduledTime! }, nowSoon);
    expect(chromeFake().notifications.calls().at(-1)?.title).toBe("Deadline is soon");
  });

  it("opens the dashboard on the job when the notification is clicked", async () => {
    await handleNotificationClick("jc:notif:job-7");
    expect(chromeFake().tabs.create).toHaveBeenCalledWith({
      url: "chrome-extension://test-extension-id/dashboard.html#/job/job-7",
    });
    await handleNotificationClick("jc:notif:test");
    expect(chromeFake().tabs.create).toHaveBeenCalledTimes(1);
  });

  it("sends a test notification that is not tied to a job", async () => {
    await expect(sendTestNotification()).resolves.toEqual({ ok: true });
    expect(chromeFake().notifications.calls().at(-1)).toMatchObject({
      id: "jc:notif:test",
      title: "Job Clipper",
    });
  });

  it("reconciles from a job storage change and ignores other areas", async () => {
    const job = makeJob({
      id: "stored",
      deadline: { date: "2026-11-30", origin: "user" },
      reminder: { enabled: true, mode: "default", status: "none" },
    });
    await storeJob(job);
    expect(await handleStorageChanged({ "popupDraft:1": {} }, "session")).toBeUndefined();
    expect(await reminderAlarms()).toEqual([]);

    await handleStorageChanged({ [jobKey(job.id)]: { newValue: job } }, "local");
    expect(await reminderAlarms()).toHaveLength(1);
  });

  it("schedules the one-minute reminder only for a future deadline", async () => {
    const remindAt = local(2026, 11, 30, 9, 0).toISOString();
    const future = makeJob({
      id: "minute",
      deadline: { date: "2026-12-01", origin: "user" },
      reminder: { enabled: true, mode: "default", status: "scheduled", remindAt },
    });
    const undated = makeJob({ id: "none", deadline: null });
    await chromeFake().storage.local.set({
      [jobKey(future.id)]: future,
      [jobKey(undated.id)]: undated,
    });

    const updated = await scheduleReminderSoon(future.id, now);
    expect(updated.reminder.mode).toBe("default");
    expect(updated.reminder.customAt).toBeUndefined();
    expect(updated.reminder.status).toBe("scheduled");
    expect(updated.reminder.remindAt).toBe(remindAt);
    expect(new Date(updated.reminder.soonAt!).getTime() - now.getTime()).toBe(60_000);

    await expect(scheduleReminderSoon(undated.id, now)).rejects.toThrow(/deadline/i);
    await expect(scheduleReminderSoon(future.id, local(2026, 12, 1, 23, 58))).rejects.toThrow(
      /deadline/i,
    );
  });

  it("sends the one-minute reminder once and restores the saved schedule", async () => {
    const remindAt = local(2026, 11, 30, 9, 0).toISOString();
    const job = makeJob({
      id: "minute-restore",
      deadline: { date: "2026-12-01", origin: "user" },
      reminder: { enabled: true, mode: "default", status: "scheduled", remindAt },
    });
    await storeJob(job);
    await reconcileReminders(now);
    expect((await reminderAlarms())[0]?.scheduledTime).toBe(local(2026, 11, 30, 9, 0).getTime());

    await scheduleReminderSoon(job.id, now);
    await reconcileReminders(now);
    const soonAlarm = (await reminderAlarms())[0];
    expect(await reminderAlarms()).toHaveLength(1);
    expect(soonAlarm?.scheduledTime).toBe(now.getTime() + 60_000);

    const soon = new Date(now.getTime() + 60_000);
    await handleAlarm({ name: soonAlarm!.name, scheduledTime: soonAlarm!.scheduledTime }, soon);
    await handleAlarm({ name: soonAlarm!.name, scheduledTime: soonAlarm!.scheduledTime }, soon);

    expect(chromeFake().notifications.calls()).toHaveLength(1);
    expect(chromeFake().notifications.calls()[0]?.title).toBe("Deadline reminder");
    const after = await getJob(job.id);
    expect(after?.reminder.soonAt).toBeUndefined();
    expect(after?.reminder.mode).toBe("default");
    expect(after?.reminder.status).toBe("scheduled");
    expect(after?.reminder.remindAt).toBe(remindAt);

    await reconcileReminders(soon);
    await reconcileReminders(soon);
    expect(await reminderAlarms()).toHaveLength(1);
    expect((await reminderAlarms())[0]?.scheduledTime).toBe(local(2026, 11, 30, 9, 0).getTime());
    expect(chromeFake().notifications.calls()).toHaveLength(1);
  });

  it("delivers a wiped one-minute reminder once, then restores a custom schedule", async () => {
    const customAt = local(2026, 11, 28, 18, 0).toISOString();
    const job = makeJob({
      id: "minute-missed",
      deadline: { date: "2026-12-01", origin: "user" },
      reminder: {
        enabled: true,
        mode: "custom",
        customAt,
        status: "scheduled",
        remindAt: customAt,
      },
    });
    await storeJob(job);
    await scheduleReminderSoon(job.id, now);
    await reconcileReminders(now);
    await clearReminderAlarms();

    const later = new Date(now.getTime() + 120_000);
    await reconcileReminders(later);
    await reconcileReminders(later);

    expect(chromeFake().notifications.calls()).toEqual([
      expect.objectContaining({ id: "jc:notif:minute-missed", title: "Missed reminder" }),
    ]);
    const restored = await getJob(job.id);
    expect(restored?.reminder.soonAt).toBeUndefined();
    expect(restored?.reminder.mode).toBe("custom");
    expect(restored?.reminder.customAt).toBe(customAt);
    expect(restored?.reminder.status).toBe("scheduled");
    expect((await reminderAlarms())[0]?.scheduledTime).toBe(local(2026, 11, 28, 18, 0).getTime());
  });

  it("does not send the saved reminder again when the one-minute reminder follows a fired one", async () => {
    const remindAt = local(2026, 11, 29, 9, 0).toISOString();
    const job = makeJob({
      id: "after-fired",
      deadline: { date: "2026-11-30", origin: "user" },
      reminder: { enabled: true, mode: "default", status: "fired", remindAt, firedAt: remindAt },
    });
    await storeJob(job);
    await scheduleReminderSoon(job.id, now);
    await reconcileReminders(now);
    const alarm = (await reminderAlarms())[0];
    const soon = new Date(now.getTime() + 60_000);
    await handleAlarm({ name: alarm!.name, scheduledTime: alarm!.scheduledTime }, soon);
    await reconcileReminders(soon);
    await reconcileReminders(soon);

    expect(chromeFake().notifications.calls()).toHaveLength(1);
    expect(await reminderAlarms()).toEqual([]);
    const stored = await getJob(job.id);
    expect(stored?.reminder.status).toBe("fired");
    expect(stored?.reminder.remindAt).toBe(remindAt);
    expect(stored?.reminder.soonAt).toBeUndefined();
  });

  it("delivers a missed reminder once after Chrome drops its alarm", async () => {
    const deadline = { date: "2026-11-30", origin: "user" as const };
    const ideal = computeRemindAt(deadline, { enabled: true, mode: "default" }, settings, now);
    const job = makeJob({
      id: "restart",
      deadline,
      reminder: { enabled: true, mode: "default", status: "none" },
    });
    const already = makeJob({
      id: "already",
      deadline,
      reminder: {
        enabled: true,
        mode: "default",
        status: "fired",
        remindAt: ideal?.toISOString(),
        firedAt: ideal?.toISOString(),
      },
    });
    await storeJob(job);
    await chromeFake().storage.local.set({ [jobKey(already.id)]: already });
    await reconcileReminders(now);
    expect(await reminderAlarms()).toHaveLength(1);
    await clearReminderAlarms();

    const later = local(2026, 11, 29, 10, 0);
    await reconcileReminders(later);
    await reconcileReminders(later);
    await handleAlarm({ name: RECONCILE_ALARM_NAME }, later);

    const calls = chromeFake().notifications.calls();
    expect(calls.map((call) => call.id)).toEqual(["jc:notif:restart"]);
    expect(calls[0]?.title).toBe("Missed reminder");
    expect((await getJob(job.id))?.reminder.status).toBe("missed");
    expect(await reminderAlarms()).toEqual([]);
  });

  it("clears a notification when the job is deleted after its alarm has already fired", async () => {
    const job = makeJob({
      id: "gone",
      deadline: { date: "2026-12-01", origin: "user" },
      reminder: {
        enabled: true,
        mode: "default",
        status: "fired",
        remindAt: local(2026, 11, 30, 9, 0).toISOString(),
      },
    });
    await storeJob(job);
    const options = {
      type: "basic" as const,
      iconUrl: "icons/icon-128.png",
      title: "Deadline reminder",
      message: "Still visible",
    };
    await chromeFake().notifications.create("jc:notif:gone", options);
    await chromeFake().notifications.create("jc:notif:test", {
      ...options,
      title: "Job Clipper",
      message: "Test",
    });
    await chromeFake().storage.local.remove(jobKey(job.id));
    await reconcileReminders(now);

    expect(chromeFake().notifications.clear).toHaveBeenCalledWith("jc:notif:gone");
    expect(chromeFake().notifications.clear).not.toHaveBeenCalledWith("jc:notif:test");
    await expect(chromeFake().notifications.getAll()).resolves.toEqual({ "jc:notif:test": true });
    expect(await reminderAlarms()).toEqual([]);
  });
});
