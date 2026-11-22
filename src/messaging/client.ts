import type { ExtractionPayload } from "../core/extraction/types";
import { parseExtractRequest, parseExtractionPayload, type ExtractRequest } from "./protocol";

export async function requestExtraction(tabId: number): Promise<ExtractionPayload> {
  try {
    if (typeof chrome.runtime?.sendMessage !== "function") {
      return { ok: false, reason: "unavailable" };
    }
    const response: unknown = await chrome.runtime.sendMessage({
      type: "jc:extract",
      tabId,
    } satisfies ExtractRequest);
    return parseExtractionPayload(response) ?? { ok: false, reason: "invalid" };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

export function isExtractRequest(message: unknown): message is ExtractRequest {
  return parseExtractRequest(message) !== null;
}
