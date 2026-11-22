import { adapterFor } from "../adapters/registry";

/** Waits briefly for a single-page app to render the job. Gives up without throwing. */
export function waitForJobContent(doc: Document, url: URL, timeoutMs = 1500): Promise<void> {
  const adapter = adapterFor(url);
  if (!adapter || adapter.isJobPage(doc, url) || !doc.documentElement) return Promise.resolve();

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      window.clearTimeout(timer);
      resolve();
    };
    const observer = new MutationObserver(() => {
      if (adapter.isJobPage(doc, url)) finish();
    });
    observer.observe(doc.documentElement, { childList: true, subtree: true });
    const timer = window.setTimeout(finish, timeoutMs);
  });
}
