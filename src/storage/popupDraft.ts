import type { ClipReview } from "../core/extraction/review";
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

function isReview(value: unknown): value is ClipReview {
  if (typeof value !== "object" || value === null) return false;
  const review = value as Record<string, unknown>;
  return (
    typeof review.title === "string" &&
    typeof review.company === "string" &&
    typeof review.url === "string" &&
    typeof review.location === "string" &&
    typeof review.eligibility === "string" &&
    typeof review.workArrangement === "string" &&
    typeof review.employmentType === "string" &&
    Array.isArray(review.eligibilityReasons) &&
    Array.isArray(review.missing)
  );
}

function isDraft(value: unknown): value is PopupDraft {
  if (typeof value !== "object" || value === null) return false;
  const values = (value as { values?: unknown }).values;
  if (typeof values !== "object" || values === null) return false;
  if (!FIELDS.every((field) => typeof (values as Record<string, unknown>)[field] === "string")) {
    return false;
  }
  const review = (value as { review?: unknown }).review;
  return review === undefined || isReview(review);
}

export async function loadDraft(tabId: number | undefined): Promise<PopupDraft | undefined> {
  const draft = await sessionStore.get(draftKey(tabId));
  return isDraft(draft) ? draft : undefined;
}

export async function saveDraft(
  tabId: number | undefined,
  values: ManualEntryValues,
  now: Date = new Date(),
  review?: ClipReview,
): Promise<void> {
  const draft: PopupDraft = {
    values,
    updatedAt: now.toISOString(),
    ...(review ? { review } : {}),
  };
  await sessionStore.set({ [draftKey(tabId)]: draft });
}

export async function clearDraft(tabId: number | undefined): Promise<void> {
  await sessionStore.remove(draftKey(tabId));
}
