import type { SourceId } from "./model/enums";
import type { JobApplication } from "./model/types";
import { canonicalizeUrl, parseHttpUrl, sourceFromUrl } from "./normalize/url";

/** A probable match has to clear this token overlap and have been saved within this many days. */
export const PROBABLE_SIMILARITY = 0.9;
export const PROBABLE_WINDOW_DAYS = 60;

const DAY_MS = 24 * 60 * 60 * 1000;

const COMPANY_SUFFIX =
  /\b(pvt|private|ltd|limited|inc|incorporated|llc|llp|corp|corporation|co|company)\b/g;

export interface DuplicateCandidate {
  title: string;
  company: string;
  url: string;
  source?: SourceId;
  sourceJobId?: string;
}

export interface DuplicateMatch {
  job: JobApplication;
  kind: "exact" | "probable";
}

interface Identity {
  canonicalUrl: string;
  source?: SourceId;
  sourceJobId?: string;
}

/** Lowercases, strips punctuation and company suffixes, and collapses whitespace. */
export function normalizeMatchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(COMPANY_SUFFIX, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Jaccard overlap of the normalised tokens. Empty text never matches. */
export function tokenSimilarity(left: string, right: string): number {
  const a = new Set(normalizeMatchText(left).split(" ").filter(Boolean));
  const b = new Set(normalizeMatchText(right).split(" ").filter(Boolean));
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  return shared / (a.size + b.size - shared);
}

function identityOf(url: string, source?: SourceId, sourceJobId?: string): Identity {
  const parsed = parseHttpUrl(url);
  if (!parsed) return { canonicalUrl: url.trim(), source, sourceJobId };
  const canonical = canonicalizeUrl(parsed);
  return {
    canonicalUrl: canonical.canonicalUrl,
    source: source ?? sourceFromUrl(parsed),
    sourceJobId: sourceJobId ?? canonical.sourceJobId,
  };
}

function sameJob(left: Identity, right: Identity): boolean {
  if (left.canonicalUrl === right.canonicalUrl) return true;
  return Boolean(
    left.source &&
    right.source &&
    left.source === right.source &&
    left.sourceJobId &&
    right.sourceJobId &&
    left.sourceJobId === right.sourceJobId,
  );
}

/**
 * Exact: the same canonical URL, or the same site plus the same source job id.
 * Probable: company and title each overlap by at least 0.9, and the existing job
 * was saved within the last 60 days. The job being edited is ignored.
 */
export function findDuplicates(
  candidate: DuplicateCandidate,
  jobs: readonly JobApplication[],
  now: Date,
  ignoreId?: string,
): DuplicateMatch[] {
  const wanted = identityOf(candidate.url, candidate.source, candidate.sourceJobId);
  const matches: DuplicateMatch[] = [];

  for (const job of jobs) {
    if (job.id === ignoreId) continue;
    const current = identityOf(job.url, job.source, job.sourceJobId);
    if (sameJob(wanted, current) || job.canonicalUrl === wanted.canonicalUrl) {
      matches.push({ job, kind: "exact" });
      continue;
    }
    const age = now.getTime() - new Date(job.savedAt).getTime();
    if (age > PROBABLE_WINDOW_DAYS * DAY_MS) continue;
    const company = tokenSimilarity(candidate.company, job.company);
    const title = tokenSimilarity(candidate.title, job.title);
    if (company >= PROBABLE_SIMILARITY && title >= PROBABLE_SIMILARITY) {
      matches.push({ job, kind: "probable" });
    }
  }

  return matches.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "exact" ? -1 : 1));
}
