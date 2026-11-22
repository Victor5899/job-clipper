import { describe, expect, it } from "vitest";
import { makeJob } from "../../../tests/factories";
import { calendarEntries, dayKey, jobsWithoutDeadline, monthMatrix } from "./calendar";

describe("calendar entries", () => {
  it("places a deadline on its local date and leaves deadline-less jobs off the grid", () => {
    const dated = makeJob({
      id: "dated",
      title: "Data Engineer Intern",
      deadline: { date: "2026-11-25", origin: "user" },
      interviewAt: new Date(2026, 10, 26, 12, 0, 0).toISOString(),
      reminder: {
        enabled: true,
        mode: "default",
        status: "scheduled",
        remindAt: new Date(2026, 10, 24, 9, 0, 0).toISOString(),
      },
    });
    const undated = makeJob({ id: "undated", title: "SQL Analyst", deadline: null });
    const entries = calendarEntries([dated, undated]);

    expect(entries.map((entry) => `${entry.kind}:${entry.day}`)).toEqual([
      "reminder:2026-11-24",
      "deadline:2026-11-25",
      "interview:2026-11-26",
    ]);
    expect(entries.some((entry) => entry.jobId === "undated")).toBe(false);
    expect(jobsWithoutDeadline([dated, undated]).map((job) => job.id)).toEqual(["undated"]);
  });

  it("ignores an impossible deadline and builds a Monday-first month", () => {
    const job = makeJob({ deadline: { date: "2026-02-30", origin: "user" } });
    expect(calendarEntries([job])).toEqual([]);
    const days = monthMatrix(new Date(2026, 10, 1));
    expect(days).toHaveLength(42);
    expect(dayKey(days[0]!)).toBe("2026-10-26");
    expect(days[0]!.getDay()).toBe(1);
  });
});
