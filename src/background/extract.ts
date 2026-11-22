import type { ExtractionPayload } from "../core/extraction/types";
import { parseExtractRequest, parseExtractionPayload } from "../messaging/protocol";

const EXTRACT_TIMEOUT_MS = 2000;

export async function extractTab(tabId: number): Promise<ExtractionPayload> {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["extractor.js"] });
    const [injected] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const run = (globalThis as { __jcRunExtraction?: () => unknown }).__jcRunExtraction;
        return run ? run() : { ok: false, reason: "missing" };
      },
    });
    return parseExtractionPayload(injected?.result) ?? { ok: false, reason: "invalid" };
  } catch {
    return { ok: false, reason: "injection-failed" };
  }
}

/**
 * Handles a popup request to read the active tab. Returns undefined for messages
 * that are not ours, including anything not sent by this extension.
 */
export function handleRuntimeMessage(
  message: unknown,
  sender: { id?: string },
): Promise<ExtractionPayload> | undefined {
  if (!sender.id || sender.id !== chrome.runtime.id) return undefined;
  const request = parseExtractRequest(message);
  if (!request) return undefined;
  return Promise.race([
    extractTab(request.tabId),
    new Promise<ExtractionPayload>((resolve) => {
      setTimeout(() => resolve({ ok: false, reason: "timed-out" }), EXTRACT_TIMEOUT_MS);
    }),
  ]);
}
