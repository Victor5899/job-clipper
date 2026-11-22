import { isValidDateString, isValidTimeString } from "../deadline";
import {
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
  type ExperienceLevel,
  type IndiaEligibility,
  type JobCategory,
  type JobStatus,
  type ResultOutcome,
  type SourceId,
  type StudentEligibility,
  type VisaSponsorship,
  type WorkArrangement,
} from "../model/enums";
import { SCHEMA_VERSION } from "../model/defaults";
import type { JobApplication, Settings } from "../model/types";
import { MAX_COMPANY_LENGTH, MAX_TITLE_LENGTH } from "../model/manualEntry";
import { MAX_DESCRIPTION_LENGTH, MAX_NOTES_LENGTH } from "../model/jobForm";
import { parseHttpUrl } from "../normalize/url";
import { isLeadPreset } from "../reminders/computeRemindAt";
import { MAX_BACKUP_BYTES, MAX_BACKUP_JOBS, utf8Bytes } from "./limits";
import { BACKUP_APP, type BackupFile, type ParseResult } from "./types";

const SOURCE_IDS = Object.keys(SOURCE_LABELS) as SourceId[];
const FIELD_SOURCES = ["jsonld", "adapter", "meta", "heuristic", "user"] as const;
const REMINDER_STATUSES = ["none", "scheduled", "fired", "missed", "expired"] as const;
const CONFIDENCE = ["high", "medium", "low"] as const;
const COMPENSATION_PERIODS = ["month", "year", "hour", "lumpsum", "unknown"] as const;
const COMPENSATION_KINDS = ["salary", "stipend", "unknown"] as const;

const JOB_KEYS = [
  "id",
  "schemaVersion",
  "title",
  "company",
  "url",
  "canonicalUrl",
  "source",
  "sourceJobId",
  "description",
  "companyWebsite",
  "location",
  "workArrangement",
  "eligibleCountries",
  "eligibility",
  "workAuthorization",
  "visaSponsorship",
  "studentEligibility",
  "graduationYears",
  "employmentType",
  "experience",
  "compensation",
  "skills",
  "category",
  "status",
  "result",
  "statusHistory",
  "savedAt",
  "updatedAt",
  "appliedAt",
  "interviewAt",
  "deadline",
  "notes",
  "contact",
  "reminder",
  "extraction",
] as const;

const ENVELOPE_KEYS = ["app", "schemaVersion", "exportedAt", "jobs", "settings"];

function failure(errors: string[]): ParseResult {
  const lines = errors.slice(0, 11);
  if (!lines.some((line) => line.includes("Nothing was changed")))
    lines.push("Nothing was changed.");
  return { ok: false, errors: lines };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function unknownKey(obj: Record<string, unknown>, allowed: readonly string[]): string | null {
  for (const key of Object.keys(obj)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      return `contains a forbidden field "${key}"`;
    }
    if (!allowed.includes(key)) return `contains an unknown field "${key}"`;
  }
  return null;
}

function hasControl(value: string, multiline: boolean): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code === 0x7f || (code >= 0x00 && code < 0x20 && code !== 0x09)) {
      if (multiline && (code === 0x0a || code === 0x0d)) continue;
      return true;
    }
    if (!multiline && code === 0x09) return true;
  }
  return false;
}

function readLine(value: unknown, max: number): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > max) return null;
  if (value !== value.trim() || hasControl(value, false)) return null;
  return value;
}

function readText(value: unknown, max: number, multiline: boolean): string | null {
  if (typeof value !== "string" || value.length > max) return null;
  if (hasControl(value, multiline)) return null;
  return value;
}

function readEnum<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  if (typeof value !== "string") return null;
  return (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

function readInt(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max)
    return null;
  return value;
}

function readAmount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1e15)
    return null;
  return value;
}

function readYears(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 80) return null;
  return value;
}

function readInstant(value: unknown): string | null {
  if (typeof value !== "string" || value.length < 8 || value.length > 40) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return value;
}

function readHttp(value: unknown): string | null {
  if (typeof value !== "string" || value !== value.trim()) return null;
  if (!parseHttpUrl(value)) return null;
  return value;
}

function clip(value: string): string {
  return value.length > 80 ? `${value.slice(0, 77)}...` : value;
}

function applicationLabel(index: number, value: unknown): string {
  const record = isRecord(value) ? value : null;
  const title = record && typeof record.title === "string" ? clip(record.title) : "";
  const company = record && typeof record.company === "string" ? clip(record.company) : "";
  const who = title && company ? ` (${title} at ${company})` : title ? ` (${title})` : "";
  return `Application ${index + 1}${who}`;
}

