import { waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { chromeFake } from "../../tests/fakes/chrome";
import { makeJob } from "../../tests/factories";
import type { JobApplication } from "../core/model/types";
import { jobKey } from "./chromeStorage";
import { jobToForm } from "../core/model/jobForm";
import {
  createJob,
  deleteJob,
  DuplicateJobError,
  InvalidStageError,
  JobConflictError,
  listJobs,
  ManualEntryValidationError,
  moveJob,
  recordInterviewDate,
  subscribeJobs,
  updateJob,
} from "./jobRepository";

const entry = {
  title: "Python Developer Intern",
  company: "Freshworks",
  url: "https://example.com/jobs/42",
  deadlineDate: "",
  deadlineTime: "",
};

describe("createJob", () => {
  it("stores the job under job:<uuid> in chrome.storage.local", async () => {
    const uuid = "11111111-2222-4333-8444-555555555555";
    vi.spyOn(crypto, "randomUUID").mockReturnValue(uuid);

    const job = await createJob(entry, new Date("2026-11-22T06:00:00.000Z"));

    expect(job.id).toBe(uuid);
    expect(chromeFake().storage.local.snapshot()).toEqual({ [`job:${uuid}`]: job });
    expect(job).toMatchObject({
      title: "Python Developer Intern",
      company: "Freshworks",
      url: "https://example.com/jobs/42",
      status: "saved",
      savedAt: "2026-11-22T06:00:00.000Z",
    });
  });

  it("persists a missing deadline as null", async () => {
    const job = await createJob(entry);
    const stored = chromeFake().storage.local.snapshot()[jobKey(job.id)] as JobApplication;
    expect(stored.deadline).toBeNull();
  });

  it("persists a provided deadline", async () => {
    const job = await createJob({ ...entry, deadlineDate: "2026-12-01", deadlineTime: "23:00" });
    expect(job.deadline).toEqual({ date: "2026-12-01", time: "23:00", origin: "user" });
  });

  it("rejects invalid input without writing anything", async () => {
    await expect(
      createJob({ ...entry, title: "", url: "javascript:alert(1)" }),
    ).rejects.toBeInstanceOf(ManualEntryValidationError);
    expect(chromeFake().storage.local.snapshot()).toEqual({});
  });
});

describe("updateJob and deleteJob", () => {
  it("persists an edit and removes the job after deletion", async () => {
    const created = await createJob(entry, new Date("2026-11-22T06:00:00.000Z"));
    const updated = await updateJob(
      created.id,
      { ...jobToForm(created), title: "Edited title", notes: "Bring a portfolio" },
      new Date("2026-11-22T07:00:00.000Z"),
      { expectedUpdatedAt: created.updatedAt },
    );

    expect(updated.title).toBe("Edited title");
    expect(updated.notes).toBe("Bring a portfolio");
    expect(updated.savedAt).toBe(created.savedAt);
    expect((await listJobs())[0]).toMatchObject({ title: "Edited title", deadline: null });

    await deleteJob(created.id);
    expect(await listJobs()).toEqual([]);
  });

  it("refuses a second application with the same link unless saving is intentional", async () => {
    await createJob(entry);
    await expect(createJob({ ...entry, title: "Same link, new title" })).rejects.toBeInstanceOf(
      DuplicateJobError,
    );
    expect(await listJobs()).toHaveLength(1);

    const second = await createJob({ ...entry, title: "Same link, new title" }, new Date(), {
      allowDuplicate: true,
    });
    const ids = (await listJobs()).map((job) => job.id);
    expect(ids).toHaveLength(2);
    expect(ids).toContain(second.id);
    expect(new Set(ids).size).toBe(2);
  });

  it("does not overwrite a different application when an edit reuses its link", async () => {
    const first = await createJob(entry);
    const second = await createJob({
      ...entry,
      url: "https://example.com/jobs/43",
      title: "Other role",
    });

    await expect(
      updateJob(second.id, { ...jobToForm(second), url: entry.url }),
    ).rejects.toBeInstanceOf(DuplicateJobError);

    const stored = await listJobs();
    expect(stored.find((job) => job.id === first.id)?.title).toBe(entry.title);
    expect(stored.find((job) => job.id === second.id)?.url).toBe("https://example.com/jobs/43");
  });

  it("refuses a stale edit and leaves the newer copy in storage", async () => {
    const created = await createJob(entry, new Date("2026-11-22T06:00:00.000Z"));
    const newer = await updateJob(
      created.id,
      { ...jobToForm(created), notes: "Newer note" },
      new Date("2026-11-22T08:00:00.000Z"),
    );

    await expect(
      updateJob(created.id, { ...jobToForm(created), notes: "Stale note" }, new Date(), {
        expectedUpdatedAt: created.updatedAt,
      }),
    ).rejects.toBeInstanceOf(JobConflictError);

    expect((await listJobs())[0]).toMatchObject({
      notes: "Newer note",
      updatedAt: newer.updatedAt,
    });
  });
});

describe("moveJob", () => {
  it("persists the new stage so a later read, as on refresh, sees it", async () => {
    const created = await createJob(entry, new Date("2026-11-22T06:00:00.000Z"));
    const moved = await moveJob(created.id, "applied", new Date("2026-11-22T09:00:00.000Z"), {
      expectedUpdatedAt: created.updatedAt,
    });

    expect(moved.status).toBe("applied");
    expect(moved.appliedAt).toBe("2026-11-22T09:00:00.000Z");
    const stored = (await listJobs())[0];
    expect(stored).toMatchObject({
      id: created.id,
      title: created.title,
      status: "applied",
      deadline: null,
    });
    expect(stored?.statusHistory.map((item) => item.status)).toEqual(["saved", "applied"]);

    const again = await moveJob(created.id, "applied", new Date("2026-11-22T10:00:00.000Z"));
    expect(again.updatedAt).toBe(moved.updatedAt);
    expect(chromeFake().storage.local.snapshot()[jobKey(created.id)]).toEqual(moved);
  });

  it("rejects an invalid stage and leaves storage unchanged", async () => {
    const created = await createJob(entry);
    const before = chromeFake().storage.local.snapshot();

    await expect(moveJob(created.id, "offer")).rejects.toBeInstanceOf(InvalidStageError);
    await expect(moveJob(created.id, "Applied")).rejects.toBeInstanceOf(InvalidStageError);
    await expect(
      moveJob(created.id, "result", new Date(), { result: "maybe" }),
    ).rejects.toBeInstanceOf(InvalidStageError);

    expect(chromeFake().storage.local.snapshot()).toEqual(before);
    expect((await listJobs())[0]?.status).toBe("saved");
  });

  it("refuses a stale stage change after another edit", async () => {
    const created = await createJob(entry, new Date("2026-11-22T06:00:00.000Z"));
    const edited = await updateJob(
      created.id,
      { ...jobToForm(created), notes: "From the other window" },
      new Date("2026-11-22T08:00:00.000Z"),
    );

    await expect(
      moveJob(created.id, "interview", new Date(), { expectedUpdatedAt: created.updatedAt }),
    ).rejects.toBeInstanceOf(JobConflictError);

    expect((await listJobs())[0]).toMatchObject({
      status: "saved",
      notes: "From the other window",
      updatedAt: edited.updatedAt,
    });
  });

  it("stores an interview date without leaving Interview", async () => {
    const created = await createJob(entry);
    const interviewing = await moveJob(created.id, "interview");
    const dated = await recordInterviewDate(created.id, "2026-12-04", new Date(), {
      expectedUpdatedAt: interviewing.updatedAt,
    });

    expect(dated.status).toBe("interview");
    expect(dated.interviewAt).toBeDefined();
    expect((await listJobs())[0]?.interviewAt).toBe(dated.interviewAt);

    await expect(recordInterviewDate(created.id, "2026-02-31")).rejects.toThrow(
      /real calendar date/i,
    );
    expect((await listJobs())[0]?.interviewAt).toBe(dated.interviewAt);
  });
});

describe("listJobs", () => {
  it("returns only jobs, most recently saved first", async () => {
    const older = makeJob({ savedAt: "2026-11-01T00:00:00.000Z" });
    const newer = makeJob({ savedAt: "2026-11-20T00:00:00.000Z" });
    await chromeFake().storage.local.set({
      [jobKey(older.id)]: older,
      [jobKey(newer.id)]: newer,
      settings: { reminders: {} },
      schemaVersion: 1,
    });

    const jobs = await listJobs();

    expect(jobs.map((job) => job.id)).toEqual([newer.id, older.id]);
  });

  it("returns an empty list when nothing is saved", async () => {
    expect(await listJobs()).toEqual([]);
  });
});

describe("subscribeJobs", () => {
  it("emits the current list, then again when a job is saved elsewhere", async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeJobs(listener);

    await waitFor(() => expect(listener).toHaveBeenCalledWith([]));

    // Simulates the popup writing a job while the dashboard is open.
    const job = makeJob();
    await chromeFake().storage.local.set({ [jobKey(job.id)]: job });

    await waitFor(() => expect(listener).toHaveBeenLastCalledWith([job]));
    unsubscribe();
  });

  it("ignores non-job keys and session storage", async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeJobs(listener);
    await waitFor(() => expect(listener).toHaveBeenCalledTimes(1));

    await chromeFake().storage.local.set({ settings: {} });
    await chromeFake().storage.session.set({ "popupDraft:1": {} });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("stops emitting and removes its listener after unsubscribe", async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeJobs(listener);
    await waitFor(() => expect(listener).toHaveBeenCalledTimes(1));
    expect(chromeFake().storage.onChanged.size).toBe(1);

    unsubscribe();
    await createJob(entry);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(chromeFake().storage.onChanged.size).toBe(0);
  });
});
