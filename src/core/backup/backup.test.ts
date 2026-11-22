import { describe, expect, it } from "vitest";
import { makeJob } from "../../../tests/factories";
import { DEFAULT_SETTINGS } from "../model/defaults";
import type { JobApplication, Settings } from "../model/types";
import { MAX_BACKUP_BYTES } from "./limits";
import { describeImport, planImport } from "./plan";
import { buildBackup, serializeBackup } from "./serialize";
import { parseBackup } from "./validate";

function settings(overrides: Partial<Settings> = {}): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...overrides,
    reminders: { ...DEFAULT_SETTINGS.reminders, ...overrides.reminders },
    profile: { ...DEFAULT_SETTINGS.profile, ...overrides.profile },
    csv: { ...DEFAULT_SETTINGS.csv, ...overrides.csv },
  };
}

function richJob(): JobApplication {
  return makeJob({
    id: "rich-job",
    title: "Data Analyst",
    company: "राज़ोरपे",
    url: "https://example.com/jobs/rich",
    canonicalUrl: "https://example.com/jobs/rich",
    source: "other",
    description: "₹ 15,000 /month\nதரவு",
    location: { raw: "Chennai", city: "Chennai", country: "India", countryCode: "IN" },
    workArrangement: "hybrid",
    eligibleCountries: ["IN"],
    eligibility: {
      value: "india_hybrid",
      confidence: "medium",
      reasons: ["Chennai office"],
      overridden: false,
      classifierVersion: 1,
    },
    visaSponsorship: "unknown",
    studentEligibility: "students",
    graduationYears: [2027],
    employmentType: "internship",
    experience: { raw: "0-1 years", minYears: 0, maxYears: 1, level: "fresher" },
    compensation: {
      raw: "₹ 15,000 /month",
      currency: "INR",
      min: 15000,
      period: "month",
      kind: "stipend",
    },
    skills: ["SQL", "Python"],
    category: "data_analyst",
    status: "interview",
    statusHistory: [{ status: "interview", at: "2026-11-21T10:00:00.000Z" }],
    savedAt: "2026-11-20T10:00:00.000Z",
    updatedAt: "2026-11-21T10:00:00.000Z",
    appliedAt: "2026-11-20T12:00:00.000Z",
    interviewAt: "2026-11-25T06:30:00.000Z",
    deadline: { date: "2026-11-30", origin: "user" },
    notes: "Bring a notebook\nsecond line",
    contact: { name: "Ada", email: "ada@example.com" },
    reminder: {
      enabled: true,
      mode: "custom",
      customAt: "2026-11-29T03:30:00.000Z",
      remindAt: "2026-11-29T03:30:00.000Z",
      status: "scheduled",
    },
  });
}

describe("parseBackup", () => {
  it("round-trips a minimal job and a fully filled job", () => {
    const jobs = [makeJob({ id: "plain", notes: "" }), richJob()];
    const stored = settings({
      reminders: { enabledByDefault: true, leadDays: 3, atTime: "08:30" },
    });
    const exportedAt = new Date("2026-11-22T12:00:00.000Z");
    const text = serializeBackup(buildBackup(jobs, stored, exportedAt));
    const parsed = parseBackup(`\uFEFF${text}`);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.backup.jobs).toEqual(jobs);
    expect(parsed.backup.settings).toEqual(stored);
    expect(parsed.backup.exportedAt).toBe(exportedAt.toISOString());
    expect(parsed.backup.schemaVersion).toBe(1);
  });

  it("rejects malformed files, future schemas, and oversized files", () => {
    const cases = [
      ["{", /not valid JSON/],
      ["[]", /not a Job Clipper backup/],
      ["null", /not a Job Clipper backup/],
      [JSON.stringify({ app: "other", schemaVersion: 1 }), /not a Job Clipper backup/],
      [
        JSON.stringify({
          app: "job-clipper",
          schemaVersion: 2,
          exportedAt: "2026-11-22T00:00:00.000Z",
          jobs: [],
          settings: DEFAULT_SETTINGS,
        }),
        /schema 2/,
      ],
      [
        JSON.stringify({
          app: "job-clipper",
          schemaVersion: 0,
          exportedAt: "2026-11-22T00:00:00.000Z",
          jobs: [],
          settings: DEFAULT_SETTINGS,
        }),
        /schema 0/,
      ],
      [
        JSON.stringify({
          app: "job-clipper",
          schemaVersion: 1,
          exportedAt: "2026-11-22T00:00:00.000Z",
          jobs: {},
          settings: DEFAULT_SETTINGS,
        }),
        /application list/,
      ],
      ["x".repeat(MAX_BACKUP_BYTES + 1), /larger than 5 MB/],
    ] as const;

    for (const [text, pattern] of cases) {
      const parsed = parseBackup(text);
      expect(parsed.ok).toBe(false);
      if (parsed.ok) continue;
      expect(parsed.errors.join(" ")).toMatch(pattern);
      expect(parsed.errors.at(-1)).toMatch(/Nothing was changed/);
    }
  });

  it("rejects a job that would not be safe to store", () => {
    const base = buildBackup(
      [makeJob({ id: "ok" })],
      DEFAULT_SETTINGS,
      new Date("2026-11-22T00:00:00.000Z"),
    );
    const broken = structuredClone(base);
    (broken.jobs[0] as { title?: string }).title = "";
    const missing = parseBackup(JSON.stringify(broken));
    expect(missing.ok).toBe(false);

    const extra = structuredClone(base);
    (extra.jobs[0] as { password?: string }).password = "secret";
    const unknown = parseBackup(JSON.stringify(extra));
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.errors.join(" ")).toMatch(/unknown field/);

    const script = structuredClone(base);
    script.jobs[0]!.url = "javascript:alert(1)";
    expect(parseBackup(JSON.stringify(script)).ok).toBe(false);

    const duplicate = structuredClone(base);
    duplicate.jobs.push(structuredClone(duplicate.jobs[0]!));
    const repeated = parseBackup(JSON.stringify(duplicate));
    expect(repeated.ok).toBe(false);
    if (!repeated.ok) expect(repeated.errors.join(" ")).toMatch(/repeats id/);

    const lead = structuredClone(base);
    lead.settings.reminders.leadDays = 4;
    expect(parseBackup(JSON.stringify(lead)).ok).toBe(false);
  });
});

