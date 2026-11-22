import type { JobApplication } from "../model/types";
import { sealSettings } from "./serialize";
import type { BackupFile, ImportOptions, ImportSummary, PlannedImport } from "./types";

function countLabel(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function clip(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed;
}

/**
 * Sentences for the import preview and the confirmation dialog.
 * They describe the selected mode: merge keeps device-only applications, replace removes them.
 */
export function describeImport(summary: ImportSummary): string[] {
  const lines = [
    `This file contains ${countLabel(summary.fileJobs, "application")}. This device has ${countLabel(summary.storedJobs, "application")}.`,
  ];

  if (summary.mode === "replace") {
    lines.push(
      `Replace removes every application on this device and saves the ${countLabel(summary.fileJobs, "application")} from this file.`,
    );
    if (summary.deleted > 0) {
      lines.push(
        `${countLabel(summary.deleted, "application")} currently on this device will be removed.`,
      );
    }
    lines.push(
      "Reminder, profile and CSV settings on this device are replaced by the settings in this file.",
    );
  } else {
    lines.push(
      `Merge adds ${countLabel(summary.added, "application")} and keeps applications that are only on this device.`,
    );
    if (summary.onConflict === "skip") {
      lines.push(
        "When an application in the file has the same id or the same link as one on this device, the saved copy is kept.",
      );
      if (summary.skipped > 0) {
        lines.push(
          `${countLabel(summary.skipped, "application")} in the file match something already saved and will stay as they are on this device.`,
        );
      }
    } else {
      lines.push(
        "When an application in the file has the same id or the same link as one on this device, the copy in the file replaces the saved one.",
      );
      if (summary.overwritten > 0) {
        lines.push(
          `${countLabel(summary.overwritten, "saved application")} will be replaced by the copy in the file.`,
        );
      }
      if (summary.skipped > 0) {
        lines.push(
          `${countLabel(summary.skipped, "application")} in the file will be left out because the id or link matches more than one application.`,
        );
      }
    }
    lines.push(
      summary.settings === "replaced"
        ? "Reminder, profile and CSV settings are replaced by the settings in this file."
        : "Reminder, profile and CSV settings on this device stay as they are.",
    );
  }

  for (const note of summary.notes.slice(0, 5)) lines.push(note);
  if (summary.notes.length > 5) {
    lines.push(`${summary.notes.length - 5} more applications were left out for the same reason.`);
  }
  return lines;
}

function claimsFor(
  job: JobApplication,
  storedById: Map<string, JobApplication>,
  storedByUrl: Map<string, JobApplication[]>,
): JobApplication[] {
  const found = new Map<string, JobApplication>();
  const byId = storedById.get(job.id);
  if (byId) found.set(byId.id, byId);
  for (const match of storedByUrl.get(job.canonicalUrl) ?? []) found.set(match.id, match);
  return [...found.values()];
}

function planReplace(stored: readonly JobApplication[], file: BackupFile): PlannedImport {
  const storedIds = new Set(stored.map((job) => job.id));
  const fileIds = new Set(file.jobs.map((job) => job.id));
  let added = 0;
  let overwritten = 0;
  for (const job of file.jobs) {
    if (storedIds.has(job.id)) overwritten += 1;
    else added += 1;
  }
  const removed = stored.filter((job) => !fileIds.has(job.id)).map((job) => job.id);

  return {
    writeJobs: file.jobs.map((job) => structuredClone(job)),
    deleteJobIds: removed,
    settings: sealSettings(file.settings),
    summary: {
      mode: "replace",
      onConflict: "overwrite",
      fileJobs: file.jobs.length,
      storedJobs: stored.length,
      added,
      overwritten,
      skipped: 0,
      deleted: removed.length,
      settings: "replaced",
      notes: [],
    },
  };
}

function planMerge(
  stored: readonly JobApplication[],
  file: BackupFile,
  options: ImportOptions,
): PlannedImport {
  const storedById = new Map(stored.map((job) => [job.id, job]));
  const storedByUrl = new Map<string, JobApplication[]>();
  for (const job of stored) {
    const list = storedByUrl.get(job.canonicalUrl) ?? [];
    list.push(job);
    storedByUrl.set(job.canonicalUrl, list);
  }

  const claims = file.jobs.map((job) => ({
    job,
    stored: claimsFor(job, storedById, storedByUrl),
  }));
  const claimCount = new Map<string, number>();
  for (const claim of claims) {
    for (const match of claim.stored) {
      claimCount.set(match.id, (claimCount.get(match.id) ?? 0) + 1);
    }
  }

  const writeJobs: JobApplication[] = [];
  const deleteJobIds: string[] = [];
  const notes: string[] = [];
  let added = 0;
  let overwritten = 0;
  let skipped = 0;

  for (const claim of claims) {
    const crowded =
      claim.stored.length > 1 || claim.stored.some((match) => (claimCount.get(match.id) ?? 0) > 1);
    if (crowded) {
      skipped += 1;
      notes.push(
        `“${clip(claim.job.title)}” at ${clip(claim.job.company)} was left out because its id or link matches more than one application. That saved application was not overwritten.`,
      );
      continue;
    }
    if (claim.stored.length === 0) {
      added += 1;
      writeJobs.push(structuredClone(claim.job));
      continue;
    }
    if (options.onConflict === "skip") {
      skipped += 1;
      continue;
    }
    const match = claim.stored[0];
    if (!match) continue;
    overwritten += 1;
    writeJobs.push(structuredClone(claim.job));
    if (match.id !== claim.job.id) deleteJobIds.push(match.id);
  }

  return {
    writeJobs,
    deleteJobIds,
    settings: options.replaceSettings ? sealSettings(file.settings) : null,
    summary: {
      mode: "merge",
      onConflict: options.onConflict,
      fileJobs: file.jobs.length,
      storedJobs: stored.length,
      added,
      overwritten,
      skipped,
      deleted: deleteJobIds.length,
      settings: options.replaceSettings ? "replaced" : "kept",
      notes,
    },
  };
}

export function planImport(
  stored: readonly JobApplication[],
  file: BackupFile,
  options: ImportOptions,
): PlannedImport {
  if (options.mode === "replace") return planReplace(stored, file);
  return planMerge(stored, file, options);
}

export function sameImportPlan(a: PlannedImport, b: PlannedImport): boolean {
  const key = (ids: readonly string[]) => [...ids].sort().join("\0");
  return (
    a.summary.mode === b.summary.mode &&
    a.summary.onConflict === b.summary.onConflict &&
    a.summary.fileJobs === b.summary.fileJobs &&
    a.summary.storedJobs === b.summary.storedJobs &&
    a.summary.added === b.summary.added &&
    a.summary.overwritten === b.summary.overwritten &&
    a.summary.skipped === b.summary.skipped &&
    a.summary.deleted === b.summary.deleted &&
    a.summary.settings === b.summary.settings &&
    key(a.writeJobs.map((job) => job.id)) === key(b.writeJobs.map((job) => job.id)) &&
    key(a.deleteJobIds) === key(b.deleteJobIds) &&
    (a.settings === null) === (b.settings === null)
  );
}
