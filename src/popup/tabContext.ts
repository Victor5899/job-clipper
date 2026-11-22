import {
  EMPTY_MANUAL_ENTRY,
  MAX_TITLE_LENGTH,
  type ManualEntryValues,
} from "../core/model/manualEntry";
import { cleanText } from "../core/normalize/text";
import { parseHttpUrl } from "../core/normalize/url";

export interface TabContext {
  tabId: number | undefined;
  /** True when Chrome gave us no usable http(s) page (chrome://, Web Store, PDF viewer, no tab). */
  restricted: boolean;
  prefill: ManualEntryValues;
}

/** Only the active tab's URL and title are read; no page content is accessed in Phase 1. */
export async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  } catch {
    return undefined;
  }
}

export function tabContextFrom(tab: chrome.tabs.Tab | undefined): TabContext {
  const url = parseHttpUrl(tab?.url ?? "");
  if (!url) {
    return { tabId: tab?.id, restricted: true, prefill: EMPTY_MANUAL_ENTRY };
  }
  return {
    tabId: tab?.id,
    restricted: false,
    prefill: {
      ...EMPTY_MANUAL_ENTRY,
      url: url.href,
      title: cleanText(tab?.title ?? "", MAX_TITLE_LENGTH),
    },
  };
}