describe("planImport", () => {
  const exportedAt = new Date("2026-11-22T00:00:00.000Z");

  it("merges by id or link and can skip or overwrite", () => {
    const local = makeJob({
      id: "same",
      title: "Local title",
      url: "https://example.com/jobs/same",
      canonicalUrl: "https://example.com/jobs/same",
    });
    const onlyLocal = makeJob({ id: "local-only", title: "Stay" });
    const incoming = makeJob({
      id: "same",
      title: "File title",
      url: "https://example.com/jobs/same",
      canonicalUrl: "https://example.com/jobs/same",
    });
    const added = makeJob({ id: "added", title: "New" });
    const file = buildBackup([incoming, added], DEFAULT_SETTINGS, exportedAt);

    const skip = planImport([local, onlyLocal], file, {
      mode: "merge",
      onConflict: "skip",
      replaceSettings: false,
    });
    expect(skip.writeJobs.map((job) => job.id)).toEqual(["added"]);
    expect(skip.deleteJobIds).toEqual([]);
    expect(skip.settings).toBeNull();
    expect(skip.summary.skipped).toBe(1);
    expect(describeImport(skip.summary).join(" ")).toMatch(
      /keeps applications that are only on this device/,
    );
    expect(describeImport(skip.summary).join(" ")).not.toMatch(/removes every application/);

    const overwrite = planImport([local, onlyLocal], file, {
      mode: "merge",
      onConflict: "overwrite",
      replaceSettings: true,
    });
    expect(overwrite.writeJobs.map((job) => job.id).sort()).toEqual(["added", "same"]);
    expect(overwrite.writeJobs.find((job) => job.id === "same")?.title).toBe("File title");
    expect(overwrite.settings?.csv.chosen).toBe(true);
    expect(describeImport(overwrite.summary).join(" ")).toMatch(/replaces the saved one/);
  });

  it("replaces the whole device and says so", () => {
    const local = makeJob({ id: "local" });
    const incoming = makeJob({ id: "file" });
    const file = buildBackup(
      [incoming],
      settings({ profile: { graduationYear: 2028, countryCode: "IN" } }),
      exportedAt,
    );
    const plan = planImport([local], file, {
      mode: "replace",
      onConflict: "skip",
      replaceSettings: false,
    });
    expect(plan.writeJobs.map((job) => job.id)).toEqual(["file"]);
    expect(plan.deleteJobIds).toEqual(["local"]);
    expect(plan.settings?.profile.graduationYear).toBe(2028);
    const text = describeImport(plan.summary).join(" ");
    expect(text).toMatch(/Replace removes every application/);
    expect(text).toMatch(/will be removed/);
    expect(text).toMatch(/settings on this device are replaced/);
  });

  it("does not overwrite when one link matches more than one application", () => {
    const url = "https://example.com/jobs/shared";
    const first = makeJob({ id: "a", canonicalUrl: url, url });
    const second = makeJob({ id: "b", canonicalUrl: url, url });
    const incoming = makeJob({ id: "c", title: "From file", canonicalUrl: url, url });
    const file = buildBackup([incoming], DEFAULT_SETTINGS, exportedAt);
    const plan = planImport([first, second], file, {
      mode: "merge",
      onConflict: "overwrite",
      replaceSettings: false,
    });
    expect(plan.writeJobs).toEqual([]);
    expect(plan.deleteJobIds).toEqual([]);
    expect(plan.summary.skipped).toBe(1);
    expect(plan.summary.notes[0]).toMatch(/more than one application/);
  });
});
