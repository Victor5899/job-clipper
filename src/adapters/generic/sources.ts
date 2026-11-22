import { parseExplicitDate } from "../../core/normalize/dates";
import { cleanText } from "../../core/normalize/text";
import { visibleText } from "../domText";
import { mapEmploymentType } from "../mapFields";
import { isExplicitDeadlineLabel, type AdapterFields } from "../types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collect(value: unknown, into: Record<string, unknown>[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collect(item, into);
    return;
  }
  if (!isRecord(value)) return;
  into.push(value);
  if (value["@graph"]) collect(value["@graph"], into);
}

function typeNames(node: Record<string, unknown>): string[] {
  const value = node["@type"];
  const list = Array.isArray(value) ? value : [value];
  return list.filter((item): item is string => typeof item === "string");
}

function htmlToText(html: string): string {
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("script, style").forEach((node) => node.remove());
    return doc.body?.textContent ?? "";
  } catch {
    return "";
  }
}

function placeParts(value: unknown): string[] {
  if (typeof value === "string") {
    const text = value.trim();
    if (!text || text === "-" || /^not disclosed$/i.test(text)) return [];
    return [text];
  }
  if (Array.isArray(value)) return value.flatMap((item) => placeParts(item));
  return [];
}

function locationText(value: unknown): string | undefined {
  const places = Array.isArray(value) ? value : value ? [value] : [];
  const parts: string[] = [];
  for (const place of places) {
    if (typeof place === "string") {
      parts.push(...placeParts(place));
      continue;
    }
    if (!isRecord(place)) continue;
    const address = isRecord(place.address) ? place.address : place;
    const locality = placeParts(address.addressLocality);
    const country = placeParts(address.addressCountry);
    const region = placeParts(address.addressRegion).filter((part) => !locality.includes(part));
    parts.push(...locality, ...region, ...country);
  }
  const unique = [...new Set(parts)];
  return unique.length > 0 ? unique.join(", ") : undefined;
}

function namesFrom(value: unknown): string[] {
  const items = Array.isArray(value) ? value : value ? [value] : [];
  const names: string[] = [];
  for (const item of items) {
    if (typeof item === "string" && item.trim()) names.push(item.trim());
    else if (isRecord(item) && typeof item.name === "string" && item.name.trim()) {
      names.push(item.name.trim());
    }
  }
  return names;
}

function salaryText(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  const currency = typeof value.currency === "string" ? value.currency.trim() : "";
  const inner = isRecord(value.value) ? value.value : value;
  if (typeof inner.value === "string") {
    const text = inner.value.trim();
    if (!text || /^not disclosed$/i.test(text)) return undefined;
    return text;
  }
  const min = typeof inner.minValue === "number" ? inner.minValue : undefined;
  const max = typeof inner.maxValue === "number" ? inner.maxValue : undefined;
  if (min === undefined && max === undefined) return undefined;
  if ((min ?? 0) === 0 && (max ?? 0) === 0) return undefined;
  const unit = typeof inner.unitText === "string" ? inner.unitText.trim() : "";
  const amount =
    min !== undefined && max !== undefined && min !== max ? `${min}-${max}` : `${min ?? max}`;
  return [currency, amount, unit].filter(Boolean).join(" ");
}

function organizationName(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (!isRecord(value)) return undefined;
  return typeof value.name === "string" ? value.name.trim() || undefined : undefined;
}

function readScripts(doc: Document): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = [];
  for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
    const raw = script.textContent?.trim();
    if (!raw) continue;
    try {
      collect(JSON.parse(raw) as unknown, nodes);
    } catch {
      // Ignore broken JSON-LD. The rest of the page can still be read.
    }
  }
  return nodes;
}

/**
 * Reads a JobPosting block. `validThrough` is listing expiry, so it is ignored.
 * Dates inside the description are ignored as well.
 */
