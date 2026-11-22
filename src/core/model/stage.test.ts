import { describe, expect, it } from "vitest";
import { makeJob } from "../../../tests/factories";
import {
  InvalidInterviewDateError,
  InvalidStageError,
  applyInterviewDate,
  applyStageMove,
  groupByStage,
  stageFromDropId,
} from "./stage";

const now = new Date("2026-11-22T09:30:00.000Z");

describe("applyStageMove", () => {
  it("moves Saved to Applied, records the date, and appends history", () => {
    const job = makeJob({ title: "Data Analyst Intern", notes: "Portfolio" });
    const next = applyStageMove(job, "applied", now);

    expect(next).toMatchObject({
      title: "Data Analyst Intern",
      notes: "Portfolio",
      status: "applied",
      appliedAt: now.toISOString(),
      updatedAt: now.toISOString(),
      deadline: null,
    });
    expect(next.result).toBeUndefined();
    expect(next.statusHistory.map((entry) => entry.status)).toEqual(["saved", "applied"]);
    expect(next.savedAt).toBe(job.savedAt);
  });

  it("keeps an existing applied date and does not invent an interview date", () => {
    const job = makeJob({
      status: "applied",
      appliedAt: "2026-11-01T00:00:00.000Z",
      statusHistory: [{ status: "saved", at: "2026-11-01T00:00:00.000Z" }],
    });

    const next = applyStageMove(job, "interview", now);

    expect(next.appliedAt).toBe("2026-11-01T00:00:00.000Z");
    expect(next.interviewAt).toBeUndefined();
    expect(next.status).toBe("interview");
  });

  it("records a result outcome and clears it when the card leaves Result", () => {
    const saved = makeJob();
    const resulted = applyStageMove(saved, "result", now, "selected");
    expect(resulted.result).toBe("selected");
    expect(resulted.statusHistory.at(-1)).toMatchObject({ status: "result", result: "selected" });

    const unset = applyStageMove(resulted, "result", now, null);
    expect(unset.result).toBeUndefined();

    const back = applyStageMove(resulted, "saved", now);
    expect(back.status).toBe("saved");
    expect(back.result).toBeUndefined();
    expect(back.appliedAt).toBeUndefined();
  });

  it("leaves the job untouched when the stage and outcome do not change", () => {
    const job = makeJob({ status: "interview" });
    expect(applyStageMove(job, "interview", now)).toBe(job);
  });

  it("rejects stage and outcome values outside the board", () => {
    const job = makeJob();
    for (const value of ["", "Applied", "offer", "hired", "withdrawn"]) {
      expect(() => applyStageMove(job, value, now)).toThrow(InvalidStageError);
      expect(() => applyStageMove(job, value, now)).toThrowError(
        expect.objectContaining({ value }),
      );
    }
    expect(() => applyStageMove(job, "result", now, "maybe")).toThrow(InvalidStageError);
    expect(applyStageMove(job, "applied", now, "selected").result).toBeUndefined();
  });
});

describe("applyInterviewDate", () => {
  it("stores a real calendar date and rejects an impossible one", () => {
    const job = makeJob({ status: "interview" });
    const next = applyInterviewDate(job, "2026-12-02", now);
    expect(next.status).toBe("interview");
    expect(next.interviewAt).toBeDefined();
    expect(new Date(next.interviewAt!).getDate()).toBe(2);

    expect(() => applyInterviewDate(job, "2026-02-30", now)).toThrow(InvalidInterviewDateError);
    expect(() => applyInterviewDate(job, "", now)).toThrow(InvalidInterviewDateError);
  });
});

describe("stageFromDropId and groupByStage", () => {
  it("accepts only the four column ids", () => {
    expect(stageFromDropId("saved")).toBe("saved");
    expect(stageFromDropId("result")).toBe("result");
    expect(stageFromDropId("Applied")).toBeNull();
    expect(stageFromDropId("offer")).toBeNull();
    expect(stageFromDropId(1)).toBeNull();
    expect(stageFromDropId(null)).toBeNull();
  });

  it("groups by stage and orders each column by the approaching deadline", () => {
    const later = makeJob({
      status: "saved",
      title: "Later",
      deadline: { date: "2026-12-20", origin: "user" },
    });
    const sooner = makeJob({
      status: "saved",
      title: "Sooner",
      deadline: { date: "2026-11-25", origin: "user" },
    });
    const undated = makeJob({ status: "saved", title: "Undated" });
    const applied = makeJob({ status: "applied", title: "Sent" });

    const groups = groupByStage([later, undated, applied, sooner]);

    expect(groups.saved.map((job) => job.title)).toEqual(["Sooner", "Later", "Undated"]);
    expect(groups.applied.map((job) => job.title)).toEqual(["Sent"]);
    expect(groups.interview).toEqual([]);
    expect(groups.result).toEqual([]);
  });

  it("skips a stored status that is not a board stage", () => {
    const job = makeJob();
    const corrupt = { ...job, status: "offer" } as unknown as typeof job;
    expect(groupByStage([corrupt]).saved).toEqual([]);
  });
});
