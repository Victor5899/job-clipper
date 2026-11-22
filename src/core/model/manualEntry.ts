import { isValidDateString, isValidTimeString } from "../deadline";
import { cleanText } from "../normalize/text";
import { MAX_URL_LENGTH, parseHttpUrl } from "../normalize/url";

export const MAX_TITLE_LENGTH = 300;
export const MAX_COMPANY_LENGTH = 200;

/** Raw form values exactly as typed. */
export interface ManualEntryValues {
  title: string;
  company: string;
  url: string;
  deadlineDate: string;
  deadlineTime: string;
}

export const EMPTY_MANUAL_ENTRY: ManualEntryValues = {
  title: "",
  company: "",
  url: "",
  deadlineDate: "",
  deadlineTime: "",
};

export interface ValidManualEntry {
  title: string;
  company: string;
  url: string;
  deadline: { date: string; time?: string } | null;
}

export type ManualEntryErrors = Partial<Record<keyof ManualEntryValues, string>>;

/** Drops one field's error, e.g. once the user edits that field. */
export function clearFieldError(
  errors: ManualEntryErrors,
  field: keyof ManualEntryValues,
): ManualEntryErrors {
  if (!(field in errors)) return errors;
  const next = { ...errors };
  delete next[field];
  return next;
}

export type ManualEntryResult =
  { ok: true; value: ValidManualEntry } | { ok: false; errors: ManualEntryErrors };

export function validateManualEntry(values: ManualEntryValues): ManualEntryResult {
  const errors: ManualEntryErrors = {};

  const title = cleanText(values.title, MAX_TITLE_LENGTH);
  if (!title) errors.title = "Enter the job title.";

  const company = cleanText(values.company, MAX_COMPANY_LENGTH);
  if (!company) errors.company = "Enter the company name.";

  const rawUrl = values.url.trim();
  const url = parseHttpUrl(rawUrl);
  if (!rawUrl) errors.url = "Enter the link to the job listing.";
  else if (rawUrl.length > MAX_URL_LENGTH) errors.url = "This link is too long.";
  else if (!url) errors.url = "Enter a full web address starting with http:// or https://.";

  const date = values.deadlineDate.trim();
  const time = values.deadlineTime.trim();
  if (date && !isValidDateString(date)) errors.deadlineDate = "Enter a real calendar date.";
  if (time && !date) errors.deadlineTime = "Add a deadline date before adding a time.";
  else if (time && !isValidTimeString(time)) errors.deadlineTime = "Enter a time as HH:MM.";

  if (Object.keys(errors).length > 0 || !url) return { ok: false, errors };

  return {
    ok: true,
    value: {
      title,
      company,
      url: url.href,
      deadline: date ? { date, ...(time ? { time } : {}) } : null,
    },
  };
}
