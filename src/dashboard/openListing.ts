import { parseHttpUrl } from "../core/normalize/url";

/**
 * Opens a saved listing in a new tab. The address is checked again here, so a value that
 * was edited in storage after it was saved cannot navigate to a non-http(s) URL.
 */
export async function openListing(url: string): Promise<boolean> {
  const parsed = parseHttpUrl(url);
  if (!parsed) return false;
  try {
    await chrome.tabs.create({ url: parsed.href });
    return true;
  } catch {
    return false;
  }
}
