import { describe, expect, it, vi } from "vitest";
import { chromeFake } from "../../tests/fakes/chrome";
import { handleRuntimeMessage } from "./extract";

function extensionPage() {
  return {
    id: chrome.runtime.id,
    url: `chrome-extension://${chrome.runtime.id}/popup.html`,
  };
}

function scripting(executeScript: ReturnType<typeof vi.fn>) {
  (chrome as unknown as { scripting: { executeScript: typeof executeScript } }).scripting = {
    executeScript,
  };
}

describe("handleRuntimeMessage", () => {
  it("ignores a message that did not come from an extension page", () => {
    expect(
      handleRuntimeMessage(
        { type: "jc:extract", tabId: 1 },
        { id: "someone-else", url: "chrome-extension://someone-else/popup.html" },
      ),
    ).toBeUndefined();
    expect(handleRuntimeMessage({ type: "jc:extract", tabId: 1 }, {})).toBeUndefined();
    expect(
      handleRuntimeMessage(
        { type: "jc:extract", tabId: 1 },
        { id: chrome.runtime.id, url: "https://jobs.example/listing" },
      ),
    ).toBeUndefined();
  });

  it("ignores a request that is not an extraction", () => {
    expect(
      handleRuntimeMessage({ type: "jc:extract", tabId: "1" }, extensionPage()),
    ).toBeUndefined();
  });

  it("does not inject into a tab whose address is not http(s)", async () => {
    const executeScript = vi.fn();
    scripting(executeScript);
    chromeFake().setTab({ id: 7, url: "chrome://extensions" });
    await expect(
      handleRuntimeMessage({ type: "jc:extract", tabId: 7 }, extensionPage()),
    ).resolves.toEqual({ ok: false, reason: "injection-failed" });
    expect(executeScript).not.toHaveBeenCalled();
  });

  it("reports injection failure and a timeout", async () => {
    chromeFake().setTab({ id: 4, url: "https://example.com/jobs/4" });
    scripting(vi.fn(async () => Promise.reject(new Error("blocked"))));
    await expect(
      handleRuntimeMessage({ type: "jc:extract", tabId: 4 }, extensionPage()),
    ).resolves.toEqual({ ok: false, reason: "injection-failed" });

    vi.useFakeTimers();
    scripting(vi.fn(() => new Promise(() => undefined)));
    const pending = handleRuntimeMessage({ type: "jc:extract", tabId: 4 }, extensionPage());
    await vi.advanceTimersByTimeAsync(2000);
    await expect(pending).resolves.toEqual({ ok: false, reason: "timed-out" });
    vi.useRealTimers();
  });

  it("returns the parsed result and drops extra fields", async () => {
    const executeScript = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          result: {
            ok: true,
            mode: "detected",
            source: "linkedin",
            adapter: "linkedin",
            adapterVersion: 1,
            url: "https://linkedin.com/jobs/view/1",
            canonicalUrl: "https://linkedin.com/jobs/view/1",
            title: "Analyst",
            password: "nope",
          },
        },
      ]);
    scripting(executeScript);
    chromeFake().setTab({ id: 2, url: "https://www.linkedin.com/jobs/view/1" });
    const payload = await handleRuntimeMessage({ type: "jc:extract", tabId: 2 }, extensionPage());
    expect(payload).toMatchObject({ ok: true, title: "Analyst", source: "linkedin" });
    expect(payload && "password" in payload).toBe(false);
    expect(executeScript).toHaveBeenCalledWith(
      expect.objectContaining({ files: ["extractor.js"], target: { tabId: 2 } }),
    );
  });
});
