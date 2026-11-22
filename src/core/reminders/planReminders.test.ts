import { describe, expect, it } from "vitest";
import { makeJob } from "../../../tests/factories";
import type { Settings } from "../model/types";
import {
  MAX_SCHEDULED_REMINDERS,
  SOON_DELAY_MS,
  alarmNameForJob,
  computeRemindAt,
} from "./computeRemindAt";
import { planReminders, type AlarmSnapshot } from "./planReminders";

const settings: Settings["reminders"] = { enabledByDefault: true, leadDays: 1, atTime: "09:00" };

function local(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function names(plan: { create: { name: string }[]; clear: { name: string }[] }): string[] {
  return [...plan.create.map((item) => item.name), ...plan.clear.map((item) => item.name)];
}

describe("planReminders", () => {
  const now = local(2026, 11, 22, 15, 0);
  const deadline = { date: "2026-11-30", origin: "user" as const };

  it("does not schedule a job with no deadline and clears a stale alarm", () => {
    const job = makeJob({ id: "plain", deadline: null });
    const stale: AlarmSnapshot = {
      name: alarmNameForJob(job.id),
      scheduledTime: now.getTime() + 86_400_000,
    };
    const plan = planReminders([job], now, [stale], settings);

    expect(plan.create).toEqual([]);
    expect(plan.notify).toEqual([]);
    expect(plan.clear).toEqual([{ name: stale.name, dismissNotification: true }]);
    expect(plan.updates).toEqual([]);
  });

  it("does not schedule an impossible date", () => {
    const job = makeJob({
      id: "bad-date",
      deadline: { date: "2026-02-30", origin: "user" },
      reminder: {
        enabled: true,
        mode: "default",
        status: "scheduled",
        remindAt: now.toISOString(),
      },
    });
    const plan = planReminders(
      [job],
      now,
      [{ name: alarmNameForJob(job.id), scheduledTime: now.getTime() + 60_000 }],
      settings,
    );
    expect(plan.create).toEqual([]);
    expect(plan.clear).toEqual([{ name: alarmNameForJob(job.id), dismissNotification: true }]);
    expect(plan.updates[0]?.reminder.status).toBe("none");
  });

  it("schedules a future deadline once, and a second plan does not duplicate the alarm", () => {
    const job = makeJob({
      id: "future",
      deadline,
      reminder: { enabled: true, mode: "default", status: "none" },
    });
    const first = planReminders([job], now, [], settings);
    expect(first.create).toEqual([
      {
        name: alarmNameForJob(job.id),
        jobId: job.id,
        when: local(2026, 11, 29, 9, 0).getTime(),
      },
    ]);
    expect(first.notify).toEqual([]);
    expect(new Set(names(first)).size).toBe(names(first).length);

    const scheduled = {
      ...job,
      reminder: first.updates[0]!.reminder,
    };
    const alarm: AlarmSnapshot = {
      name: alarmNameForJob(job.id),
      scheduledTime: first.create[0]!.when,
    };
    const second = planReminders([scheduled], now, [alarm], settings);
    expect(second.create).toEqual([]);
    expect(second.clear).toEqual([]);
    expect(second.notify).toEqual([]);
    expect(second.updates).toEqual([]);
  });

  it("reschedules when the deadline changes and cancels when it is cleared", () => {
    const job = makeJob({
      id: "edit",
      deadline,
      reminder: {
        enabled: true,
        mode: "default",
        status: "scheduled",
        remindAt: local(2026, 11, 29, 9, 0).toISOString(),
      },
    });
    const existing: AlarmSnapshot = {
      name: alarmNameForJob(job.id),
      scheduledTime: local(2026, 11, 29, 9, 0).getTime(),
    };
    const moved = planReminders(
      [{ ...job, deadline: { date: "2026-12-10", origin: "user" } }],
      now,
      [existing],
      settings,
    );
    expect(moved.create[0]?.when).toBe(local(2026, 12, 9, 9, 0).getTime());
    expect(moved.clear).toEqual([]);

    const cleared = planReminders([{ ...job, deadline: null }], now, [existing], settings);
    expect(cleared.create).toEqual([]);
    expect(cleared.clear).toEqual([{ name: existing.name, dismissNotification: true }]);
    expect(cleared.updates[0]?.reminder.status).toBe("none");
  });

  it("clears an alarm whose job was deleted", () => {
    const plan = planReminders(
      [],
      now,
      [{ name: alarmNameForJob("gone"), scheduledTime: now.getTime() + 86_400_000 }],
      settings,
    );
    expect(plan.clear).toEqual([{ name: alarmNameForJob("gone"), dismissNotification: true }]);
    expect(plan.create).toEqual([]);
  });

  it("marks a passed deadline expired and does not notify", () => {
    const job = makeJob({
      id: "closed",
      deadline: { date: "2026-11-20", origin: "user" },
      reminder: { enabled: true, mode: "default", status: "scheduled" },
    });
    const plan = planReminders(
      [job],
      now,
      [{ name: alarmNameForJob(job.id), scheduledTime: local(2026, 11, 19, 9, 0).getTime() }],
      settings,
    );
    expect(plan.notify).toEqual([]);
    expect(plan.create).toEqual([]);
    expect(plan.updates[0]?.reminder.status).toBe("expired");
    expect(plan.clear[0]?.dismissNotification).toBe(true);
  });

  it("catches up about a minute later when the ideal time has passed but the deadline has not", () => {
    const soonDeadline = { date: "2026-11-23", origin: "user" as const };
    const job = makeJob({
      id: "catch-up",
      deadline: soonDeadline,
      reminder: { enabled: true, mode: "default", status: "none" },
    });
    const plan = planReminders([job], now, [], settings);
    const ideal = computeRemindAt(soonDeadline, job.reminder, settings, now);
    expect(ideal && ideal.getTime()).toBeLessThan(now.getTime());
    expect(plan.create[0]?.when).toBe(now.getTime() + SOON_DELAY_MS);
    expect(plan.notify).toEqual([]);
    expect(plan.updates[0]?.reminder).toMatchObject({
      status: "scheduled",
      remindAt: ideal?.toISOString(),
    });

    const waiting = planReminders(
      [{ ...job, reminder: plan.updates[0]!.reminder }],
      now,
      [{ name: alarmNameForJob(job.id), scheduledTime: plan.create[0]!.when }],
      settings,
    );
    expect(waiting.create).toEqual([]);
    expect(waiting.notify).toEqual([]);
    expect(waiting.clear).toEqual([]);
  });

  it("notifies a missed reminder once when a scheduled alarm is gone and the deadline remains", () => {
    const soonDeadline = { date: "2026-11-23", origin: "user" as const };
    const ideal = computeRemindAt(soonDeadline, { enabled: true, mode: "default" }, settings, now);
    const job = makeJob({
      id: "missed",
      deadline: soonDeadline,
      reminder: {
        enabled: true,
        mode: "default",
        status: "scheduled",
        remindAt: ideal?.toISOString(),
      },
    });
    const first = planReminders([job], now, [], settings);
    expect(first.notify).toEqual([{ jobId: job.id, kind: "missed" }]);
    expect(first.create).toEqual([]);

    const delivered = { ...job, reminder: first.updates[0]!.reminder };
    const second = planReminders([delivered], now, [], settings);
    expect(second.notify).toEqual([]);
    expect(second.updates).toEqual([]);
  });

  it("does not notify again after a reminder has fired for the same time", () => {
    const ideal = local(2026, 11, 29, 9, 0).toISOString();
    const job = makeJob({
      id: "fired",
      deadline,
      reminder: {
        enabled: true,
        mode: "default",
        status: "fired",
        remindAt: ideal,
        firedAt: ideal,
      },
    });
    const plan = planReminders(
      [job],
      now,
      [{ name: alarmNameForJob(job.id), scheduledTime: local(2026, 11, 29, 9, 0).getTime() }],
      settings,
    );
    expect(plan.notify).toEqual([]);
    expect(plan.create).toEqual([]);
    expect(plan.clear).toEqual([{ name: alarmNameForJob(job.id), dismissNotification: false }]);
  });

  it("rejects a custom reminder that is not before the deadline", () => {
    const job = makeJob({
      id: "late-custom",
      deadline: { date: "2026-11-30", time: "18:00", origin: "user" },
      reminder: {
        enabled: true,
        mode: "custom",
        customAt: local(2026, 12, 1, 9, 0).toISOString(),
        status: "scheduled",
      },
    });
    const plan = planReminders(
      [job],
      now,
      [{ name: alarmNameForJob(job.id), scheduledTime: now.getTime() + 86_400_000 }],
      settings,
    );
    expect(plan.create).toEqual([]);
    expect(plan.notify).toEqual([]);
    expect(plan.updates[0]?.reminder.status).toBe("none");
  });

  it("schedules only the soonest reminders when there are more than the alarm cap", () => {
    const jobs = Array.from({ length: MAX_SCHEDULED_REMINDERS + 1 }, (_, index) => {
      const when = new Date(local(2026, 11, 23, 0, 0).getTime() + index * 60_000);
      return makeJob({
        id: `cap-${String(index).padStart(3, "0")}`,
        deadline: { date: "2026-12-31", origin: "user" },
        reminder: { enabled: true, mode: "custom", customAt: when.toISOString(), status: "none" },
      });
    });
    const plan = planReminders(jobs, now, [], settings);
    expect(plan.create).toHaveLength(MAX_SCHEDULED_REMINDERS);
    expect(plan.create.some((item) => item.jobId === "cap-400")).toBe(false);
    expect(plan.create[0]?.jobId).toBe("cap-000");
    expect(plan.updates.find((item) => item.id === "cap-400")?.reminder.status).toBe("scheduled");
    expect(new Set(plan.create.map((item) => item.name)).size).toBe(plan.create.length);
  });

  it("arms a one-minute reminder without replacing the saved schedule", () => {
    const remindAt = local(2026, 11, 29, 9, 0).toISOString();
    const soonAt = new Date(now.getTime() + 60_000).toISOString();
    const job = makeJob({
      id: "overlay",
      deadline,
      reminder: { enabled: true, mode: "default", status: "scheduled", remindAt, soonAt },
    });
    const plan = planReminders(
      [job],
      now,
      [{ name: alarmNameForJob(job.id), scheduledTime: local(2026, 11, 29, 9, 0).getTime() }],
      settings,
    );
    expect(plan.notify).toEqual([]);
    expect(plan.clear).toEqual([]);
    expect(plan.updates).toEqual([]);
    expect(plan.create).toEqual([
      { name: alarmNameForJob(job.id), jobId: job.id, when: now.getTime() + 60_000 },
    ]);
  });

  it("restores a custom reminder after the one-minute reminder is missed", () => {
    const customAt = local(2026, 11, 28, 18, 0).toISOString();
    const job = makeJob({
      id: "custom-back",
      deadline,
      reminder: {
        enabled: true,
        mode: "custom",
        customAt,
        status: "scheduled",
        remindAt: customAt,
        soonAt: new Date(now.getTime() - 1_000).toISOString(),
      },
    });
    const first = planReminders([job], now, [], settings);
    expect(first.notify).toEqual([{ jobId: job.id, kind: "probe" }]);
    expect(first.create[0]?.when).toBe(local(2026, 11, 28, 18, 0).getTime());
    expect(first.updates[0]?.reminder.soonAt).toBeUndefined();
    expect(first.updates[0]?.reminder).toMatchObject({
      mode: "custom",
      customAt,
      status: "scheduled",
      remindAt: customAt,
    });

    const restored = { ...job, reminder: first.updates[0]!.reminder };
    const second = planReminders(
      [restored],
      now,
      [{ name: alarmNameForJob(job.id), scheduledTime: first.create[0]!.when }],
      settings,
    );
    expect(second.notify).toEqual([]);
    expect(second.create).toEqual([]);
    expect(second.clear).toEqual([]);
  });

  it("notifies once when the one-minute reminder and the saved reminder are both already due", () => {
    const soonDeadline = { date: "2026-11-23", origin: "user" as const };
    const ideal = computeRemindAt(soonDeadline, { enabled: true, mode: "default" }, settings, now);
    const job = makeJob({
      id: "both-due",
      deadline: soonDeadline,
      reminder: {
        enabled: true,
        mode: "default",
        status: "scheduled",
        remindAt: ideal?.toISOString(),
        soonAt: new Date(now.getTime() - 60_000).toISOString(),
      },
    });
    const plan = planReminders([job], now, [], settings);
    expect(plan.notify).toEqual([{ jobId: job.id, kind: "missed" }]);
    expect(plan.create).toEqual([]);
    expect(plan.updates[0]?.reminder.status).toBe("missed");
    expect(plan.updates[0]?.reminder.soonAt).toBeUndefined();
  });

  it("does not arm the saved reminder again when it already fired before the one-minute reminder", () => {
    const remindAt = local(2026, 11, 29, 9, 0).toISOString();
    const job = makeJob({
      id: "fired-then-soon",
      deadline,
      reminder: {
        enabled: true,
        mode: "default",
        status: "fired",
        remindAt,
        firedAt: remindAt,
        soonAt: new Date(now.getTime() - 1_000).toISOString(),
      },
    });
    const plan = planReminders([job], now, [], settings);
    expect(plan.notify).toEqual([{ jobId: job.id, kind: "probe" }]);
    expect(plan.create).toEqual([]);
    expect(plan.updates[0]?.reminder.status).toBe("fired");
    expect(plan.updates[0]?.reminder.remindAt).toBe(remindAt);
    expect(plan.updates[0]?.reminder.soonAt).toBeUndefined();
  });

  it("drops the one-minute alarm when the deadline has passed", () => {
    const job = makeJob({
      id: "soon-passed",
      deadline: { date: "2026-11-22", time: "14:00", origin: "user" },
      reminder: {
        enabled: true,
        mode: "default",
        status: "scheduled",
        soonAt: new Date(now.getTime() + 60_000).toISOString(),
      },
    });
    const name = alarmNameForJob(job.id);
    const plan = planReminders(
      [job],
      now,
      [{ name, scheduledTime: now.getTime() + 60_000 }],
      settings,
    );
    expect(plan.create).toEqual([]);
    expect(plan.notify).toEqual([]);
    expect(plan.clear).toEqual([{ name, dismissNotification: true }]);
    expect(plan.updates[0]?.reminder.status).toBe("expired");
    expect(plan.updates[0]?.reminder.soonAt).toBeUndefined();
  });

  it("clears a one-minute alarm when the reminder is turned off", () => {
    const job = makeJob({
      id: "soon-off",
      deadline,
      reminder: {
        enabled: false,
        mode: "default",
        status: "scheduled",
        soonAt: new Date(now.getTime() + 60_000).toISOString(),
      },
    });
    const name = alarmNameForJob(job.id);
    const plan = planReminders(
      [job],
      now,
      [{ name, scheduledTime: now.getTime() + 60_000 }],
      settings,
    );
    expect(plan.create).toEqual([]);
    expect(plan.notify).toEqual([]);
    expect(plan.clear).toEqual([{ name, dismissNotification: true }]);
    expect(plan.updates[0]?.reminder.soonAt).toBeUndefined();
    expect(plan.updates[0]?.reminder.status).toBe("none");
  });

  function cappedJobs() {
    return Array.from({ length: MAX_SCHEDULED_REMINDERS + 1 }, (_, index) => {
      const when = new Date(local(2026, 11, 23, 0, 0).getTime() + index * 60_000);
      return makeJob({
        id: `cap-${String(index).padStart(3, "0")}`,
        deadline: { date: "2026-12-31", origin: "user" },
        reminder: { enabled: true, mode: "custom", customAt: when.toISOString(), status: "none" },
      });
    });
  }

  it("clears a stale alarm on a job past the cap without marking it missed", () => {
    const excluded = alarmNameForJob("cap-400");
    const plan = planReminders(
      cappedJobs(),
      now,
      [{ name: excluded, scheduledTime: now.getTime() + 86_400_000 }],
      settings,
    );
    expect(plan.clear).toEqual([{ name: excluded, dismissNotification: false }]);
    expect(plan.notify).toEqual([]);
    expect(plan.create.some((item) => item.jobId === "cap-400")).toBe(false);
  });

  it("schedules the next reminder when one capped job no longer needs an alarm", () => {
    const jobs = cappedJobs();
    const first = planReminders(jobs, now, [], settings);
    const scheduled = jobs.map((job) => {
      const update = first.updates.find((item) => item.id === job.id);
      return update ? { ...job, reminder: update.reminder } : job;
    });
    const dropped = scheduled.map((job) =>
      job.id === "cap-000"
        ? {
            ...job,
            reminder: { ...job.reminder, status: "fired" as const, firedAt: job.reminder.remindAt },
          }
        : job,
    );
    const next = planReminders(
      dropped,
      now,
      first.create.map((item) => ({ name: item.name, scheduledTime: item.when })),
      settings,
    );
    expect(next.create.map((item) => item.jobId)).toEqual(["cap-400"]);
    expect(next.notify).toEqual([]);
    expect(next.clear).toEqual([{ name: alarmNameForJob("cap-000"), dismissNotification: false }]);
  });

  it("turns reminders off without an alarm when the job preference is off", () => {
    const job = makeJob({
      id: "off",
      deadline,
      reminder: { enabled: false, mode: "default", status: "scheduled" },
    });
    const plan = planReminders(
      [job],
      now,
      [{ name: alarmNameForJob(job.id), scheduledTime: local(2026, 11, 29, 9, 0).getTime() }],
      settings,
    );
    expect(plan.create).toEqual([]);
    expect(plan.updates[0]?.reminder).toMatchObject({ enabled: false, status: "none" });
  });
});
