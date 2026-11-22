import { runExtraction } from "./runExtraction";
import type { ExtractionPayload } from "../core/extraction/types";

const scope = globalThis as typeof globalThis & {
  __jcExtractorLoaded?: boolean;
  __jcRunExtraction?: () => Promise<ExtractionPayload>;
};

export function installExtractor(): void {
  if (scope.__jcExtractorLoaded) return;
  scope.__jcExtractorLoaded = true;
  scope.__jcRunExtraction = () => runExtraction(document, location.href);
}

installExtractor();
