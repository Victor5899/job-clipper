import { extractFromDocument } from "../adapters/pipeline";
import type { ExtractionPayload } from "../core/extraction/types";
import { parseHttpUrl } from "../core/normalize/url";
import { waitForJobContent } from "./waitForContent";

/** Read-only extraction for the tab the user is viewing. */
export async function runExtraction(doc: Document, href: string): Promise<ExtractionPayload> {
  try {
    const url = parseHttpUrl(href);
    if (url) await waitForJobContent(doc, url);
    return extractFromDocument(doc, href);
  } catch {
    return { ok: false, reason: "failed" };
  }
}
