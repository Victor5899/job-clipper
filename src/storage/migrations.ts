import { SCHEMA_VERSION } from "../core/model/defaults";
import { localStore } from "./chromeStorage";

/**
 * Ordered storage migrations. Phase 2 keeps schema version 1, so a store that is
 * already at the current version is left untouched. Future versions add a step here.
 */
export async function runMigrations(): Promise<void> {
  const stored = await localStore.get("schemaVersion");
  if (stored === undefined || stored === SCHEMA_VERSION) return;
}