function readStringList(
  value: unknown,
  maxItems: number,
  maxLength: number,
  label: string,
): string[] | string {
  if (!Array.isArray(value) || value.length > maxItems)
    return `${label} is not a short list of text`;
  const items: string[] = [];
  for (const item of value) {
    const text = readLine(item, maxLength);
    if (text === null) return `${label} has an entry that is empty or too long`;
    items.push(text);
  }
  return items;
}

function readJob(value: unknown, index: number): JobApplication | string {
  const label = applicationLabel(index, value);
  if (!isRecord(value)) return `${label} is not an object.`;
  const extra = unknownKey(value, JOB_KEYS);
  if (extra) return `${label} ${extra}.`;

  const id = readLine(value.id, 80);
  if (id === null || !/^[A-Za-z0-9_-]+$/.test(id)) return `${label} has an invalid id.`;
  if (value.schemaVersion !== SCHEMA_VERSION) return `${label} uses an unsupported schema.`;

  const title = readLine(value.title, MAX_TITLE_LENGTH);
  if (title === null) return `${label} needs a job title.`;
  const company = readLine(value.company, MAX_COMPANY_LENGTH);
  if (company === null) return `${label} needs a company.`;
  const url = readHttp(value.url);
  if (url === null) return `${label} needs an http or https link.`;
  const canonicalUrl = readHttp(value.canonicalUrl);
  if (canonicalUrl === null) return `${label} has an invalid canonical link.`;

  const source = readEnum(value.source, SOURCE_IDS);
  if (!source) return `${label} has an unknown source.`;
  const status = readEnum<JobStatus>(value.status, JOB_STATUSES);
  if (!status) return `${label} has an unknown status.`;
  const workArrangement = readEnum<WorkArrangement>(value.workArrangement, WORK_ARRANGEMENTS);
  if (!workArrangement) return `${label} has an unknown work arrangement.`;
  const employmentType = readEnum<EmploymentType>(value.employmentType, EMPLOYMENT_TYPES);
  if (!employmentType) return `${label} has an unknown employment type.`;
  const category = readEnum<JobCategory>(value.category, JOB_CATEGORIES);
  if (!category) return `${label} has an unknown category.`;
  const visaSponsorship = readEnum<VisaSponsorship>(value.visaSponsorship, VISA_SPONSORSHIP);
  if (!visaSponsorship) return `${label} has an unknown visa value.`;
  const studentEligibility = readEnum<StudentEligibility>(
    value.studentEligibility,
    STUDENT_ELIGIBILITY,
  );
  if (!studentEligibility) return `${label} has an unknown student eligibility.`;

  if (!isRecord(value.location)) return `${label} is missing a location.`;
  const locationExtra = unknownKey(value.location, ["raw", "city", "country", "countryCode"]);
  if (locationExtra) return `${label} location ${locationExtra}.`;
  const location: JobApplication["location"] = {};
  if ("raw" in value.location) {
    const raw = readText(value.location.raw, 200, false);
    if (raw === null) return `${label} has an invalid location.`;
    location.raw = raw;
  }
  if ("city" in value.location) {
    const city = readText(value.location.city, 80, false);
    if (city === null) return `${label} has an invalid city.`;
    location.city = city;
  }
  if ("country" in value.location) {
    const country = readText(value.location.country, 80, false);
    if (country === null) return `${label} has an invalid country.`;
    location.country = country;
  }
  if ("countryCode" in value.location) {
    const countryCode = readLine(value.location.countryCode, 2);
    if (countryCode === null || !/^[A-Za-z]{2}$/.test(countryCode)) {
      return `${label} has an invalid country code.`;
    }
    location.countryCode = countryCode;
  }

  if (!isRecord(value.eligibility)) return `${label} is missing India eligibility.`;
  const eligibilityExtra = unknownKey(value.eligibility, [
    "value",
    "confidence",
    "reasons",
    "overridden",
    "classifierVersion",
  ]);
  if (eligibilityExtra) return `${label} eligibility ${eligibilityExtra}.`;
  const eligibilityValue = readEnum<IndiaEligibility>(value.eligibility.value, INDIA_ELIGIBILITY);
  const confidence = readEnum(value.eligibility.confidence, CONFIDENCE);
  const classifierVersion = readInt(value.eligibility.classifierVersion, 0, 1000);
  if (!eligibilityValue || !confidence || classifierVersion === null) {
    return `${label} has invalid India eligibility.`;
  }
  if (typeof value.eligibility.overridden !== "boolean") {
    return `${label} has invalid India eligibility.`;
  }
  const reasons = readStringList(value.eligibility.reasons, 20, 300, "Eligibility reasons");
  if (typeof reasons === "string") return `${label}: ${reasons}.`;

  const skills = readStringList(value.skills, 40, 100, "Skills");
  if (typeof skills === "string") return `${label}: ${skills}.`;
  const eligibleCountries = readStringList(value.eligibleCountries, 40, 80, "Eligible countries");
  if (typeof eligibleCountries === "string") return `${label}: ${eligibleCountries}.`;
  if (!Array.isArray(value.graduationYears) || value.graduationYears.length > 20) {
    return `${label} has invalid graduation years.`;
  }
  const graduationYears: number[] = [];
  for (const year of value.graduationYears) {
    const parsed = readInt(year, 1900, 2100);
    if (parsed === null) return `${label} has invalid graduation years.`;
    graduationYears.push(parsed);
  }

  if (!isRecord(value.experience)) return `${label} is missing experience.`;
  const experienceExtra = unknownKey(value.experience, ["raw", "minYears", "maxYears", "level"]);
  if (experienceExtra) return `${label} experience ${experienceExtra}.`;
  const level = readEnum<ExperienceLevel>(value.experience.level, EXPERIENCE_LEVELS);
  if (!level) return `${label} has an unknown experience level.`;
  const experience: JobApplication["experience"] = { level };
  if ("raw" in value.experience) {
    const raw = readText(value.experience.raw, 200, false);
    if (raw === null) return `${label} has an invalid experience line.`;
    experience.raw = raw;
  }
  if ("minYears" in value.experience) {
    const minYears = readYears(value.experience.minYears);
    if (minYears === null) return `${label} has an invalid minimum experience.`;
    experience.minYears = minYears;
  }
  if ("maxYears" in value.experience) {
    const maxYears = readYears(value.experience.maxYears);
    if (maxYears === null) return `${label} has an invalid maximum experience.`;
    experience.maxYears = maxYears;
  }

  if (!isRecord(value.compensation)) return `${label} is missing compensation.`;
  const compensationExtra = unknownKey(value.compensation, [
    "raw",
    "currency",
    "min",
    "max",
    "period",
    "kind",
  ]);
  if (compensationExtra) return `${label} compensation ${compensationExtra}.`;
  const period = readEnum(value.compensation.period, COMPENSATION_PERIODS);
  const kind = readEnum(value.compensation.kind, COMPENSATION_KINDS);
  if (!period || !kind) return `${label} has an unknown compensation period or kind.`;
  const compensation: JobApplication["compensation"] = { period, kind };
  if ("raw" in value.compensation) {
    const raw = readText(value.compensation.raw, 200, false);
    if (raw === null) return `${label} has an invalid salary line.`;
    compensation.raw = raw;
  }
  if ("currency" in value.compensation) {
    const currency = readLine(value.compensation.currency, 8);
    if (currency === null || !/^[A-Za-z]{1,8}$/.test(currency)) {
      return `${label} has an invalid currency.`;
    }
    compensation.currency = currency;
  }
  if ("min" in value.compensation) {
    const min = readAmount(value.compensation.min);
    if (min === null) return `${label} has an invalid compensation amount.`;
    compensation.min = min;
  }
  if ("max" in value.compensation) {
    const max = readAmount(value.compensation.max);
    if (max === null) return `${label} has an invalid compensation amount.`;
    compensation.max = max;
  }

  const savedAt = readInstant(value.savedAt);
  const updatedAt = readInstant(value.updatedAt);
  if (!savedAt || !updatedAt) return `${label} has an invalid saved or updated time.`;
  const notes = readText(value.notes, MAX_NOTES_LENGTH, true);
  if (notes === null || typeof value.notes !== "string") return `${label} has invalid notes.`;

  if (!Array.isArray(value.statusHistory) || value.statusHistory.length > 100) {
    return `${label} has an invalid status history.`;
  }
  const statusHistory: JobApplication["statusHistory"] = [];
  for (const entry of value.statusHistory) {
    if (!isRecord(entry)) return `${label} has an invalid status history.`;
    const entryExtra = unknownKey(entry, ["status", "result", "at"]);
    if (entryExtra) return `${label} status history ${entryExtra}.`;
    const entryStatus = readEnum<JobStatus>(entry.status, JOB_STATUSES);
    const at = readInstant(entry.at);
    if (!entryStatus || !at) return `${label} has an invalid status history.`;
    const next: JobApplication["statusHistory"][number] = { status: entryStatus, at };
    if ("result" in entry) {
      const result = readEnum<ResultOutcome>(entry.result, RESULT_OUTCOMES);
      if (!result) return `${label} has an invalid result in its history.`;
      next.result = result;
    }
    statusHistory.push(next);
  }

  let deadline: JobApplication["deadline"] = null;
  if (value.deadline !== null) {
    if (!isRecord(value.deadline)) return `${label} has an invalid deadline.`;
    const deadlineExtra = unknownKey(value.deadline, ["date", "time", "origin", "evidence"]);
    if (deadlineExtra) return `${label} deadline ${deadlineExtra}.`;
    if (typeof value.deadline.date !== "string" || !isValidDateString(value.deadline.date)) {
      return `${label} has an invalid deadline date.`;
    }
    if (value.deadline.origin !== "page_label" && value.deadline.origin !== "user") {
      return `${label} has an invalid deadline source.`;
    }
    deadline = { date: value.deadline.date, origin: value.deadline.origin };
    if ("time" in value.deadline) {
      if (typeof value.deadline.time !== "string" || !isValidTimeString(value.deadline.time)) {
        return `${label} has an invalid deadline time.`;
      }
      deadline.time = value.deadline.time;
    }
    if ("evidence" in value.deadline) {
      const evidence = readText(value.deadline.evidence, 300, false);
      if (evidence === null) return `${label} has invalid deadline evidence.`;
      deadline.evidence = evidence;
    }
  }

  if (!isRecord(value.reminder)) return `${label} is missing a reminder.`;
  const reminderExtra = unknownKey(value.reminder, [
    "enabled",
    "mode",
    "leadDays",
    "atTime",
    "customAt",
    "soonAt",
    "remindAt",
    "status",
    "firedAt",
  ]);
  if (reminderExtra) return `${label} reminder ${reminderExtra}.`;
  const reminderStatus = readEnum(value.reminder.status, REMINDER_STATUSES);
  if (typeof value.reminder.enabled !== "boolean" || reminderStatus === null) {
    return `${label} has an invalid reminder.`;
  }
  if (value.reminder.mode !== "default" && value.reminder.mode !== "custom") {
    return `${label} has an invalid reminder.`;
  }
  const reminder: JobApplication["reminder"] = {
    enabled: value.reminder.enabled,
    mode: value.reminder.mode,
    status: reminderStatus,
  };
  if ("leadDays" in value.reminder) {
    if (typeof value.reminder.leadDays !== "number" || !isLeadPreset(value.reminder.leadDays)) {
      return `${label} has an invalid reminder lead time.`;
    }
    reminder.leadDays = value.reminder.leadDays;
  }
  if ("atTime" in value.reminder) {
    if (typeof value.reminder.atTime !== "string" || !isValidTimeString(value.reminder.atTime)) {
      return `${label} has an invalid reminder time.`;
    }
    reminder.atTime = value.reminder.atTime;
  }
  for (const key of ["customAt", "soonAt", "remindAt", "firedAt"] as const) {
    if (key in value.reminder) {
      const instant = readInstant(value.reminder[key]);
      if (instant === null) return `${label} has an invalid reminder time.`;
      reminder[key] = instant;
    }
  }

  const job: JobApplication = {
    id,
    schemaVersion: SCHEMA_VERSION,
    title,
    company,
    url,
    canonicalUrl,
    source,
    location,
    workArrangement,
    eligibleCountries,
    eligibility: {
      value: eligibilityValue,
      confidence,
      reasons,
      overridden: value.eligibility.overridden,
      classifierVersion,
    },
    visaSponsorship,
    studentEligibility,
    graduationYears,
    employmentType,
    experience,
    compensation,
    skills,
    category,
    status,
    statusHistory,
    savedAt,
    updatedAt,
    deadline,
    notes,
    reminder,
  };

  if ("sourceJobId" in value) {
    const sourceJobId = readLine(value.sourceJobId, 200);
    if (sourceJobId === null) return `${label} has an invalid source job id.`;
    job.sourceJobId = sourceJobId;
  }
  if ("description" in value) {
    const description = readText(value.description, MAX_DESCRIPTION_LENGTH, true);
    if (description === null) return `${label} has a description that is too long or invalid.`;
    job.description = description;
  }
  if ("companyWebsite" in value) {
    const companyWebsite = readHttp(value.companyWebsite);
    if (companyWebsite === null) return `${label} has an invalid company website.`;
    job.companyWebsite = companyWebsite;
  }
  if ("workAuthorization" in value) {
    const workAuthorization = readText(value.workAuthorization, 200, false);
    if (workAuthorization === null) return `${label} has invalid work authorization.`;
    job.workAuthorization = workAuthorization;
  }
  if ("result" in value) {
    const result = readEnum<ResultOutcome>(value.result, RESULT_OUTCOMES);
    if (!result) return `${label} has an unknown result.`;
    job.result = result;
  }
  if ("appliedAt" in value) {
    const appliedAt = readInstant(value.appliedAt);
    if (appliedAt === null) return `${label} has an invalid applied date.`;
    job.appliedAt = appliedAt;
  }
  if ("interviewAt" in value) {
    const interviewAt = readInstant(value.interviewAt);
    if (interviewAt === null) return `${label} has an invalid interview date.`;
    job.interviewAt = interviewAt;
  }
  if ("contact" in value) {
    if (!isRecord(value.contact)) return `${label} has an invalid contact.`;
    const contactExtra = unknownKey(value.contact, ["name", "email", "phone", "profileUrl"]);
    if (contactExtra) return `${label} contact ${contactExtra}.`;
    const contact: NonNullable<JobApplication["contact"]> = {};
    if ("name" in value.contact) {
      const name = readText(value.contact.name, 120, false);
      if (name === null) return `${label} has an invalid contact name.`;
      contact.name = name;
    }
    if ("email" in value.contact) {
      const email = readLine(value.contact.email, 200);
      if (email === null) return `${label} has an invalid contact email.`;
      contact.email = email;
    }
    if ("phone" in value.contact) {
      const phone = readLine(value.contact.phone, 40);
      if (phone === null) return `${label} has an invalid contact phone.`;
      contact.phone = phone;
    }
    if ("profileUrl" in value.contact) {
      const profileUrl = readHttp(value.contact.profileUrl);
      if (profileUrl === null) return `${label} has an invalid contact link.`;
      contact.profileUrl = profileUrl;
    }
    job.contact = contact;
  }
  if ("extraction" in value) {
    if (!isRecord(value.extraction)) return `${label} has invalid extraction details.`;
    const extractionExtra = unknownKey(value.extraction, [
      "adapter",
      "adapterVersion",
      "extractedAt",
      "fieldSources",
    ]);
    if (extractionExtra) return `${label} extraction ${extractionExtra}.`;
    const adapter = readLine(value.extraction.adapter, 40);
    const adapterVersion = readInt(value.extraction.adapterVersion, 0, 1000);
    const extractedAt = readInstant(value.extraction.extractedAt);
    if (!adapter || adapterVersion === null || !extractedAt) {
      return `${label} has invalid extraction details.`;
    }
    if (!isRecord(value.extraction.fieldSources)) {
      return `${label} has invalid extraction details.`;
    }
    const fieldSourceEntries = Object.entries(value.extraction.fieldSources);
    if (fieldSourceEntries.length > 40) return `${label} has invalid extraction details.`;
    const fieldSources: NonNullable<JobApplication["extraction"]>["fieldSources"] = {};
    for (const [field, sourceName] of fieldSourceEntries) {
      if (readLine(field, 40) === null) return `${label} has invalid extraction details.`;
      const parsedSource = readEnum(sourceName, FIELD_SOURCES);
      if (!parsedSource) return `${label} has invalid extraction details.`;
      fieldSources[field] = parsedSource;
    }
    job.extraction = { adapter, adapterVersion, extractedAt, fieldSources };
  }

  return job;
}

