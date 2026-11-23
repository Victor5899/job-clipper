import { describe, expect, it } from "vitest";
import { chromeFake } from "../../tests/fakes/chrome";
import { openListing } from "./openListing";

describe("openListing", () => {
  it("opens an http(s) listing and refuses every other scheme", async () => {
    await expect(openListing("https://example.com/jobs/1")).resolves.toBe(true);
    expect(chromeFake().tabs.create).toHaveBeenCalledWith({ url: "https://example.com/jobs/1" });

    await expect(openListing("javascript:alert(1)")).resolves.toBe(false);
    await expect(openListing("chrome://extensions")).resolves.toBe(false);
    await expect(openListing("chrome-extension://abc/popup.html")).resolves.toBe(false);
    await expect(openListing("")).resolves.toBe(false);
    expect(chromeFake().tabs.create).toHaveBeenCalledTimes(1);
  });
});
