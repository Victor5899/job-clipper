import { canonicalizeUrl, parseHttpUrl, sourceFromUrl } from "../normalize/url";
import type { ValidManualEntry } from "./manualEntry";
import type { JobApplication, Settings } from "./types";

export const SCHEMA_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
  reminders: { enabledByDefault: true, leadDays: 1, atTime: "09:00" },
  profile: { graduationYear: 2027, countryCode: "IN" },
  csv: { includeDescription: false },
};

/**
 * Builds a complete JobApplication from validated manual input. Fields the user has not
 * provided get explicit "unknown"/empty values; nothing is guessed.
 */
export function createJobFromManualEntry(
  entry: ValidManualEntry,
  { id, now }: { id: string; now: Date },
): JobApplication {
  const timestamp = now.toISOString();
  const url = parseHttpUrl(entry.url);
  if (!url) throw new Error("createJobFromManualEntry requires a validated http(s) URL");
  const canonical = canonicalizeUrl(url);

  return {
    id,
    schemaVersion: SCHEMA_VERSION,
    title: entry.title,
    company: entry.company,
    url: url.href,
    canonicalUrl: canonical.canonicalUrl,
    source: sourceFromUrl(url),
    ...(canonical.sourceJobId ? { sourceJobId: canonical.sourceJobId } : {}),
    location: {},
    workArrangement: "unknown",
    eligibleCountries: [],
    eligibility: {
      value: "unknown",
      confidence: "low",
      reasons: [],
      overridden: false,
      classifierVersion: 0,
    },
    visaSponsorship: "unknown",
    studentEligibility: "unknown",
    graduationYears: [],
    employmentType: "unknown",
    experience: { level: "unknown" },
    compensation: { period: "unknown", kind: "unknown" },
    skills: [],
    category: "other",
    status: "saved",
    statusHistory: [{ status: "saved", at: timestamp }],
    savedAt: timestamp,
    updatedAt: timestamp,
    deadline: entry.deadline ? { ...entry.deadline, origin: "user" } : null,
    notes: "",
    reminder: {
      enabled: DEFAULT_SETTINGS.reminders.enabledByDefault,
      mode: "default",
      status: "none",
    },
  };
}
