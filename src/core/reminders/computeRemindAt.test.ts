import { describe, expect, it } from "vitest";
import type { Settings } from "../model/types";
import { deadlineEnd, computeRemindAt, type ReminderChoice } from "./computeRemindAt";

const settings: Settings["reminders"] = { enabledByDefault: true, leadDays: 1, atTime: "09:00" };
const on: ReminderChoice = { enabled: true, mode: "default" };

function local(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): Date {
  return new Date(year, month - 1, day, hour, minute, second, 0);
}

describe("computeRemindAt", () => {
  const now = local(2026, 11, 22, 15, 0);

  it("returns null when there is no deadline, the date is impossible, or reminders are off", () => {
    expect(computeRemindAt(null, on, settings, now)).toBeNull();
    expect(computeRemindAt({ date: "2026-02-30", origin: "user" }, on, settings, now)).toBeNull();
    expect(
      computeRemindAt({ date: "2026-11-30", time: "25:99", origin: "user" }, on, settings, now),
    ).toBeNull();
    expect(
      computeRemindAt(
        { date: "2026-11-30", origin: "user" },
        { ...on, enabled: false },
        settings,
        now,
      ),
    ).toBeNull();
  });

  it("returns null once the deadline has passed, including across local midnight", () => {
    const deadline = { date: "2026-11-22", origin: "user" as const };
    expect(computeRemindAt(deadline, on, settings, local(2026, 11, 22, 23, 30))).not.toBeNull();
    expect(computeRemindAt(deadline, on, settings, local(2026, 11, 22, 23, 59, 30))).toBeNull();
    expect(computeRemindAt(deadline, on, settings, local(2026, 11, 23, 0, 5))).toBeNull();
    expect(
      computeRemindAt(
        { date: "2026-11-23", origin: "user" },
        on,
        settings,
        local(2026, 11, 23, 0, 5),
      ),
    ).not.toBeNull();
  });

  it("uses the local calendar: 1 day before at 09:00, not a UTC shift of the date", () => {
    const end = deadlineEnd({ date: "2026-11-22", origin: "user" });
    expect(end?.getFullYear()).toBe(2026);
    expect(end?.getMonth()).toBe(10);
    expect(end?.getDate()).toBe(22);
    expect(end?.getHours()).toBe(23);
    expect(end?.getMinutes()).toBe(59);

    const remind = computeRemindAt({ date: "2026-11-30", origin: "user" }, on, settings, now);
    expect(remind).toEqual(local(2026, 11, 29, 9, 0));
  });

  it("honours same-day, a per-job lead and a per-job time", () => {
    const deadline = { date: "2026-11-30", origin: "user" as const };
    expect(computeRemindAt(deadline, { ...on, leadDays: 0 }, settings, now)).toEqual(
      local(2026, 11, 30, 9, 0),
    );
    expect(
      computeRemindAt(deadline, { ...on, leadDays: 7, atTime: "18:30" }, settings, now),
    ).toEqual(local(2026, 11, 23, 18, 30));
  });

  it("keeps 09:00 local across a month boundary and a leap day", () => {
    expect(
      computeRemindAt(
        { date: "2026-03-01", origin: "user" },
        on,
        settings,
        local(2026, 2, 1, 9, 0),
      ),
    ).toEqual(local(2026, 2, 28, 9, 0));
    expect(
      computeRemindAt(
        { date: "2028-03-01", origin: "user" },
        on,
        settings,
        local(2028, 2, 1, 9, 0),
      ),
    ).toEqual(local(2028, 2, 29, 9, 0));
    expect(
      computeRemindAt(
        { date: "2026-03-09", origin: "user" },
        { ...on, leadDays: 1, atTime: "09:00" },
        settings,
        local(2026, 3, 1, 12, 0),
      )?.getHours(),
    ).toBe(9);
  });

  it("accepts a custom time only when it is before the deadline", () => {
    const deadline = { date: "2026-11-30", time: "18:00", origin: "user" as const };
    const custom = local(2026, 11, 30, 9, 0);
    expect(
      computeRemindAt(
        deadline,
        { enabled: true, mode: "custom", customAt: custom.toISOString() },
        settings,
        now,
      ),
    ).toEqual(custom);
    expect(
      computeRemindAt(
        deadline,
        { enabled: true, mode: "custom", customAt: local(2026, 11, 30, 18, 0).toISOString() },
        settings,
        now,
      ),
    ).toBeNull();
    expect(computeRemindAt(deadline, { enabled: true, mode: "custom" }, settings, now)).toBeNull();
    expect(
      computeRemindAt(
        deadline,
        { enabled: true, mode: "custom", customAt: "not-a-date" },
        settings,
        now,
      ),
    ).toBeNull();
  });
});
