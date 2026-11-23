import type { ExtractionPayload } from "../core/extraction/types";
import { parseHttpUrl } from "../core/normalize/url";
import {
  isExtensionPageSender,
  parseExtractRequest,
  parseExtractionPayload,
} from "../messaging/protocol";

const EXTRACT_TIMEOUT_MS = 2000;

/**
 * Refuses a tab whose URL is visible and is not http(s). A missing URL, or a lookup Chrome
 * rejects, falls through so the existing activeTab grant still decides whether injection runs.
 */
async function tabUrlIsBlocked(tabId: number): Promise<boolean> {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (typeof tab.url !== "string" || tab.url.length === 0) return false;
    return parseHttpUrl(tab.url) === null;
  } catch {
    return false;
  }
}

export async function extractTab(tabId: number): Promise<ExtractionPayload> {
  if (await tabUrlIsBlocked(tabId)) return { ok: false, reason: "injection-failed" };
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
  sender: { id?: string; url?: string },
): Promise<ExtractionPayload> | undefined {
  if (!isExtensionPageSender(sender)) return undefined;
  const request = parseExtractRequest(message);
  if (!request) return undefined;
  return Promise.race([
    extractTab(request.tabId),
    new Promise<ExtractionPayload>((resolve) => {
      setTimeout(() => resolve({ ok: false, reason: "timed-out" }), EXTRACT_TIMEOUT_MS);
    }),
  ]);
}
