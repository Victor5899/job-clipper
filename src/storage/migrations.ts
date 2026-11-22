import { SCHEMA_VERSION } from "../core/model/defaults";
import { localStore } from "./chromeStorage";
import { resumeStorageJournal } from "./journal";
import { ensureCsvPreference } from "./settingsRepository";

/**
 * Ordered storage migrations. The job schema is still version 1, so existing jobs
 * are not rewritten. A CSV choice that was never saved is recorded as off.
 * An import that stopped between its two storage calls is finished here.
 */
export async function runMigrations(): Promise<void> {
  await ensureCsvPreference();
  try {
    await resumeStorageJournal();
  } catch {
    // The journal stays. The next launch tries again. Startup still continues.
  }
  const stored = await localStore.get("schemaVersion");
  if (stored === undefined || stored === SCHEMA_VERSION) return;
}
