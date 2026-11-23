import type { IndiaEligibility, SourceId, WorkArrangement } from "../model/enums";
import type { StudentEligibility, VisaSponsorship } from "../model/enums";
import { parseLocation } from "../normalize/location";
import { countrySignal } from "./countries";
import {
  graduationYearsIn,
  mentionsIndiaRemote,
  mentionsRestriction,
  mentionsTimeZoneOverlap,
  mentionsVisaNo,
  mentionsVisaYes,
  mentionsWorkFromHome,
  mentionsWorldwide,
  studentSignalIn,
} from "./phrases";

export const CLASSIFIER_VERSION = 1;

export interface ClassifyInput {
  workArrangement: WorkArrangement;
  locationRaw?: string;
  countryCode?: string;
  eligibleCountries?: string[];
  /** Description and other visible listing text. Deadlines are never read from this. */
  text?: string;
  /** Names or ISO codes from structured applicant-location data. */
  applicantLocations?: string[];
  source?: SourceId;
  workFromHome?: boolean;
  override?: { value: IndiaEligibility };
  profileGraduationYear?: number;
}

export interface Classification {
  value: IndiaEligibility;
  confidence: "high" | "medium" | "low";
  reasons: string[];
  evidence: string[];
  visaSponsorship: VisaSponsorship;
  studentEligibility: StudentEligibility;
  graduationYears: number[];
  batchNote?: string;
}

function clip(value: string): string {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
}

function includesIndia(values: string[]): boolean {
  return values.some((value) => {
    const text = value.trim().toLowerCase();
    return text === "in" || text === "india" || text === "republic of india";
  });
}

function decided(
  value: IndiaEligibility,
  confidence: Classification["confidence"],
  reasons: string[],
  evidence: string[],
  extra: Pick<
    Classification,
    "visaSponsorship" | "studentEligibility" | "graduationYears" | "batchNote"
  >,
): Classification {
  return {
    value,
    confidence,
    reasons,
    evidence: evidence.map(clip).filter(Boolean).slice(0, 4),
    ...extra,
  };
}

/**
 * Evidence-based India eligibility. Work arrangement is separate.
 * A bare "Remote" or "Work from home" label is Unknown, including on India-focused sites.
 * A user override is returned unchanged apart from the supporting batch and visa notes.
 */
export function classify(input: ClassifyInput): Classification {
  const text = input.text ?? "";
  const location = parseLocation(input.locationRaw);
  const inIndia = location.inIndia || input.countryCode === "IN";
  const outsideIndia =
    location.outsideIndia || (Boolean(input.countryCode) && input.countryCode !== "IN" && !inIndia);
  const countries = input.eligibleCountries ?? [];
  const applicants = input.applicantLocations ?? [];
  const signals = [...countries, ...applicants].map((entry) => countrySignal(entry));
  const indiaFromList =
    signals.includes("india") || includesIndia(countries) || includesIndia(applicants);
  const worldwideFromList = signals.includes("worldwide");
  const indiaEligible = indiaFromList || mentionsIndiaRemote(text);
  const worldwide =
    mentionsWorldwide(text) ||
    worldwideFromList ||
    countries.some((entry) => /worldwide|anywhere/i.test(entry));
  const restricted =
    mentionsRestriction(text) || (signals.includes("restricted") && !indiaFromList);
  const workFromHome = input.workFromHome || mentionsWorkFromHome(input.locationRaw ?? "");
  const arrangement = input.workArrangement;
  const visaYes = mentionsVisaYes(text);
  const visaNo = mentionsVisaNo(text);
  const visaSponsorship: VisaSponsorship = visaYes === visaNo ? "unknown" : visaYes ? "yes" : "no";
  const graduationYears = graduationYearsIn(text);
  const studentEligibility = studentSignalIn(text);
  const profileYear = input.profileGraduationYear;
  let batchNote: string | undefined;
  if (profileYear && graduationYears.length > 0) {
    batchNote = graduationYears.includes(profileYear)
      ? `Matches ${profileYear} batch`
      : `Excludes ${profileYear}`;
  }

  const extra = {
    visaSponsorship,
    studentEligibility,
    graduationYears,
    ...(batchNote ? { batchNote } : {}),
  };
  const notes: string[] = [];
  if (mentionsTimeZoneOverlap(text)) {
    notes.push("A time-zone overlap is mentioned. That is not treated as a region restriction.");
  }
  if (batchNote) notes.push(batchNote);

  if (input.override) {
    return decided(input.override.value, "high", ["You corrected this.", ...notes], [], extra);
  }

  const evidence: string[] = [];
  if (location.raw) evidence.push(location.raw);
  if (indiaEligible) {
    const fromList = [...countries, ...applicants].find((entry) => includesIndia([entry]));
    evidence.push(fromList ?? "India is named as an eligible location");
  }

  if ((arrangement === "onsite" || arrangement === "hybrid") && inIndia) {
    return decided(
      arrangement === "hybrid" ? "india_hybrid" : "india_onsite",
      "high",
      [
        arrangement === "hybrid"
          ? "Hybrid, and the location is in India."
          : "On-site, and the location is in India.",
        ...notes,
      ],
      evidence,
      extra,
    );
  }

  const remote =
    arrangement === "remote" ||
    (arrangement === "unknown" && (indiaEligible || (worldwide && !restricted) || workFromHome));

  if (remote && indiaEligible && !restricted) {
    return decided(
      "remote_india",
      "high",
      ["Remote, and India is explicitly eligible.", ...notes],
      evidence,
      extra,
    );
  }

  if (remote && indiaEligible && restricted) {
    return decided(
      "unknown",
      "low",
      ["The listing both includes India and states a location restriction.", ...notes],
      evidence,
      extra,
    );
  }

  if (remote && worldwide && !restricted) {
    return decided(
      "remote_worldwide",
      "high",
      ["Remote, and the listing says it is open worldwide.", ...notes],
      evidence,
      extra,
    );
  }

  if (remote && worldwide && restricted) {
    return decided(
      "unknown",
      "low",
      ["The listing says worldwide and also names a restriction.", ...notes],
      evidence,
      extra,
    );
  }

  if (remote && restricted) {
    return decided(
      "remote_restricted",
      "high",
      ["Remote, and the listing limits who can apply by region.", ...notes],
      evidence,
      extra,
    );
  }

  if ((arrangement === "onsite" || arrangement === "hybrid") && outsideIndia) {
    return decided(
      "international_relocation",
      "high",
      [
        arrangement === "hybrid"
          ? "Hybrid outside India, so relocation would be required."
          : "On-site outside India, so relocation would be required.",
        ...notes,
      ],
      evidence,
      extra,
    );
  }

  if (arrangement === "remote" || workFromHome) {
    return decided(
      "unknown",
      "low",
      [
        workFromHome
          ? "Work from home does not say that applicants in India can apply."
          : "Remote, with no evidence that applicants in India can apply.",
        ...notes,
      ],
      evidence,
      extra,
    );
  }

  if (inIndia) {
    return decided(
      "unknown",
      "low",
      [
        "The location looks like India, but the page does not say on-site, hybrid, or remote.",
        ...notes,
      ],
      evidence,
      extra,
    );
  }

  return decided(
    "unknown",
    "low",
    ["There isn't enough location evidence to classify this for an applicant in India.", ...notes],
    evidence,
    extra,
  );
}
