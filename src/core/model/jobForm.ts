import { isValidDateString, isValidTimeString } from "../deadline";
import { cleanMultiline, cleanText } from "../normalize/text";
import { canonicalizeUrl, parseHttpUrl } from "../normalize/url";
import {
  COMPENSATION_KINDS,
  COMPENSATION_PERIODS,
  EMPLOYMENT_TYPES,
  EXPERIENCE_LEVELS,
  INDIA_ELIGIBILITY,
  JOB_CATEGORIES,
  JOB_STATUSES,
  RESULT_OUTCOMES,
  SOURCE_LABELS,
  STUDENT_ELIGIBILITY,
  VISA_SPONSORSHIP,
  WORK_ARRANGEMENTS,
  type EmploymentType,
  type IndiaEligibility,
  type JobCategory,
  type JobStatus,
  type ResultOutcome,
  type SourceId,
  type StudentEligibility,
  type VisaSponsorship,
  type WorkArrangement,
} from "./enums";
import { MAX_COMPANY_LENGTH, MAX_TITLE_LENGTH } from "./manualEntry";
import type { Deadline, JobApplication } from "./types";

export const MAX_DESCRIPTION_LENGTH = 15_000;
export const MAX_NOTES_LENGTH = 10_000;
const MAX_SKILLS = 30;

/** Every editable field, as typed. Selects store their enum value. */
export interface JobFormValues {
  title: string;
  company: string;
  url: string;
  source: string;
  description: string;
  companyWebsite: string;
  locationRaw: string;
  city: string;
  country: string;
  countryCode: string;
  workArrangement: string;
  eligibleCountries: string;
  eligibility: string;
  workAuthorization: string;
  visaSponsorship: string;
  studentEligibility: string;
  graduationYears: string;
  employmentType: string;
  category: string;
  experienceRaw: string;
  minYears: string;
  maxYears: string;
  experienceLevel: string;
  compensationRaw: string;
  currency: string;
  compensationMin: string;
  compensationMax: string;
  compensationPeriod: string;
  compensationKind: string;
  skills: string;
  status: string;
  result: string;
  appliedDate: string;
  interviewDate: string;
  deadlineDate: string;
  deadlineTime: string;
  notes: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contactProfileUrl: string;
}

export const JOB_FORM_FIELDS = [
  "title",
  "company",
  "url",
  "source",
  "description",
  "companyWebsite",
  "locationRaw",
  "city",
  "country",
  "countryCode",
  "workArrangement",
  "eligibleCountries",
  "eligibility",
  "workAuthorization",
  "visaSponsorship",
  "studentEligibility",
  "graduationYears",
  "employmentType",
  "category",
  "experienceRaw",
  "minYears",
  "maxYears",
  "experienceLevel",
  "compensationRaw",
  "currency",
  "compensationMin",
  "compensationMax",
  "compensationPeriod",
  "compensationKind",
  "skills",
  "status",
  "result",
  "appliedDate",
  "interviewDate",
  "deadlineDate",
  "deadlineTime",
  "notes",
  "contactName",
  "contactEmail",
  "contactPhone",
  "contactProfileUrl",
] as const satisfies readonly (keyof JobFormValues)[];

export type JobFormErrors = Partial<Record<keyof JobFormValues, string>>;

export interface ParsedJobForm {
  title: string;
  company: string;
  url: string;
  source: SourceId;
  description?: string;
  companyWebsite?: string;
  location: JobApplication["location"];
  workArrangement: WorkArrangement;
  eligibleCountries: string[];
  eligibility: IndiaEligibility;
  workAuthorization?: string;
  visaSponsorship: VisaSponsorship;
  studentEligibility: StudentEligibility;
  graduationYears: number[];
  employmentType: EmploymentType;
  experience: JobApplication["experience"];
  compensation: JobApplication["compensation"];
  skills: string[];
  category: JobCategory;
  status: JobStatus;
  result?: ResultOutcome;
  appliedDate: string;
  interviewDate: string;
  deadline: { date: string; time?: string } | null;
  notes: string;
  contact?: NonNullable<JobApplication["contact"]>;
}