function readSettings(value: unknown): Settings | string {
  if (!isRecord(value)) return "Settings are missing or not an object.";
  const extra = unknownKey(value, ["reminders", "profile", "csv"]);
  if (extra) return `Settings ${extra}.`;
  if (!isRecord(value.reminders) || !isRecord(value.profile) || !isRecord(value.csv)) {
    return "Settings are missing reminders, profile or CSV options.";
  }
  if (unknownKey(value.reminders, ["enabledByDefault", "leadDays", "atTime"])) {
    return "Reminder settings contain an unknown field.";
  }
  if (unknownKey(value.profile, ["graduationYear", "countryCode"])) {
    return "Profile settings contain an unknown field.";
  }
  if (unknownKey(value.csv, ["includeDescription", "chosen"])) {
    return "CSV settings contain an unknown field.";
  }
  if (typeof value.reminders.enabledByDefault !== "boolean") {
    return "Reminder settings are invalid.";
  }
  if (typeof value.reminders.leadDays !== "number" || !isLeadPreset(value.reminders.leadDays)) {
    return "Reminder settings have a lead time this version does not use.";
  }
  if (typeof value.reminders.atTime !== "string" || !isValidTimeString(value.reminders.atTime)) {
    return "Reminder settings have an invalid time.";
  }
  const graduationYear = readInt(value.profile.graduationYear, 1900, 2100);
  const countryCode = readLine(value.profile.countryCode, 2);
  if (graduationYear === null || countryCode === null || !/^[A-Za-z]{2}$/.test(countryCode)) {
    return "Profile settings are invalid.";
  }
  if (typeof value.csv.includeDescription !== "boolean") return "CSV settings are invalid.";
  const csv: Settings["csv"] = { includeDescription: value.csv.includeDescription };
  if ("chosen" in value.csv) {
    if (typeof value.csv.chosen !== "boolean") return "CSV settings are invalid.";
    csv.chosen = value.csv.chosen;
  }
  return {
    reminders: {
      enabledByDefault: value.reminders.enabledByDefault,
      leadDays: value.reminders.leadDays,
      atTime: value.reminders.atTime,
    },
    profile: { graduationYear, countryCode },
    csv,
  };
}

