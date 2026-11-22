import { describe, expect, it } from "vitest";
import { chromeFake } from "../../tests/fakes/chrome";
import { clearDraft, draftKey, loadDraft, saveDraft } from "./popupDraft";

const values = {
  title: "BI Intern",
  company: "Swiggy",
  url: "",
  deadlineDate: "",
  deadlineTime: "",
};

describe("popup drafts", () => {
  it("are stored per tab in chrome.storage.session, never in local storage", async () => {
    await saveDraft(7, values, new Date("2026-11-22T00:00:00.000Z"));

    expect(chromeFake().storage.session.snapshot()).toEqual({
      "popupDraft:7": { values, updatedAt: "2026-11-22T00:00:00.000Z" },
    });
    expect(chromeFake().storage.local.snapshot()).toEqual({});
    expect(await loadDraft(7)).toMatchObject({ values });
    expect(await loadDraft(8)).toBeUndefined();
  });

  it("uses a fallback key when there is no tab", () => {
    expect(draftKey(undefined)).toBe("popupDraft:no-tab");
  });

  it("can be cleared", async () => {
    await saveDraft(7, values);
    await clearDraft(7);
    expect(await loadDraft(7)).toBeUndefined();
  });

  it("ignores malformed stored drafts", async () => {
    await chromeFake().storage.session.set({ "popupDraft:7": { values: { title: 3 } } });
    expect(await loadDraft(7)).toBeUndefined();
  });
});
