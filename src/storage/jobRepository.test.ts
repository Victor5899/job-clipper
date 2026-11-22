import { waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { chromeFake } from "../../tests/fakes/chrome";
import { makeJob } from "../../tests/factories";
import type { JobApplication } from "../core/model/types";
import { jobKey } from "./chromeStorage";
import { createJob, listJobs, ManualEntryValidationError, subscribeJobs } from "./jobRepository";

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
