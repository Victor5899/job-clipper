import type { JobApplication } from "../model/types";
import { foldSearchText } from "./fold";

const cache = new Map<string, { key: string; haystack: string }>();

function parts(job: JobApplication): string {
  return [
    job.title,
    job.company,
    job.location.raw,
    job.location.city,
    job.location.country,
    ...job.skills,
    job.description,
    job.notes,
  ]
    .filter((part): part is string => Boolean(part))
    .join("\n");
}

/** Haystack for one job, reused until that job's id and updatedAt change. */
export function haystackFor(job: JobApplication): string {
  const key = `${job.id}\u0000${job.updatedAt}`;
  const cached = cache.get(job.id);
  if (cached?.key === key) return cached.haystack;
  if (cache.size > 5000) cache.clear();
  const haystack = foldSearchText(parts(job));
  cache.set(job.id, { key, haystack });
  return haystack;
}

/** Every whitespace-separated token must appear. An empty query matches everything. */
export function matchesQuery(job: JobApplication, query: string): boolean {
  const tokens = foldSearchText(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = haystackFor(job);
  return tokens.every((token) => haystack.includes(token));
}