function oneOf<T extends string>(value: string, allowed: readonly T[]): T | undefined {
  return (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

function localDate(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function dateToIso(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year!, (month ?? 1) - 1, day ?? 1, 12, 0, 0).toISOString();
}

export function jobToForm(job: JobApplication): JobFormValues {
  return {
    title: job.title,
    company: job.company,
    url: job.url,
    source: job.source,
    description: job.description ?? "",
    companyWebsite: job.companyWebsite ?? "",
    locationRaw: job.location.raw ?? "",
    city: job.location.city ?? "",
    country: job.location.country ?? "",
    countryCode: job.location.countryCode ?? "",
    workArrangement: job.workArrangement,
    eligibleCountries: job.eligibleCountries.join(", "),
    eligibility: job.eligibility.value,
    workAuthorization: job.workAuthorization ?? "",
    visaSponsorship: job.visaSponsorship,
    studentEligibility: job.studentEligibility,
    graduationYears: job.graduationYears.join(", "),
    employmentType: job.employmentType,
    category: job.category,
    experienceRaw: job.experience.raw ?? "",
    minYears: job.experience.minYears?.toString() ?? "",
    maxYears: job.experience.maxYears?.toString() ?? "",
    experienceLevel: job.experience.level,
    compensationRaw: job.compensation.raw ?? "",
    currency: job.compensation.currency ?? "",
    compensationMin: job.compensation.min?.toString() ?? "",
    compensationMax: job.compensation.max?.toString() ?? "",
    compensationPeriod: job.compensation.period,
    compensationKind: job.compensation.kind,
    skills: job.skills.join(", "),
    status: job.status,
    result: job.result ?? "",
    appliedDate: localDate(job.appliedAt),
    interviewDate: localDate(job.interviewAt),
    deadlineDate: job.deadline?.date ?? "",
    deadlineTime: job.deadline?.time ?? "",
    notes: job.notes,
    contactName: job.contact?.name ?? "",
    contactEmail: job.contact?.email ?? "",
    contactPhone: job.contact?.phone ?? "",
    contactProfileUrl: job.contact?.profileUrl ?? "",
  };
}

function optionalNumber(
  raw: string,
  field: keyof JobFormValues,
  errors: JobFormErrors,
  label: string,
): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    errors[field] = `Enter ${label} as a number.`;
    return undefined;
  }
  return Number(trimmed);
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((part) => cleanText(part, 80))
    .filter(Boolean);
}

