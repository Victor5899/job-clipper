import { canonicalizeUrl, parseHttpUrl } from "../normalize/url";
import type { ParsedJobForm } from "./jobForm";
import { DEFAULT_SETTINGS, SCHEMA_VERSION } from "./defaults";
import type { Deadline, JobApplication } from "./types";

export interface ReviewedJobMeta {
  id: string;
  now: Date;
  deadlineOrigin: "page_label" | "user";
  deadlineEvidence?: string;
  eligibility: JobApplication["eligibility"];
  extraction?: JobApplication["extraction"];
}

/** Builds a saved job from a reviewed extraction. The form has already been validated. */
export function buildReviewedJob(parsed: ParsedJobForm, meta: ReviewedJobMeta): JobApplication {
  const url = parseHttpUrl(parsed.url);
  if (!url) throw new Error("buildReviewedJob requires a validated http(s) URL");
  const canonical = canonicalizeUrl(url);
  const timestamp = meta.now.toISOString();
  const deadline = reviewedDeadline(parsed, meta);

  const job: JobApplication = {
    id: meta.id,
    schemaVersion: SCHEMA_VERSION,
    title: parsed.title,
    company: parsed.company,
    url: url.href,
    canonicalUrl: canonical.canonicalUrl,
    source: parsed.source,
    ...(canonical.sourceJobId ? { sourceJobId: canonical.sourceJobId } : {}),
    ...(parsed.description ? { description: parsed.description } : {}),
    ...(parsed.companyWebsite ? { companyWebsite: parsed.companyWebsite } : {}),
    location: parsed.location,
    workArrangement: parsed.workArrangement,
    eligibleCountries: parsed.eligibleCountries,
    eligibility: { ...meta.eligibility, value: parsed.eligibility },
    ...(parsed.workAuthorization ? { workAuthorization: parsed.workAuthorization } : {}),
    visaSponsorship: parsed.visaSponsorship,
    studentEligibility: parsed.studentEligibility,
    graduationYears: parsed.graduationYears,
    employmentType: parsed.employmentType,
    experience: parsed.experience,
    compensation: parsed.compensation,
    skills: parsed.skills,
    category: parsed.category,
    status: "saved",
    statusHistory: [{ status: "saved", at: timestamp }],
    savedAt: timestamp,
    updatedAt: timestamp,
    deadline,
    notes: parsed.notes,
    ...(parsed.contact ? { contact: parsed.contact } : {}),
    reminder: {
      enabled: DEFAULT_SETTINGS.reminders.enabledByDefault,
      mode: "default",
      status: "none",
    },
    ...(meta.extraction ? { extraction: meta.extraction } : {}),
  };
  return job;
}

function reviewedDeadline(parsed: ParsedJobForm, meta: ReviewedJobMeta): Deadline {
  if (!parsed.deadline) return null;
  const keepLabel =
    meta.deadlineOrigin === "page_label" &&
    Boolean(meta.deadlineEvidence) &&
    meta.deadlineEvidence !== undefined;
  if (!keepLabel || !meta.deadlineEvidence) {
    return {
      date: parsed.deadline.date,
      ...(parsed.deadline.time ? { time: parsed.deadline.time } : {}),
      origin: "user",
    };
  }
  return {
    date: parsed.deadline.date,
    ...(parsed.deadline.time ? { time: parsed.deadline.time } : {}),
    origin: "page_label",
    evidence: meta.deadlineEvidence,
  };
}
