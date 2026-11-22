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

const TRACKING_PARAMS = new Set([
  "trk",
  "refid",
  "trackingid",
  "fbclid",
  "gclid",
  "mc_eid",
  "igshid",
]);

function bareHost(url: URL): string {
  return url.hostname.toLowerCase().replace(/^www\./, "");
}

function withoutTracking(url: URL): URLSearchParams {
  const params = new URLSearchParams(url.search);
  for (const key of [...params.keys()]) {
    const lower = key.toLowerCase();
    if (lower.startsWith("utm_") || TRACKING_PARAMS.has(lower)) params.delete(key);
  }
  return params;
}

/**
 * Comparison key for a job link (PROJECT_SPEC section 7).
 * Lowercases the host, strips a leading www, drops the fragment and tracking
 * parameters, and applies the generic LinkedIn and Indeed shapes named in the spec.
 * This is not a site extractor: it only rewrites the URL.
 */
export function canonicalizeUrl(url: URL): { canonicalUrl: string; sourceJobId?: string } {
  let host = bareHost(url);
  let path = url.pathname.replace(/\/+$/, "") || "/";
  const params = withoutTracking(url);
  let sourceJobId: string | undefined;

  const linkedInId = path.match(/^\/jobs\/view\/(?:.*-)?(\d+)$/);
  if ((host === "linkedin.com" || host.endsWith(".linkedin.com")) && linkedInId?.[1]) {
    sourceJobId = linkedInId[1];
    host = "linkedin.com";
    path = `/jobs/view/${sourceJobId}`;
    for (const key of [...params.keys()]) params.delete(key);
  }

  if (host === "indeed.com" || host.endsWith(".indeed.com")) {
    const jk = params.get("jk") ?? path.match(/^\/viewjob\/([^/]+)$/)?.[1];
    if (jk) {
      sourceJobId = jk;
      path = "/viewjob";
      for (const key of [...params.keys()]) params.delete(key);
      params.set("jk", jk);
    }
  }

  if (host === "internshala.com" || host.endsWith(".internshala.com")) {
    host = "internshala.com";
    const detail = path.match(/^\/(?:internship|job)\/detail\/([^/]+)$/);
    const id = detail?.[1]?.match(/(\d{6,})$/)?.[1];
    if (id) {
      sourceJobId = id;
      for (const key of [...params.keys()]) params.delete(key);
    }
  }

  if (host === "naukri.com" || host.endsWith(".naukri.com")) {
    host = "naukri.com";
    const id = path.match(/\/job-listings-.+-(\d{6,})$/)?.[1];
    if (id) {
      sourceJobId = id;
      for (const key of [...params.keys()]) params.delete(key);
    }
  }

  const query = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  const port = url.port && url.port !== "80" && url.port !== "443" ? `:${url.port}` : "";
  const canonicalUrl = `https://${host}${port}${path === "/" ? "" : path}${query ? `?${query}` : ""}`;
  return { canonicalUrl, ...(sourceJobId ? { sourceJobId } : {}) };
}

/** Labels which job site a link belongs to. This is a hostname match only, not extraction support. */
export function sourceFromUrl(url: URL): SourceId {
  const host = url.hostname.toLowerCase();
  for (const [source, domain] of SOURCE_HOSTS) {
    if (host === domain || host.endsWith(`.${domain}`)) return source;
  }
  return "other";
}
