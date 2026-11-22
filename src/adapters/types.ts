import type { EmploymentType, SourceId, WorkArrangement } from "../core/model/enums";
import type { FieldSource } from "../core/extraction/types";

export type { FieldSource };

/** Partial fields read from one source. Strings are still untrusted page text. */
export interface AdapterFields {
  title?: string;
  company?: string;
  description?: string;
  locationRaw?: string;
  workArrangement?: WorkArrangement;
  employmentType?: EmploymentType;
  experienceRaw?: string;
  compensationRaw?: string;
  skills?: string[];
  deadline?: { date: string; evidence: string };
  eligibleCountries?: string[];
  applicantLocations?: string[];
  workFromHome?: boolean;
}

export interface AdapterExtraction {
  fields: AdapterFields;
  fieldSources: Partial<Record<keyof AdapterFields, FieldSource>>;
}

export interface SiteAdapter {
  id: SourceId;
  name: string;
  version: number;
  /**
   * When true, the popup runs this adapter on a matching job page.
   * `verified` is separate: it is true only after a real Chrome check is recorded.
   */
  enabled: boolean;
  verified: boolean;
  matches(url: URL): boolean;
  isJobPage(doc: Document, url: URL): boolean;
  extract(ctx: { doc: Document; url: URL }): AdapterFields;
  preferJsonLd?: boolean;
}

export const DEADLINE_LABEL =
  /^(apply by|apply before|application deadline|registration deadline|last date to apply|deadline)$/i;

export function isExplicitDeadlineLabel(label: string): boolean {
  return DEADLINE_LABEL.test(label.trim().replace(/\s+/g, " "));
}
