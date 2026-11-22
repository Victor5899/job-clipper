import type { ExtractionPayload, ExtractedJob, FieldSource } from "../core/extraction/types";
import { SOURCE_LABELS, type SourceId } from "../core/model/enums";

export interface ExtractRequest {
  type: "jc:extract";
  tabId: number;
}

const ARRANGEMENTS = new Set(["onsite", "hybrid", "remote", "unknown"]);
const EMPLOYMENT = new Set(["internship", "full_time", "contract", "part_time", "unknown"]);
const SOURCES = new Set(["jsonld", "adapter", "meta", "heuristic", "user"]);

export interface TestNotificationRequest {
  type: "jc:test-notification";
}

export function parseTestNotificationRequest(message: unknown): TestNotificationRequest | null {
  if (typeof message !== "object" || message === null) return null;
  if ((message as { type?: unknown }).type !== "jc:test-notification") return null;
  return { type: "jc:test-notification" };
}

export function parseExtractRequest(message: unknown): ExtractRequest | null {
  if (typeof message !== "object" || message === null) return null;
  const record = message as Record<string, unknown>;
  if (record.type !== "jc:extract") return null;
  if (typeof record.tabId !== "number" || !Number.isInteger(record.tabId) || record.tabId < 0) {
    return null;
  }
  return { type: "jc:extract", tabId: record.tabId };
}

function text(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = [...value]
    .filter((char) => char.charCodeAt(0) !== 0)
    .join("")
    .trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

function stringList(value: unknown, maxItems: number): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems);
  return items.length > 0 ? items : undefined;
}

/** Rebuilds a payload from a message so unexpected properties are dropped. */
export function parseExtractionPayload(value: unknown): ExtractionPayload | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (record.ok === false) {
    return {
      ok: false,
      reason: typeof record.reason === "string" ? record.reason.slice(0, 80) : "invalid",
    };
  }
  if (record.ok !== true) return null;
  if (record.mode !== "detected" && record.mode !== "manual") return null;
  if (typeof record.url !== "string" || typeof record.canonicalUrl !== "string") return null;
  if (typeof record.source !== "string" || !(record.source in SOURCE_LABELS)) return null;
  if (typeof record.adapter !== "string" || typeof record.adapterVersion !== "number") return null;

  const fieldSources: Record<string, FieldSource> = {};
  if (typeof record.fieldSources === "object" && record.fieldSources !== null) {
    for (const [key, source] of Object.entries(record.fieldSources)) {
      if (typeof source === "string" && SOURCES.has(source) && key.length < 40) {
        fieldSources[key] = source as FieldSource;
      }
    }
  }

  const deadlineDate = text(
    typeof record.deadline === "object" && record.deadline !== null
      ? (record.deadline as { date?: unknown }).date
      : undefined,
    10,
  );
  const deadlineEvidence = text(
    typeof record.deadline === "object" && record.deadline !== null
      ? (record.deadline as { evidence?: unknown }).evidence
      : undefined,
    160,
  );

  const job: ExtractedJob = {
    ok: true,
    mode: record.mode,
    source: record.source as SourceId,
    adapter: record.adapter.slice(0, 40),
    adapterVersion: record.adapterVersion,
    url: record.url.slice(0, 2048),
    canonicalUrl: record.canonicalUrl.slice(0, 2048),
    fieldSources,
  };
  const reason = text(record.reason, 40);
  if (
    reason === "unsupported" ||
    reason === "not-job-page" ||
    reason === "empty" ||
    reason === "unreadable"
  ) {
    job.reason = reason;
  }
  const sourceJobId = text(record.sourceJobId, 80);
  if (sourceJobId) job.sourceJobId = sourceJobId;
  const title = text(record.title, 300);
  if (title) job.title = title;
  const company = text(record.company, 200);
  if (company) job.company = company;
  const description = text(record.description, 15_000);
  if (description) job.description = description;
  const locationRaw = text(record.locationRaw, 200);
  if (locationRaw) job.locationRaw = locationRaw;
  if (typeof record.workArrangement === "string" && ARRANGEMENTS.has(record.workArrangement)) {
    job.workArrangement = record.workArrangement as ExtractedJob["workArrangement"];
  }
  if (typeof record.employmentType === "string" && EMPLOYMENT.has(record.employmentType)) {
    job.employmentType = record.employmentType as ExtractedJob["employmentType"];
  }
  const experienceRaw = text(record.experienceRaw, 200);
  if (experienceRaw) job.experienceRaw = experienceRaw;
  const compensationRaw = text(record.compensationRaw, 200);
  if (compensationRaw) job.compensationRaw = compensationRaw;
  const skills = stringList(record.skills, 30);
  if (skills) job.skills = skills;
  const applicants = stringList(record.applicantLocations, 20);
  if (applicants) job.applicantLocations = applicants;
  const countries = stringList(record.eligibleCountries, 20);
  if (countries) job.eligibleCountries = countries;
  if (record.workFromHome === true) job.workFromHome = true;
  if (deadlineDate && deadlineEvidence && /^\d{4}-\d{2}-\d{2}$/.test(deadlineDate)) {
    job.deadline = { date: deadlineDate, evidence: deadlineEvidence };
  }
  return job;
}
