import type { EmploymentType, SourceId, WorkArrangement } from "../model/enums";

export type FieldSource = "jsonld" | "adapter" | "meta" | "heuristic" | "user";

/** Plain data returned by the content script. No DOM nodes. */
export interface ExtractedJob {
  ok: true;
  mode: "detected" | "manual";
  reason?: "unsupported" | "not-job-page" | "empty" | "unreadable";
  source: SourceId;
  adapter: string;
  adapterVersion: number;
  url: string;
  canonicalUrl: string;
  sourceJobId?: string;
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
  fieldSources: Record<string, FieldSource>;
}

export interface ExtractionFailure {
  ok: false;
  reason: string;
}

export type ExtractionPayload = ExtractedJob | ExtractionFailure;
