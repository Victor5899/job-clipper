import { backupFilename } from "../core/backup/serialize";
import { MAX_BACKUP_BYTES, utf8Bytes } from "../core/backup/limits";
import { csvFilename, jobsToCsv } from "../core/csv/toCsv";
import type { JobApplication } from "../core/model/types";
import { createBackupText } from "../storage/backup";
import { listJobs } from "../storage/jobRepository";
import { getSettings } from "../storage/settingsRepository";
import { downloadTextFile } from "./download";

export function downloadJobsCsv(
  jobs: readonly JobApplication[],
  includeDescription: boolean,
  now = new Date(),
  scope: "all" | "filtered" = "all",
): string {
  const filename = csvFilename(now, scope);
  downloadTextFile(filename, jobsToCsv(jobs, { includeDescription }), "text/csv;charset=utf-8");
  const count = jobs.length === 1 ? "1 application" : `${jobs.length} applications`;
  const description = includeDescription
    ? "The description column is included."
    : "Job descriptions were left out.";
  return `Exported ${count} to ${filename}. ${description}`;
}

/** Exports every saved application, using the description choice stored in settings. */
export async function downloadAllJobsCsv(now = new Date()): Promise<string> {
  const [jobs, settings] = await Promise.all([listJobs(), getSettings()]);
  return downloadJobsCsv(jobs, settings.csv.includeDescription, now);
}

export async function downloadBackupFile(
  now = new Date(),
): Promise<{ message: string; oversized: boolean }> {
  const text = await createBackupText(now);
  const filename = backupFilename(now);
  downloadTextFile(filename, text, "application/json;charset=utf-8");
  const oversized = utf8Bytes(text) > MAX_BACKUP_BYTES;
  const message = oversized
    ? `Downloaded ${filename}. It is larger than 5 MB, so Job Clipper will refuse to import it.`
    : `Downloaded ${filename}.`;
  return { message, oversized };
}