export function validateJobForm(
  values: JobFormValues,
): { ok: true; value: ParsedJobForm } | { ok: false; errors: JobFormErrors } {
  const errors: JobFormErrors = {};

  const title = cleanText(values.title, MAX_TITLE_LENGTH);
  if (!title) errors.title = "Enter the job title.";
  const company = cleanText(values.company, MAX_COMPANY_LENGTH);
  if (!company) errors.company = "Enter the company name.";

  const rawUrl = values.url.trim();
  const url = parseHttpUrl(rawUrl);
  if (!rawUrl) errors.url = "Enter the link to the job listing.";
  else if (rawUrl.length > 2048) errors.url = "This link is too long.";
  else if (!url) errors.url = "Enter a full web address starting with http:// or https://.";

  const source = oneOf(values.source, Object.keys(SOURCE_LABELS) as SourceId[]);
  if (!source) errors.source = "Choose a source.";

  const website = values.companyWebsite.trim();
  const companyWebsite = website ? parseHttpUrl(website) : undefined;
  if (website && !companyWebsite) {
    errors.companyWebsite = "Enter a full web address starting with http:// or https://.";
  }

  const countryCode = values.countryCode.trim();
  if (countryCode && !/^[A-Za-z]{2}$/.test(countryCode)) {
    errors.countryCode = "Use a two-letter country code.";
  }

  const workArrangement = oneOf(values.workArrangement, WORK_ARRANGEMENTS);
  if (!workArrangement) errors.workArrangement = "Choose a work arrangement.";
  const eligibility = oneOf(values.eligibility, INDIA_ELIGIBILITY);
  if (!eligibility) errors.eligibility = "Choose an eligibility.";
  const visaSponsorship = oneOf(values.visaSponsorship, VISA_SPONSORSHIP);
  if (!visaSponsorship) errors.visaSponsorship = "Choose a visa sponsorship option.";
  const studentEligibility = oneOf(values.studentEligibility, STUDENT_ELIGIBILITY);
  if (!studentEligibility) errors.studentEligibility = "Choose who can apply.";
  const employmentType = oneOf(values.employmentType, EMPLOYMENT_TYPES);
  if (!employmentType) errors.employmentType = "Choose an employment type.";
  const category = oneOf(values.category, JOB_CATEGORIES);
  if (!category) errors.category = "Choose a category.";
  const experienceLevel = oneOf(values.experienceLevel, EXPERIENCE_LEVELS);
  if (!experienceLevel) errors.experienceLevel = "Choose an experience level.";
  const compensationPeriod = oneOf(values.compensationPeriod, COMPENSATION_PERIODS);
  if (!compensationPeriod) errors.compensationPeriod = "Choose a pay period.";
  const compensationKind = oneOf(values.compensationKind, COMPENSATION_KINDS);
  if (!compensationKind) errors.compensationKind = "Choose a pay type.";
  const status = oneOf(values.status, JOB_STATUSES);
  if (!status) errors.status = "Choose a status.";

  let result: ResultOutcome | undefined;
  if (status === "result") {
    result = oneOf(values.result, RESULT_OUTCOMES);
    if (!result) errors.result = "Choose a result.";
  }

  const graduationYears: number[] = [];
  if (values.graduationYears.trim()) {
    for (const part of values.graduationYears.split(",")) {
      const year = part.trim();
      if (!year) continue;
      if (!/^\d{4}$/.test(year) || Number(year) < 1970 || Number(year) > 2045) {
        errors.graduationYears = "Enter graduation years like 2026, 2027.";
        break;
      }
      graduationYears.push(Number(year));
    }
  }

  const minYears = optionalNumber(values.minYears, "minYears", errors, "the minimum years");
  const maxYears = optionalNumber(values.maxYears, "maxYears", errors, "the maximum years");
  if (minYears !== undefined && maxYears !== undefined && minYears > maxYears) {
    errors.maxYears = "The maximum can't be less than the minimum.";
  }
  const compensationMin = optionalNumber(
    values.compensationMin,
    "compensationMin",
    errors,
    "the minimum pay",
  );
  const compensationMax = optionalNumber(
    values.compensationMax,
    "compensationMax",
    errors,
    "the maximum pay",
  );
  if (
    compensationMin !== undefined &&
    compensationMax !== undefined &&
    compensationMin > compensationMax
  ) {
    errors.compensationMax = "The maximum can't be less than the minimum.";
  }

  const skills = splitList(values.skills);
  if (skills.length > MAX_SKILLS) errors.skills = `Enter at most ${MAX_SKILLS} skills.`;

  const appliedDate = values.appliedDate.trim();
  const interviewDate = values.interviewDate.trim();
  if (appliedDate && !isValidDateString(appliedDate))
    errors.appliedDate = "Enter a real calendar date.";
  if (interviewDate && !isValidDateString(interviewDate)) {
    errors.interviewDate = "Enter a real calendar date.";
  }

  const deadlineDate = values.deadlineDate.trim();
  const deadlineTime = values.deadlineTime.trim();
  if (deadlineDate && !isValidDateString(deadlineDate))
    errors.deadlineDate = "Enter a real calendar date.";
  if (deadlineTime && !deadlineDate)
    errors.deadlineTime = "Add a deadline date before adding a time.";
  else if (deadlineTime && !isValidTimeString(deadlineTime))
    errors.deadlineTime = "Enter a time as HH:MM.";

  const email = values.contactEmail.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.contactEmail = "Enter an email address.";
  const phone = values.contactPhone.trim();
  if (phone && phone.replace(/\D/g, "").length < 6) errors.contactPhone = "Enter a phone number.";
  const profile = values.contactProfileUrl.trim();
  const profileUrl = profile ? parseHttpUrl(profile) : undefined;
  if (profile && !profileUrl) {
    errors.contactProfileUrl = "Enter a full web address starting with http:// or https://.";
  }

  if (Object.keys(errors).length > 0 || !url || !source || !status) return { ok: false, errors };

  const location: JobApplication["location"] = {};
  const raw = cleanText(values.locationRaw, 200);
  const city = cleanText(values.city, 80);
  const country = cleanText(values.country, 80);
  if (raw) location.raw = raw;
  if (city) location.city = city;
  if (country) location.country = country;
  if (countryCode) location.countryCode = countryCode.toUpperCase();

  const description = cleanMultiline(values.description, MAX_DESCRIPTION_LENGTH);
  const notes = cleanMultiline(values.notes, MAX_NOTES_LENGTH);
  const contactName = cleanText(values.contactName, 120);
  const contact: NonNullable<JobApplication["contact"]> = {};
  if (contactName) contact.name = contactName;
  if (email) contact.email = email;
  if (phone) contact.phone = phone;
  if (profileUrl) contact.profileUrl = profileUrl.href;

  const workAuthorization = cleanText(values.workAuthorization, 200);

  return {
    ok: true,
    value: {
      title,
      company,
      url: url.href,
      source,
      ...(description ? { description } : {}),
      ...(companyWebsite ? { companyWebsite: companyWebsite.href } : {}),
      location,
      workArrangement: workArrangement ?? "unknown",
      eligibleCountries: splitList(values.eligibleCountries).map((entry) =>
        /^[A-Za-z]{2}$/.test(entry) ? entry.toUpperCase() : entry,
      ),
      eligibility: eligibility ?? "unknown",
      ...(workAuthorization ? { workAuthorization } : {}),
      visaSponsorship: visaSponsorship ?? "unknown",
      studentEligibility: studentEligibility ?? "unknown",
      graduationYears,
      employmentType: employmentType ?? "unknown",
      experience: {
        ...(cleanText(values.experienceRaw, 200)
          ? { raw: cleanText(values.experienceRaw, 200) }
          : {}),
        ...(minYears !== undefined ? { minYears } : {}),
        ...(maxYears !== undefined ? { maxYears } : {}),
        level: experienceLevel ?? "unknown",
      },
      compensation: {
        ...(cleanText(values.compensationRaw, 200)
          ? { raw: cleanText(values.compensationRaw, 200) }
          : {}),
        ...(cleanText(values.currency, 8)
          ? { currency: cleanText(values.currency, 8).toUpperCase() }
          : {}),
        ...(compensationMin !== undefined ? { min: compensationMin } : {}),
        ...(compensationMax !== undefined ? { max: compensationMax } : {}),
        period: compensationPeriod ?? "unknown",
        kind: compensationKind ?? "unknown",
      },
      skills,
      category: category ?? "other",
      status,
      ...(result ? { result } : {}),
      appliedDate,
      interviewDate,
      deadline: deadlineDate
        ? { date: deadlineDate, ...(deadlineTime ? { time: deadlineTime } : {}) }
        : null,
      notes,
      ...(Object.keys(contact).length > 0 ? { contact } : {}),
    },
  };
}

