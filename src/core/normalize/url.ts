import type { SourceId } from "../model/enums";

export const MAX_URL_LENGTH = 2048;

/** Returns a parsed URL only for http(s) addresses; every other scheme is rejected. */
export function parseHttpUrl(value: string): URL | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_URL_LENGTH) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname) return null;
    return url;
  } catch {
    return null;
  }
}

const SOURCE_HOSTS: [SourceId, string][] = [
  ["linkedin", "linkedin.com"],
  ["internshala", "internshala.com"],
  ["naukri", "naukri.com"],
  ["wellfound", "wellfound.com"],
  ["indeed", "indeed.com"],
  ["ycombinator", "ycombinator.com"],
  ["himalayas", "himalayas.app"],
  ["weworkremotely", "weworkremotely.com"],
  ["unstop", "unstop.com"],
  ["cutshort", "cutshort.io"],
  ["hiringcafe", "hiring.cafe"],
  ["glassdoor", "glassdoor.com"],
  ["glassdoor", "glassdoor.co.in"],
  ["ziprecruiter", "ziprecruiter.com"],
];

/** Labels which job site a link belongs to. This is a hostname match only, not extraction support. */
export function sourceFromUrl(url: URL): SourceId {
  const host = url.hostname.toLowerCase();
  for (const [source, domain] of SOURCE_HOSTS) {
    if (host === domain || host.endsWith(`.${domain}`)) return source;
  }
  return "other";
}
