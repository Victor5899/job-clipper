import type { AdapterExtraction, AdapterFields, FieldSource } from "./types";

const MERGE_FIELDS = [
  "title",
  "company",
  "description",
  "locationRaw",
  "workArrangement",
  "employmentType",
  "experienceRaw",
  "compensationRaw",
  "skills",
  "eligibleCountries",
  "applicantLocations",
] as const satisfies readonly (keyof AdapterFields)[];

function present(value: AdapterFields[keyof AdapterFields]): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined;
}

/**
 * Adapter wins, then JSON-LD, then meta, then heuristics.
 * A deadline is kept only when the site adapter set it. JSON-LD `validThrough`
 * and description dates never become a deadline, even if a caller puts one on another source.
 */
export function mergeExtractions(
  parts: { source: FieldSource; fields: AdapterFields }[],
  options?: { preferJsonLd?: boolean },
): AdapterExtraction {
  const order: FieldSource[] = options?.preferJsonLd
    ? ["jsonld", "adapter", "meta", "heuristic"]
    : ["adapter", "jsonld", "meta", "heuristic"];
  const fields: AdapterFields = {};
  const fieldSources: AdapterExtraction["fieldSources"] = {};

  for (const key of MERGE_FIELDS) {
    for (const source of order) {
      const part = parts.find((item) => item.source === source);
      const value = part?.fields[key];
      if (value !== undefined && present(value)) {
        fields[key] = value as never;
        fieldSources[key] = source;
        break;
      }
    }
  }

  const adapter = parts.find((part) => part.source === "adapter");
  if (adapter?.fields.deadline?.date && adapter.fields.deadline.evidence) {
    fields.deadline = adapter.fields.deadline;
    fieldSources.deadline = "adapter";
  }
  if (adapter?.fields.workFromHome) {
    fields.workFromHome = true;
    fieldSources.workFromHome = "adapter";
  }
  return { fields, fieldSources };
}
