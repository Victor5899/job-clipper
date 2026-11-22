import { DEFAULT_SETTINGS, SCHEMA_VERSION } from "../core/model/defaults";
import type { Settings } from "../core/model/types";
import { localStore, type LocalSchema } from "./chromeStorage";

/** Writes default settings and the schema version if they are missing; never overwrites. */
export async function initializeStorage(): Promise<void> {
  const [settings, schemaVersion] = await Promise.all([
    localStore.get("settings"),
    localStore.get("schemaVersion"),
  ]);
  const missing: Partial<LocalSchema> = {};
  if (settings === undefined) missing.settings = DEFAULT_SETTINGS;
  if (schemaVersion === undefined) missing.schemaVersion = SCHEMA_VERSION;
  if (Object.keys(missing).length > 0) await localStore.set(missing);
}

export async function getSettings(): Promise<Settings> {
  return (await localStore.get("settings")) ?? DEFAULT_SETTINGS;
}
