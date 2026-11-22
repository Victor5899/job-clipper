import { describe, expect, it } from "vitest";
import { makeJob } from "../../../tests/factories";
import { computeOverviewStats, CHART_WEEKS } from "./overview";

// Wednesday 25 Nov 2026, 10:00 local time. The week starts Monday 23 Nov.
const now = new Date("2026-11-25T10:00:00");

describe("computeOverviewStats", () => {
  it("returns zeros for no jobs, never sample data", () => {
    const stats = computeOverviewStats([], now);
    expect(stats).toMatchObject({
      tracked: 0,
      active: 0,
      savedThisWeek: 0,
      appliedThisWeek: 0,
      interviews: 0,
      dueIn7Days: 0,
      noDeadlineCount: 0,
      upcomingDeadlines: [],
      recent: [],
    });
    expect(stats.weeklySaves).toHaveLength(CHART_WEEKS);
    expect(stats.weeklySaves.every((week) => week.count === 0)).toBe(true);
  });

  it("derives every statistic from the stored jobs", () => {
    const jobs = [
      makeJob({ savedAt: "2026-11-24T09:00:00", deadline: { date: "2026-11-27", origin: "user" } }),
      makeJob({ savedAt: "2026-11-23T09:00:00", deadline: null }),
      makeJob({
        status: "applied",
        savedAt: "2026-11-10T09:00:00",
        appliedAt: "2026-11-24T12:00:00",
        deadline: { date: "2026-12-10", origin: "user" },
      }),
      makeJob({ status: "interview", savedAt: "2026-11-02T09:00:00", deadline: null }),
      makeJob({
        status: "result",
        result: "rejected",
        savedAt: "2026-10-01T09:00:00",
        deadline: { date: "2026-11-26", origin: "user" },
      }),
    ];

    const stats = computeOverviewStats(jobs, now);

    expect(stats.tracked).toBe(5);
    expect(stats.active).toBe(4);
    expect(stats.savedThisWeek).toBe(2);
    expect(stats.appliedThisWeek).toBe(1);
    expect(stats.interviews).toBe(1);
    // Only the active job due 27 Nov counts; the Result job and the 10 Dec job do not.
    expect(stats.dueIn7Days).toBe(1);
    expect(stats.noDeadlineCount).toBe(2);
    expect(stats.byStatus).toEqual({ saved: 2, applied: 1, interview: 1, result: 1 });
    expect(stats.recent.map((job) => job.savedAt)[0]).toBe("2026-11-24T09:00:00");
    expect(stats.weeklySaves.at(-1)?.count).toBe(2);
    expect(stats.weeklySaves.reduce((sum, week) => sum + week.count, 0)).toBe(4);
  });

  it("orders upcoming deadlines soonest first and ignores past and far-off ones", () => {
    const jobs = [
      makeJob({ title: "Later", deadline: { date: "2026-12-05", origin: "user" } }),
      makeJob({ title: "Passed", deadline: { date: "2026-11-24", origin: "user" } }),
      makeJob({
        title: "Today evening",
        deadline: { date: "2026-11-25", time: "18:00", origin: "user" },
      }),
      makeJob({ title: "Too far", deadline: { date: "2026-12-20", origin: "user" } }),
      makeJob({
        title: "Earlier today",
        deadline: { date: "2026-11-25", time: "08:00", origin: "user" },
      }),
    ];

    const stats = computeOverviewStats(jobs, now);

    expect(stats.upcomingDeadlines.map((entry) => entry.job.title)).toEqual([
      "Today evening",
      "Later",
    ]);
    expect(stats.upcomingDeadlines[0]?.daysLeft).toBe(0);
    expect(stats.dueIn7Days).toBe(1);
  });

  it("treats a date-only deadline as ending at 23:59 that day", () => {
    const stats = computeOverviewStats(
      [makeJob({ deadline: { date: "2026-11-25", origin: "user" } })],
      new Date("2026-11-25T23:30:00"),
    );
    expect(stats.upcomingDeadlines).toHaveLength(1);
  });
});
