import { describe, expect, it } from "vitest";
import { chromeFake } from "../../tests/fakes/chrome";
import { makeJob } from "../../tests/factories";
import { reconcileReminders } from "../background/reconcile";
import { planImport } from "../core/backup/plan";
import { buildBackup, serializeBackup } from "../core/backup/serialize";
import type { ImportOptions } from "../core/backup/types";
import { parseBackup } from "../core/backup/validate";
import { alarmNameForJob } from "../core/reminders/computeRemindAt";
import { DEFAULT_SETTINGS, SCHEMA_VERSION } from "../core/model/defaults";
import type { Settings } from "../core/model/types";
import { applyImport, createBackupText, deleteAllStoredData } from "./backup";
import { jobKey } from "./chromeStorage";
import { resumeStorageJournal } from "./journal";
import { runMigrations } from "./migrations";
import { getJob, listJobs } from "./jobRepository";
import { getSettings } from "./settingsRepository";

function local(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

const now = local(2026, 11, 22, 15, 0);

async function restore(text: string, options: ImportOptions) {
  const before = chromeFake().storage.local.snapshot();
  const parsed = parseBackup(text);
  if (!parsed.ok) {
    expect(chromeFake().storage.local.snapshot()).toEqual(before);
    return parsed;
  }
  const plan = planImport(await listJobs(), parsed.backup, options);
  await applyImport(plan);
  return { ok: true as const, summary: plan.summary };
}

describe("backup storage", () => {
  it("restores jobs and settings, then reconciles reminders", async () => {
    const job = makeJob({
      id: "kept",
      title: "Analyst",
      company: "राज़ोरपे",
      notes: "line one\nline two",
      description: "₹ 15,000",
      skills: ["SQL"],
      deadline: { date: "2026-11-30", origin: "user" },
      reminder: { enabled: true, mode: "default", status: "none" },
    });
    const fileSettings: Settings = {
      ...DEFAULT_SETTINGS,
      reminders: { enabledByDefault: true, leadDays: 1, atTime: "09:00" },
      profile: { graduationYear: 2028, countryCode: "IN" },
      csv: { includeDescription: false, chosen: true },
    };
    const text = serializeBackup(
      buildBackup([job], fileSettings, new Date("2026-11-22T12:00:00.000Z")),
    );

    const other = makeJob({
      id: "other",
      deadline: { date: "2026-12-05", origin: "user" },
      reminder: { enabled: true, mode: "default", status: "scheduled" },
    });
    await chromeFake().storage.local.set({
      [jobKey(other.id)]: other,
      settings: DEFAULT_SETTINGS,
      schemaVersion: SCHEMA_VERSION,
    });
    await chromeFake().alarms.create(alarmNameForJob(other.id), {
      when: now.getTime() + 86_400_000,
    });

    const result = await restore(text, {
      mode: "replace",
      onConflict: "skip",
      replaceSettings: false,
    });
    expect(result.ok).toBe(true);

    const restored = await getJob(job.id);
    expect(restored?.title).toBe("Analyst");
    expect(restored?.company).toBe("राज़ोरपे");
    expect(restored?.notes).toBe("line one\nline two");
    expect(restored?.description).toBe("₹ 15,000");
    expect(restored?.skills).toEqual(["SQL"]);
    expect(restored?.deadline).toEqual({ date: "2026-11-30", origin: "user" });
    expect(await getJob(other.id)).toBeUndefined();

    const saved = await getSettings();
    expect(saved.profile.graduationYear).toBe(2028);
    expect(saved.csv).toEqual({ includeDescription: false, chosen: true });

    await reconcileReminders(now);
    const alarms = await chromeFake().alarms.getAll();
    expect(alarms.some((alarm) => alarm.name === alarmNameForJob(job.id))).toBe(true);
    expect(alarms.some((alarm) => alarm.name === alarmNameForJob(other.id))).toBe(false);
    expect((await getJob(job.id))?.title).toBe("Analyst");
    expect((await getJob(job.id))?.reminder.status).toBe("scheduled");
    expect((await getJob(job.id))?.reminder.enabled).toBe(true);
  });

  it("merges without deleting a device-only application", async () => {
    const localJob = makeJob({ id: "local", title: "Keep me" });
    await chromeFake().storage.local.set({
      [jobKey(localJob.id)]: localJob,
      settings: DEFAULT_SETTINGS,
      schemaVersion: 1,
    });
    const incoming = makeJob({ id: "incoming", title: "From file", notes: "saved" });
    const text = serializeBackup(
      buildBackup([incoming], DEFAULT_SETTINGS, new Date("2026-11-22T00:00:00.000Z")),
    );
    const result = await restore(text, {
      mode: "merge",
      onConflict: "skip",
      replaceSettings: false,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.summary.added).toBe(1);
    const jobs = await listJobs();
    expect(jobs.map((job) => job.title).sort()).toEqual(["From file", "Keep me"]);
    expect((await getSettings()).reminders.leadDays).toBe(DEFAULT_SETTINGS.reminders.leadDays);
  });

  it("refuses an invalid file and a newer schema without writing", async () => {
    const job = makeJob({ id: "safe", title: "Untouched" });
    await chromeFake().storage.local.set({
      [jobKey(job.id)]: job,
      settings: DEFAULT_SETTINGS,
      schemaVersion: 1,
    });
    await chromeFake().alarms.create(alarmNameForJob(job.id), { when: now.getTime() + 10_000 });
    const before = chromeFake().storage.local.snapshot();

    const invalid = await restore("{", {
      mode: "replace",
      onConflict: "overwrite",
      replaceSettings: true,
    });
    expect(invalid.ok).toBe(false);
    expect(chromeFake().storage.local.snapshot()).toEqual(before);

    const future = JSON.stringify({
      app: "job-clipper",
      schemaVersion: 9,
      exportedAt: "2026-11-22T00:00:00.000Z",
      jobs: [],
      settings: DEFAULT_SETTINGS,
    });
    const mismatch = await restore(future, {
      mode: "replace",
      onConflict: "overwrite",
      replaceSettings: true,
    });
    expect(mismatch.ok).toBe(false);
    if (!mismatch.ok) expect(mismatch.errors.join(" ")).toMatch(/schema 9/);
    expect(await getJob(job.id)).toMatchObject({ title: "Untouched" });
    expect(await chromeFake().alarms.get(alarmNameForJob(job.id))).toBeTruthy();
  });

  it("keeps a restored choice to leave descriptions out of the CSV", async () => {
    const fileSettings: Settings = {
      ...DEFAULT_SETTINGS,
      csv: { includeDescription: false },
    };
    const text = serializeBackup(
      buildBackup([], fileSettings, new Date("2026-11-22T00:00:00.000Z")),
    );
    await restore(text, { mode: "replace", onConflict: "skip", replaceSettings: true });
    expect((await getSettings()).csv).toEqual({ includeDescription: false, chosen: true });
  });

  it("downloads a backup that parses back to the stored jobs", async () => {
    const job = makeJob({ id: "round", title: "Round trip", notes: "₹" });
    await chromeFake().storage.local.set({
      [jobKey(job.id)]: job,
      settings: DEFAULT_SETTINGS,
      schemaVersion: 1,
    });
    const parsed = parseBackup(await createBackupText(new Date("2026-11-22T08:00:00.000Z")));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.backup.jobs.map((item) => item.title)).toEqual(["Round trip"]);
    expect(parsed.backup.jobs[0]?.notes).toBe("₹");
  });

  it("deletes every application, resets settings, and clears drafts", async () => {
    const job = makeJob({
      id: "gone",
      deadline: { date: "2026-11-30", origin: "user" },
      reminder: { enabled: true, mode: "default", status: "scheduled" },
    });
    await chromeFake().storage.local.set({
      [jobKey(job.id)]: job,
      settings: { ...DEFAULT_SETTINGS, profile: { graduationYear: 2026, countryCode: "IN" } },
      schemaVersion: 1,
    });
    await chromeFake().storage.session.set({
      "popupDraft:1": { values: {}, updatedAt: "2026-11-22T00:00:00.000Z" },
    });
    await chromeFake().alarms.create(alarmNameForJob(job.id), { when: now.getTime() + 10_000 });

    await deleteAllStoredData();
    expect(await listJobs()).toEqual([]);
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
    expect(chromeFake().storage.session.snapshot()).toEqual({});

    await reconcileReminders(now);
    const alarms = await chromeFake().alarms.getAll();
    expect(alarms.some((alarm) => alarm.name === alarmNameForJob(job.id))).toBe(false);
  });

  it("finishes a replace when the first delete fails, and otherwise keeps a journal", async () => {
    const localJob = makeJob({ id: "local", title: "Stay until the delete lands" });
    const kept = makeJob({ id: "kept", title: "Only on this device" });
    const incoming = makeJob({ id: "incoming", title: "From the file" });
    const fileSettings: Settings = {
      ...DEFAULT_SETTINGS,
      profile: { graduationYear: 2029, countryCode: "IN" },
    };
    await chromeFake().storage.local.set({
      [jobKey(localJob.id)]: localJob,
      [jobKey(kept.id)]: kept,
      settings: DEFAULT_SETTINGS,
      schemaVersion: SCHEMA_VERSION,
    });
    const parsed = parseBackup(
      serializeBackup(buildBackup([incoming], fileSettings, new Date("2026-11-22T00:00:00.000Z"))),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const plan = planImport(await listJobs(), parsed.backup, {
      mode: "replace",
      onConflict: "overwrite",
      replaceSettings: true,
    });

    const area = chromeFake().storage.local;
    const originalRemove = area.remove.bind(area);
    const originalSet = area.set.bind(area);
    area.set = async () => {
      throw new Error("full");
    };
    await expect(applyImport(plan)).rejects.toThrow(/not changed/);
    expect(await listJobs()).toHaveLength(2);
    expect(area.snapshot().importJournal).toBeUndefined();

    area.set = originalSet;
    let removals = 0;
    area.remove = async (keys) => {
      removals += 1;
      if (removals === 1) throw new Error("disk");
      return originalRemove(keys);
    };
    await applyImport(plan);
    expect((await listJobs()).map((job) => job.id)).toEqual(["incoming"]);
    expect(await getSettings()).toMatchObject({ profile: { graduationYear: 2029 } });
    expect(area.snapshot().importJournal).toBeUndefined();

    await chromeFake().storage.local.set({
      [jobKey(localJob.id)]: localJob,
      [jobKey(incoming.id)]: incoming,
      settings: fileSettings,
      schemaVersion: SCHEMA_VERSION,
      importJournal: {
        deleteJobIds: [localJob.id],
        settings: fileSettings,
        clearSession: false,
      },
    });
    area.remove = async () => {
      throw new Error("disk");
    };
    await expect(resumeStorageJournal()).rejects.toThrow();
    expect((await listJobs()).map((job) => job.id).sort()).toEqual(["incoming", "local"]);

    area.remove = originalRemove;
    await runMigrations();
    expect((await listJobs()).map((job) => job.id)).toEqual(["incoming"]);
    expect(chromeFake().storage.local.snapshot().importJournal).toBeUndefined();
    expect((await getSettings()).profile.graduationYear).toBe(2029);
  });
});
