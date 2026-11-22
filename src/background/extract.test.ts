import { describe, expect, it, vi } from "vitest";
import { handleRuntimeMessage } from "./extract";

function scripting(executeScript: ReturnType<typeof vi.fn>) {
  (chrome as unknown as { scripting: { executeScript: typeof executeScript } }).scripting = {
    executeScript,
  };
}

describe("handleRuntimeMessage", () => {
  it("ignores a message that did not come from this extension", () => {
    expect(
      handleRuntimeMessage({ type: "jc:extract", tabId: 1 }, { id: "someone-else" }),
    ).toBeUndefined();
    expect(handleRuntimeMessage({ type: "jc:extract", tabId: 1 }, {})).toBeUndefined();
  });

  it("ignores a request that is not an extraction", () => {
    expect(
      handleRuntimeMessage({ type: "jc:extract", tabId: "1" }, { id: chrome.runtime.id }),
    ).toBeUndefined();
  });

  it("reports injection failure and a timeout", async () => {
    scripting(vi.fn(async () => Promise.reject(new Error("blocked"))));
    await expect(
      handleRuntimeMessage({ type: "jc:extract", tabId: 4 }, { id: chrome.runtime.id }),
    ).resolves.toEqual({ ok: false, reason: "injection-failed" });

    vi.useFakeTimers();
    scripting(vi.fn(() => new Promise(() => undefined)));
    const pending = handleRuntimeMessage(
      { type: "jc:extract", tabId: 4 },
      { id: chrome.runtime.id },
    );
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
    const payload = await handleRuntimeMessage(
      { type: "jc:extract", tabId: 2 },
      { id: chrome.runtime.id },
    );
    expect(payload).toMatchObject({ ok: true, title: "Analyst", source: "linkedin" });
    expect(payload && "password" in payload).toBe(false);
    expect(executeScript).toHaveBeenCalledWith(
      expect.objectContaining({ files: ["extractor.js"], target: { tabId: 2 } }),
    );
  });
});
