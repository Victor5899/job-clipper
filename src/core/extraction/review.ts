import type { JobFormValues } from "../model/jobForm";
import type {
  EmploymentType,
  IndiaEligibility,
  JobCategory,
  SourceId,
  VisaSponsorship,
  WorkArrangement,
} from "../model/enums";
import type { StudentEligibility } from "../model/enums";
import { classify } from "../eligibility/classify";
import type { ExtractedJob, FieldSource } from "./types";
import { categorize } from "../normalize/category";
import { parseExperience } from "../normalize/experience";
import { parseLocation } from "../normalize/location";
import { parseCompensation } from "../normalize/salary";
import { parseHttpUrl, sourceFromUrl } from "../normalize/url";

export interface ClipReview {
  source: SourceId;
  adapter: string;
  adapterVersion: number;
  fieldSources: Record<string, FieldSource>;
  title: string;
  company: string;
  url: string;
  deadlineDate: string;
  deadlineTime: string;
  deadlineEvidence?: string;
  detectedDeadlineDate?: string;
  location: string;
  workArrangement: WorkArrangement;
  employmentType: EmploymentType;
  experience: string;
  compensation: string;
  skills: string;
  description: string;
  category: JobCategory;
  eligibility: IndiaEligibility;
  eligibilityConfidence: "high" | "medium" | "low";
  eligibilityReasons: string[];
  suggestedEligibility: IndiaEligibility;
  visaSponsorship: VisaSponsorship;
  studentEligibility: StudentEligibility;
  graduationYears: string;
  eligibleCountries: string;
  workAuthorization: string;
  missing: string[];
  detectedCount: number;
  trackedCount: number;
}

const TRACKED: { label: string; present: (review: ClipReview) => boolean }[] = [
  { label: "Job title", present: (review) => review.title.trim().length > 0 },
  { label: "Company", present: (review) => review.company.trim().length > 0 },
  { label: "Job URL", present: (review) => review.url.trim().length > 0 },
  { label: "Deadline", present: (review) => review.deadlineDate.trim().length > 0 },
  { label: "Location", present: (review) => review.location.trim().length > 0 },
  {
    label: "Work arrangement",
    present: (review) => review.workArrangement !== "unknown",
  },
  {
    label: "Employment type",
    present: (review) => review.employmentType !== "unknown",
  },
  { label: "Experience", present: (review) => review.experience.trim().length > 0 },
  { label: "Salary", present: (review) => review.compensation.trim().length > 0 },
  { label: "Description", present: (review) => review.description.trim().length > 0 },
  { label: "Skills", present: (review) => review.skills.trim().length > 0 },
];

function withCounts(
  review: Omit<ClipReview, "missing" | "detectedCount" | "trackedCount">,
): ClipReview {
  const missing = TRACKED.filter((field) => !field.present(review as ClipReview)).map(
    (field) => field.label,
  );
  return {
    ...review,
    missing,
    detectedCount: TRACKED.length - missing.length,
    trackedCount: TRACKED.length,
  };
}

function classificationFor(
  review: Omit<
    ClipReview,
    | "eligibility"
    | "eligibilityConfidence"
    | "eligibilityReasons"
    | "suggestedEligibility"
    | "visaSponsorship"
    | "studentEligibility"
    | "graduationYears"
    | "workAuthorization"
    | "missing"
    | "detectedCount"
    | "trackedCount"
  >,
  graduationYear: number,
) {
  const result = classify({
    workArrangement: review.workArrangement,
    locationRaw: review.location,
    text: `${review.location}\n${review.description}`.slice(0, 8_000),
    eligibleCountries: review.eligibleCountries
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
    applicantLocations: review.eligibleCountries
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
    source: review.source,
    workFromHome:
      review.workArrangement === "remote" && /work from home|\bwfh\b/i.test(review.location),
    profileGraduationYear: graduationYear,
  });
  return result;
}

