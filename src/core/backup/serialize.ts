import { SCHEMA_VERSION } from "../model/defaults";
import type { JobApplication, Settings } from "../model/types";
import { BACKUP_APP, type BackupFile } from "./types";

export function backupFilename(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `job-clipper-backup-${date.getFullYear()}-${month}-${day}.json`;
}

/** A deep copy, so later edits to the live jobs do not change a backup already built. */
export function buildBackup(
  jobs: readonly JobApplication[],
  settings: Settings,
  exportedAt: Date,
): BackupFile {
  return {
    app: BACKUP_APP,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: exportedAt.toISOString(),
    jobs: jobs.map((job) => structuredClone(job)),
    settings: structuredClone(settings),
  };
}

export function serializeBackup(backup: BackupFile): string {
  return `${JSON.stringify(backup, null, 2)}\n`;
}

/** Marks an imported settings object so the one-time description default does not override it. */
export function sealSettings(settings: Settings): Settings {
  return {
    ...settings,
    reminders: { ...settings.reminders },
    profile: { ...settings.profile },
    csv: { includeDescription: settings.csv.includeDescription, chosen: true },
  };
}
