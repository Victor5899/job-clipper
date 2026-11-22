import { DEFAULT_SETTINGS, SCHEMA_VERSION } from "../core/model/defaults";
import { isValidTimeString } from "../core/deadline";
import { isLeadPreset } from "../core/reminders/computeRemindAt";
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

/**
 * Settings saved before the CSV checkbox existed have no `chosen` flag.
 * The specification default is to leave the description column out. Record that
 * once so a later choice, including turning the column on, is kept.
 */
export async function ensureCsvPreference(): Promise<Settings> {
  const stored = await localStore.get("settings");
  if (!stored) return DEFAULT_SETTINGS;
  if (stored.csv?.chosen === true) return stored;
  const next: Settings = {
    ...stored,
    csv: { includeDescription: false, chosen: true },
  };
  await localStore.set({ settings: next });
  return next;
}

export async function getSettings(): Promise<Settings> {
  return ensureCsvPreference();
}

export async function saveCsvPreference(includeDescription: boolean): Promise<Settings> {
  const current = await getSettings();
  const next: Settings = { ...current, csv: { includeDescription, chosen: true } };
  await saveSettings(next);
  return next;
}

export function reminderSettingsError(reminders: Settings["reminders"]): string | null {
  if (!isLeadPreset(reminders.leadDays)) return "Choose how many days before the deadline.";
  if (!isValidTimeString(reminders.atTime)) return "Enter a time as HH:MM.";
  return null;
}

/** Replaces settings. The service worker reschedules default reminders from this write. */
export async function saveSettings(settings: Settings): Promise<void> {
  const error = reminderSettingsError(settings.reminders);
  if (error) throw new Error(error);
  await localStore.set({ settings });
}