/** Turns a content-script payload into an editable preview. Does not save anything. */
export function buildClipReview(extracted: ExtractedJob, graduationYear = 2027): ClipReview {
  const location = extracted.locationRaw ?? "";
  const base = {
    source: extracted.source,
    adapter: extracted.adapter,
    adapterVersion: extracted.adapterVersion,
    fieldSources: extracted.fieldSources,
    title: extracted.title ?? "",
    company: extracted.company ?? "",
    url: extracted.url,
    deadlineDate: extracted.deadline?.date ?? "",
    deadlineTime: "",
    ...(extracted.deadline?.evidence ? { deadlineEvidence: extracted.deadline.evidence } : {}),
    ...(extracted.deadline?.date ? { detectedDeadlineDate: extracted.deadline.date } : {}),
    location,
    workArrangement: extracted.workArrangement ?? "unknown",
    employmentType: extracted.employmentType ?? "unknown",
    experience: extracted.experienceRaw ?? "",
    compensation: extracted.compensationRaw ?? "",
    skills: (extracted.skills ?? []).join(", "),
    description: extracted.description ?? "",
    category: categorize(extracted.title ?? "", extracted.description ?? ""),
    eligibleCountries: [
      ...(extracted.eligibleCountries ?? []),
      ...(extracted.applicantLocations ?? []),
    ]
      .filter((entry, index, all) => all.indexOf(entry) === index)
      .join(", "),
  };
  const classified = classificationFor(base, graduationYear);
  return withCounts({
    ...base,
    eligibility: classified.value,
    eligibilityConfidence: classified.confidence,
    eligibilityReasons: classified.reasons,
    suggestedEligibility: classified.value,
    visaSponsorship: classified.visaSponsorship,
    studentEligibility: classified.studentEligibility,
    graduationYears: classified.graduationYears.join(", "),
    workAuthorization: "",
  });
}

/** Recomputes eligibility from the edited preview unless the user has already corrected it. */
export function refreshEligibility(
  review: ClipReview,
  graduationYear: number,
  dirty: boolean,
): ClipReview {
  if (dirty) return withCounts(review);
  const classified = classificationFor(review, graduationYear);
  return withCounts({
    ...review,
    category: categorize(review.title, review.description),
    eligibility: classified.value,
    eligibilityConfidence: classified.confidence,
    eligibilityReasons: classified.reasons,
    suggestedEligibility: classified.value,
    visaSponsorship: classified.visaSponsorship,
    studentEligibility: classified.studentEligibility,
    graduationYears: classified.graduationYears.join(", "),
  });
}

export function reviewToJobForm(review: ClipReview): JobFormValues {
  const location = parseLocation(review.location);
  const experience = parseExperience(review.experience);
  const compensation = parseCompensation(review.compensation, {
    kind: review.employmentType === "internship" ? "stipend" : undefined,
  });
  const url = parseHttpUrl(review.url);
  return {
    title: review.title,
    company: review.company,
    url: review.url,
    source: url ? sourceFromUrl(url) : review.source,
    description: review.description,
    companyWebsite: "",
    locationRaw: location.raw ?? "",
    city: location.city ?? "",
    country: location.country ?? "",
    countryCode: location.countryCode ?? "",
    workArrangement: review.workArrangement,
    eligibleCountries: review.eligibleCountries,
    eligibility: review.eligibility,
    workAuthorization: review.workAuthorization,
    visaSponsorship: review.visaSponsorship,
    studentEligibility: review.studentEligibility,
    graduationYears: review.graduationYears,
    employmentType: review.employmentType,
    category: categorize(review.title, review.description),
    experienceRaw: experience.raw ?? review.experience,
    minYears: experience.minYears?.toString() ?? "",
    maxYears: experience.maxYears?.toString() ?? "",
    experienceLevel: experience.level,
    compensationRaw: compensation.raw ?? "",
    currency: compensation.currency ?? "",
    compensationMin: compensation.min?.toString() ?? "",
    compensationMax: compensation.max?.toString() ?? "",
    compensationPeriod: compensation.period,
    compensationKind: compensation.kind,
    skills: review.skills,
    status: "saved",
    result: "",
    appliedDate: "",
    interviewDate: "",
    deadlineDate: review.deadlineDate,
    deadlineTime: review.deadlineTime,
    notes: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    contactProfileUrl: "",
  };
}
