import type { ExtractedJob } from "../core/extraction/types";
import { sourceFromUrl, canonicalizeUrl, parseHttpUrl } from "../core/normalize/url";
import { readHeuristics, readJsonLd, readMeta, sanitizeAdapterFields } from "./generic/sources";
import { mergeExtractions } from "./merge";
import { adapterFor } from "./registry";
import type { AdapterFields, FieldSource } from "./types";

function emptyExtraction(url: string, reason: ExtractedJob["reason"]): ExtractedJob {
  const parsed = parseHttpUrl(url);
  const source = parsed ? sourceFromUrl(parsed) : "other";
  const canonical = parsed ? canonicalizeUrl(parsed) : { canonicalUrl: url };
  return {
    ok: true,
    mode: "manual",
    reason,
    source,
    adapter: "none",
    adapterVersion: 0,
    url: parsed?.href ?? url,
    canonicalUrl: canonical.canonicalUrl,
    ...(canonical.sourceJobId ? { sourceJobId: canonical.sourceJobId } : {}),
    fieldSources: {},
  };
}

function safely(read: () => AdapterFields): AdapterFields {
  try {
    return read();
  } catch {
    return {};
  }
}

/** Reads one document. Page text is untrusted and is reduced to plain strings. */
export function extractFromDocument(doc: Document, pageUrl: string): ExtractedJob {
  const parsed = parseHttpUrl(pageUrl);
  if (!parsed) return emptyExtraction(pageUrl, "unreadable");
  const adapter = adapterFor(parsed);
  if (!adapter) return emptyExtraction(parsed.href, "unsupported");
  if (!adapter.isJobPage(doc, parsed)) return emptyExtraction(parsed.href, "not-job-page");

  const merged = mergeExtractions(
    [
      { source: "adapter", fields: safely(() => adapter.extract({ doc, url: parsed })) },
      { source: "jsonld", fields: safely(() => readJsonLd(doc)) },
      { source: "meta", fields: safely(() => readMeta(doc)) },
      { source: "heuristic", fields: safely(() => readHeuristics(doc)) },
    ],
    { preferJsonLd: adapter.preferJsonLd },
  );
  const fields = sanitizeAdapterFields(merged.fields);
  const canonical = canonicalizeUrl(parsed);
  const titleSource = merged.fieldSources.title;
  const companySource = merged.fieldSources.company;
  const fromPage = (source: FieldSource | undefined) => source === "adapter" || source === "jsonld";
  const detected =
    (Boolean(fields.title) && fromPage(titleSource)) ||
    (Boolean(fields.company) && fromPage(companySource));
  const base = {
    ok: true as const,
    source: adapter.id,
    adapter: adapter.id,
    adapterVersion: adapter.version,
    url: parsed.href,
    canonicalUrl: canonical.canonicalUrl,
    ...(canonical.sourceJobId ? { sourceJobId: canonical.sourceJobId } : {}),
  };
  if (!detected) return { ...base, mode: "manual", reason: "empty", fieldSources: {} };

  const fieldSources: Record<string, FieldSource> = {};
  for (const [key, source] of Object.entries(merged.fieldSources)) {
    if (source && key in fields) fieldSources[key] = source;
  }
  return { ...base, mode: "detected", ...fields, fieldSources };
}
