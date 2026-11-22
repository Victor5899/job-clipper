import type { ManualEntryValues } from "../core/model/manualEntry";
import { sessionStore, type DraftKey, type PopupDraft } from "./chromeStorage";

const FIELDS: (keyof ManualEntryValues)[] = [
  "title",
  "company",
  "url",
  "deadlineDate",
  "deadlineTime",
];

/** Drafts are kept per tab so a half-typed entry reappears when the popup reopens on that tab. */
export function draftKey(tabId: number | undefined): DraftKey {
  return `popupDraft:${tabId ?? "no-tab"}`;
}

function isDraft(value: unknown): value is PopupDraft {
  if (typeof value !== "object" || value === null) return false;
  const values = (value as { values?: unknown }).values;
  if (typeof values !== "object" || values === null) return false;
  return FIELDS.every((field) => typeof (values as Record<string, unknown>)[field] === "string");
}

export async function loadDraft(tabId: number | undefined): Promise<PopupDraft | undefined> {
  const draft = await sessionStore.get(draftKey(tabId));
  return isDraft(draft) ? draft : undefined;
}

export async function saveDraft(
  tabId: number | undefined,
  values: ManualEntryValues,
  now: Date = new Date(),
): Promise<void> {
  await sessionStore.set({ [draftKey(tabId)]: { values, updatedAt: now.toISOString() } });
}

export async function clearDraft(tabId: number | undefined): Promise<void> {
  await sessionStore.remove(draftKey(tabId));
}