/**
 * Reads a backup without writing anything. Schema 1 is the only shape this build
 * stores. A higher schema is refused. There is no older backup shape to migrate.
 */
export function parseBackup(text: string): ParseResult {
  if (
    typeof text !== "string" ||
    text.length > MAX_BACKUP_BYTES ||
    utf8Bytes(text) > MAX_BACKUP_BYTES
  ) {
    return failure(["This backup is larger than 5 MB."]);
  }
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    return failure(["This file is not valid JSON."]);
  }
  if (!isRecord(parsed)) return failure(["This file is not a Job Clipper backup."]);
  if (parsed.app !== BACKUP_APP) return failure(["This file is not a Job Clipper backup."]);

  const version = parsed.schemaVersion;
  if (typeof version !== "number" || !Number.isInteger(version)) {
    return failure(["This backup has no usable schema version."]);
  }
  if (version > SCHEMA_VERSION) {
    return failure([
      `This backup uses schema ${version}. This copy of Job Clipper reads schema ${SCHEMA_VERSION}. Update Job Clipper before importing it.`,
    ]);
  }
  if (version < 1)
    return failure([`This backup uses schema ${version}, which Job Clipper does not read.`]);

  let current: Record<string, unknown> = parsed;
  let schemaVersion = version;
  // Future versions add a step here: vN → vN+1. None exist below schema 1.
  const upgrades: Partial<
    Record<number, (raw: Record<string, unknown>) => Record<string, unknown>>
  > = {};
  while (schemaVersion < SCHEMA_VERSION) {
    const step = upgrades[schemaVersion];
    if (!step) {
      return failure([
        `This backup uses schema ${schemaVersion}, and there is no migration to schema ${SCHEMA_VERSION}.`,
      ]);
    }
    current = step(current);
    schemaVersion += 1;
  }

  const extra = unknownKey(current, ENVELOPE_KEYS);
  if (extra) return failure([`This backup ${extra}.`]);
  const exportedAt = readInstant(current.exportedAt);
  if (!exportedAt) return failure(["This backup has an invalid export time."]);
  if (!Array.isArray(current.jobs))
    return failure(["This backup is missing its application list."]);
  if (current.jobs.length > MAX_BACKUP_JOBS) {
    return failure([`This backup has more than ${MAX_BACKUP_JOBS} applications.`]);
  }

  const settings = readSettings(current.settings);
  if (typeof settings === "string") return failure([settings]);

  const errors: string[] = [];
  const jobs: JobApplication[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < current.jobs.length; index += 1) {
    const result = readJob(current.jobs[index], index);
    if (typeof result === "string") {
      errors.push(result);
      if (errors.length >= 11) break;
      continue;
    }
    if (seen.has(result.id)) {
      errors.push(`Application ${index + 1} repeats id ${result.id}.`);
      if (errors.length >= 11) break;
      continue;
    }
    seen.add(result.id);
    jobs.push(result);
  }
  if (errors.length > 0) return failure(errors);

  const backup: BackupFile = {
    app: BACKUP_APP,
    schemaVersion: SCHEMA_VERSION,
    exportedAt,
    jobs,
    settings,
  };
  return { ok: true, backup };
}
