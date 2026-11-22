import { STORAGE_QUOTA_BYTES } from "../core/backup/limits";
import { buildBackup, serializeBackup } from "../core/backup/serialize";
import type { PlannedImport } from "../core/backup/types";
import { parseBackup } from "../core/backup/validate";
import { DEFAULT_SETTINGS, SCHEMA_VERSION } from "../core/model/defaults";
import type { Settings } from "../core/model/types";
import { isJobKey, jobKey, localStore, type LocalSchema } from "./chromeStorage";
import { finishStorageJournal, resumeStorageJournal, type StorageJournal } from "./journal";
import { listJobs } from "./jobRepository";
import { getSettings } from "./settingsRepository";

export async function readStorageUsage(): Promise<{ used: number; quota: number }> {
  const used = await chrome.storage.local.getBytesInUse(null);
  return { used, quota: STORAGE_QUOTA_BYTES };
}

/** Every saved application and the current settings, pretty-printed JSON. */
export async function createBackupText(exportedAt = new Date()): Promise<string> {
  const [jobs, settings] = await Promise.all([listJobs(), getSettings()]);
  return serializeBackup(buildBackup(jobs, settings, exportedAt));
}

const UNFINISHED_IMPORT =
  "Import did not finish. Job Clipper will complete it the next time it starts. Check your applications before relying on this copy.";
const UNFINISHED_DELETE =
  "Delete did not finish. Job Clipper will complete it the next time it starts.";

/**
 * Writes the new copies and a journal in one storage set, then removes the old keys.
 * chrome.storage.local.set is atomic. If the following remove fails, the journal
 * remains and the next launch finishes the same deletes. A failed set writes nothing.
 */
async function commitChange(
  journal: StorageJournal,
  writes: Partial<LocalSchema>,
  unfinished: string,
  unchanged: string,
): Promise<void> {
  try {
    await localStore.set({ ...writes, importJournal: journal, schemaVersion: SCHEMA_VERSION });
  } catch {
    throw new Error(unchanged);
  }
  try {
    await finishStorageJournal(journal);
  } catch {
    try {
      await finishStorageJournal(journal);
    } catch {
      throw new Error(unfinished);
    }
  }
}

/**
 * Writes a plan that was built from a validated backup.
 * The plan is checked again immediately before the write. A failed check throws
 * and leaves storage as it was.
 */
export async function applyImport(plan: PlannedImport): Promise<void> {
  try {
    await resumeStorageJournal();
  } catch {
    throw new Error(UNFINISHED_IMPORT);
  }
  const settingsForProbe = plan.settings ?? DEFAULT_SETTINGS;
  const probe = parseBackup(
    serializeBackup(buildBackup(plan.writeJobs, settingsForProbe, new Date())),
  );
  if (!probe.ok) throw new Error("Import refused. Saved applications were not changed.");

  const writeIds = new Set(plan.writeJobs.map((job) => job.id));
  const keptSettings: Settings = plan.settings ?? (await getSettings());
  const journal: StorageJournal = {
    deleteJobIds: plan.deleteJobIds.filter((id) => !writeIds.has(id)),
    settings: keptSettings,
    clearSession: false,
  };
  const writes: Partial<LocalSchema> = {};
  for (const job of plan.writeJobs) writes[jobKey(job.id)] = job;
  if (plan.settings) writes.settings = plan.settings;
  await commitChange(
    journal,
    writes,
    UNFINISHED_IMPORT,
    "Import did not finish. Saved applications were not changed.",
  );
}

/** Deletes every saved application, resets settings, and clears popup drafts. */
export async function deleteAllStoredData(): Promise<void> {
  try {
    await resumeStorageJournal();
  } catch {
    throw new Error(UNFINISHED_DELETE);
  }
  const items = await localStore.getAll();
  const journal: StorageJournal = {
    deleteJobIds: Object.keys(items)
      .filter(isJobKey)
      .map((key) => key.slice("job:".length)),
    settings: DEFAULT_SETTINGS,
    clearSession: true,
  };
  await commitChange(
    journal,
    { settings: DEFAULT_SETTINGS },
    UNFINISHED_DELETE,
    "Delete did not finish. Saved applications were not changed.",
  );
}