export function readJsonLd(doc: Document): AdapterFields {
  const posting = readScripts(doc).find((node) => typeNames(node).includes("JobPosting"));
  if (!posting) return {};

  const fields: AdapterFields = {};
  if (typeof posting.title === "string" && posting.title.trim())
    fields.title = posting.title.trim();
  const company = organizationName(posting.hiringOrganization);
  if (company) fields.company = company;
  if (typeof posting.description === "string" && posting.description.trim()) {
    fields.description = htmlToText(posting.description);
  }
  const location = locationText(posting.jobLocation);
  if (location) fields.locationRaw = location;
  const locationType = typeof posting.jobLocationType === "string" ? posting.jobLocationType : "";
  if (/TELECOMMUTE/i.test(locationType)) fields.workArrangement = "remote";
  const employment = posting.employmentType;
  const employmentText = Array.isArray(employment)
    ? employment.filter((item): item is string => typeof item === "string").join(" ")
    : typeof employment === "string"
      ? employment
      : "";
  const employmentType = mapEmploymentType(employmentText);
  if (employmentType) fields.employmentType = employmentType;
  const salary = salaryText(posting.baseSalary);
  if (salary) fields.compensationRaw = salary;
  const applicants = namesFrom(posting.applicantLocationRequirements);
  if (applicants.length > 0) fields.applicantLocations = applicants;
  return fields;
}

export function readMeta(doc: Document): AdapterFields {
  const content = doc.querySelector('meta[property="og:title"]')?.getAttribute("content") ?? "";
  const title = content.split("|")[0]?.trim();
  if (!title) return {};
  return { title: title.slice(0, 300) };
}

export function readHeuristics(doc: Document): AdapterFields {
  const heading = doc.querySelector("h1");
  const title = heading ? visibleText(heading).replace(/\s+/g, " ").trim() : "";
  if (title) return { title };
  const documentTitle = doc.title?.split("|")[0]?.trim();
  return documentTitle ? { title: documentTitle } : {};
}

/** Drops a deadline that did not come from an explicit label, then caps every string. */
export function sanitizeAdapterFields(fields: AdapterFields): AdapterFields {
  const next: AdapterFields = {};
  const title = fields.title ? cleanText(fields.title, 300) : "";
  const company = fields.company ? cleanText(fields.company, 200) : "";
  const description =
    fields.description
      ?.replace(/\u00a0/g, " ")
      .trim()
      .slice(0, 15_000) ?? "";
  const locationRaw = fields.locationRaw ? cleanText(fields.locationRaw, 200) : "";
  const experienceRaw = fields.experienceRaw ? cleanText(fields.experienceRaw, 200) : "";
  const compensationRaw = fields.compensationRaw ? cleanText(fields.compensationRaw, 200) : "";
  if (title) next.title = title;
  if (company) next.company = company;
  if (description) next.description = description;
  if (locationRaw) next.locationRaw = locationRaw;
  if (fields.workArrangement) next.workArrangement = fields.workArrangement;
  if (fields.employmentType) next.employmentType = fields.employmentType;
  if (experienceRaw) next.experienceRaw = experienceRaw;
  if (compensationRaw && !/^not disclosed$/i.test(compensationRaw))
    next.compensationRaw = compensationRaw;
  const skills = (fields.skills ?? [])
    .map((skill) => cleanText(skill, 80))
    .filter((skill) => skill.length > 0)
    .slice(0, 30);
  if (skills.length > 0) next.skills = [...new Set(skills)];
  const applicants = (fields.applicantLocations ?? [])
    .map((entry) => cleanText(entry, 80))
    .filter(Boolean)
    .slice(0, 20);
  if (applicants.length > 0) next.applicantLocations = applicants;
  const countries = (fields.eligibleCountries ?? [])
    .map((entry) => cleanText(entry, 40))
    .filter(Boolean)
    .slice(0, 20);
  if (countries.length > 0) next.eligibleCountries = countries;
  if (fields.workFromHome) next.workFromHome = true;

  const evidence = fields.deadline?.evidence ?? "";
  const label = evidence.split(/\s+\d/)[0]?.trim() ?? evidence;
  const parsed = fields.deadline ? parseExplicitDate(fields.deadline.date) : null;
  if (fields.deadline && parsed && isExplicitDeadlineLabel(label)) {
    next.deadline = { date: parsed, evidence: cleanText(evidence, 160) };
  }
  return next;
}
