import { SCHEMA_VERSION } from "../core/model/defaults";
import type { Settings } from "../core/model/types";
import { isJobKey, jobKey, localStore } from "./chromeStorage";

/**
 * Records the deletes still owed after a storage set.
 * chrome.storage.local.set is one atomic write. Removing old keys is a second call.
 * If that second call fails, this record is what the next launch finishes.
 */
export interface StorageJournal {
  deleteJobIds: string[];
  settings: Settings;
  clearSession: boolean;
}

export function isStorageJournal(value: unknown): value is StorageJournal {
  if (!value || typeof value !== "object") return false;
  const journal = value as StorageJournal;
  return (
    Array.isArray(journal.deleteJobIds) &&
    journal.deleteJobIds.every((id) => typeof id === "string" && isJobKey(jobKey(id))) &&
    journal.settings !== null &&
    typeof journal.settings === "object" &&
    typeof journal.clearSession === "boolean"
  );
}

/** Applies a journal: settings, then the owed deletes, then the journal key itself. */
export async function finishStorageJournal(journal: StorageJournal): Promise<void> {
  await localStore.set({ settings: journal.settings, schemaVersion: SCHEMA_VERSION });
  const keys = journal.deleteJobIds.map((id) => jobKey(id));
  if (keys.length > 0) await localStore.remove(keys);
  if (journal.clearSession) await chrome.storage.session.clear();
  await localStore.remove("importJournal");
}

/** Completes an import or delete that stopped after its first write. Does nothing when there is no journal. */
export async function resumeStorageJournal(): Promise<void> {
  const journal = await localStore.get("importJournal");
  if (!journal) return;
  if (!isStorageJournal(journal)) {
    await localStore.remove("importJournal");
    return;
  }
  await finishStorageJournal(journal);
}