function nextDeadline(existing: Deadline, parsed: ParsedJobForm["deadline"]): Deadline {
  if (!parsed) return null;
  const unchanged = existing?.date === parsed.date && (existing.time ?? "") === (parsed.time ?? "");
  if (unchanged && existing) return existing;
  return { date: parsed.date, ...(parsed.time ? { time: parsed.time } : {}), origin: "user" };
}

/** Applies a validated edit onto the saved job. Identity, save time and extraction are kept. */
export function applyJobEdits(
  existing: JobApplication,
  parsed: ParsedJobForm,
  now: Date,
): JobApplication {
  const deadline = nextDeadline(existing.deadline, parsed.deadline);
  const result = parsed.status === "result" ? parsed.result : undefined;
  const statusChanged = parsed.status !== existing.status || result !== existing.result;
  const appliedAt = parsed.appliedDate
    ? dateToIso(parsed.appliedDate)
    : parsed.status === "applied" && existing.status !== "applied"
      ? now.toISOString()
      : undefined;
  const interviewAt = parsed.interviewDate
    ? dateToIso(parsed.interviewDate)
    : parsed.status === "interview" && existing.status !== "interview"
      ? now.toISOString()
      : undefined;
  const parsedUrl = parseHttpUrl(parsed.url);
  const canonical = parsedUrl ? canonicalizeUrl(parsedUrl) : undefined;

  const next: JobApplication = {
    ...existing,
    title: parsed.title,
    company: parsed.company,
    url: parsed.url,
    canonicalUrl: canonical?.canonicalUrl ?? existing.canonicalUrl,
    source: parsed.source,
    sourceJobId: canonical?.sourceJobId,
    description: parsed.description,
    companyWebsite: parsed.companyWebsite,
    location: parsed.location,
    workArrangement: parsed.workArrangement,
    eligibleCountries: parsed.eligibleCountries,
    eligibility: {
      ...existing.eligibility,
      value: parsed.eligibility,
      overridden:
        existing.eligibility.overridden || parsed.eligibility !== existing.eligibility.value,
    },
    workAuthorization: parsed.workAuthorization,
    visaSponsorship: parsed.visaSponsorship,
    studentEligibility: parsed.studentEligibility,
    graduationYears: parsed.graduationYears,
    employmentType: parsed.employmentType,
    experience: parsed.experience,
    compensation: parsed.compensation,
    skills: parsed.skills,
    category: parsed.category,
    status: parsed.status,
    result,
    statusHistory: statusChanged
      ? [
          ...existing.statusHistory,
          { status: parsed.status, ...(result ? { result } : {}), at: now.toISOString() },
        ]
      : existing.statusHistory,
    updatedAt: now.toISOString(),
    appliedAt,
    interviewAt,
    deadline,
    notes: parsed.notes,
    contact: parsed.contact,
    reminder: deadline
      ? existing.reminder
      : { ...existing.reminder, remindAt: undefined, status: "none", firedAt: undefined },
  };
  if (!next.sourceJobId) delete next.sourceJobId;
  if (!next.description) delete next.description;
  if (!next.companyWebsite) delete next.companyWebsite;
  if (!next.workAuthorization) delete next.workAuthorization;
  if (!next.result) delete next.result;
  if (!next.appliedAt) delete next.appliedAt;
  if (!next.interviewAt) delete next.interviewAt;
  if (!next.contact) delete next.contact;
  return next;
}
