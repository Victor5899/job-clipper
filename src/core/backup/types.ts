import type { JobApplication, Settings } from "../model/types";

export const BACKUP_APP = "job-clipper";

/** Versioned envelope written by Download backup and read by Import. */
export interface BackupFile {
  app: typeof BACKUP_APP;
  schemaVersion: number;
  exportedAt: string;
  jobs: JobApplication[];
  settings: Settings;
}

export type ParseResult = { ok: true; backup: BackupFile } | { ok: false; errors: string[] };

export interface ImportOptions {
  mode: "replace" | "merge";
  /** Used for merge. Replace ignores this and writes the file as the whole set. */
  onConflict: "skip" | "overwrite";
  /** Used for merge. Replace always takes settings from the file. */
  replaceSettings: boolean;
}

export interface ImportSummary {
  mode: "replace" | "merge";
  onConflict: "skip" | "overwrite";
  fileJobs: number;
  storedJobs: number;
  added: number;
  overwritten: number;
  skipped: number;
  deleted: number;
  settings: "replaced" | "kept";
  notes: string[];
}

/** What a confirmed import will write. Built only from a backup that already validated. */
export interface PlannedImport {
  writeJobs: JobApplication[];
  deleteJobIds: string[];
  /** Null keeps the settings already on this device. */
  settings: Settings | null;
  summary: ImportSummary;
}
