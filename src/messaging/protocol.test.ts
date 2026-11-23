import { describe, expect, it } from "vitest";
import { isExtensionPageSender, parseExtractRequest, parseExtractionPayload } from "./protocol";

describe("isExtensionPageSender", () => {
  it("accepts only pages that belong to this extension", () => {
    const id = chrome.runtime.id;
    expect(isExtensionPageSender({ id, url: `chrome-extension://${id}/popup.html` })).toBe(true);
    expect(
      isExtensionPageSender({ id, url: `chrome-extension://${id}/dashboard.html#/applications` }),
    ).toBe(true);
    expect(isExtensionPageSender({ id, url: "https://example.com/" })).toBe(false);
    expect(isExtensionPageSender({ id: "other", url: `chrome-extension://${id}/popup.html` })).toBe(
      false,
    );
    expect(isExtensionPageSender({ id, url: `chrome-extension://${id}.evil/popup.html` })).toBe(
      false,
    );
    expect(isExtensionPageSender({ id })).toBe(false);
    expect(isExtensionPageSender(undefined)).toBe(false);
  });
});

describe("parseExtractRequest", () => {
  it("accepts only an integer tab id", () => {
    expect(parseExtractRequest({ type: "jc:extract", tabId: 3 })).toEqual({
      type: "jc:extract",
      tabId: 3,
    });
    expect(parseExtractRequest({ type: "jc:extract", tabId: "3" })).toBeNull();
    expect(parseExtractRequest({ type: "jc:extract", tabId: -1 })).toBeNull();
    expect(parseExtractRequest({ type: "other" })).toBeNull();
    expect(parseExtractRequest(null)).toBeNull();
  });
});

describe("parseExtractionPayload", () => {
  it("drops unexpected properties and a deadline that is not a date", () => {
    const parsed = parseExtractionPayload({
      ok: true,
      mode: "detected",
      source: "internshala",
      adapter: "internshala",
      adapterVersion: 1,
      url: "https://internshala.com/internship/detail/role-1",
      canonicalUrl: "https://internshala.com/internship/detail/role-1",
      title: "Analyst",
      company: "Acme",
      deadline: { date: "18 Dec 2026", evidence: "APPLY BY 18 Dec 2026" },
      stolen: "cookie",
      fieldSources: { title: "adapter", bogus: "page" },
    });
    expect(parsed).toMatchObject({
      ok: true,
      title: "Analyst",
      company: "Acme",
      fieldSources: { title: "adapter" },
    });
    expect(parsed && parsed.ok && parsed.deadline).toBeUndefined();
    expect(parsed && "stolen" in parsed).toBe(false);
  });

  it("keeps a labelled ISO deadline and a failure reason", () => {
    const parsed = parseExtractionPayload({
      ok: true,
      mode: "detected",
      source: "naukri",
      adapter: "naukri",
      adapterVersion: 1,
      url: "https://naukri.com/job-listings-a-1",
      canonicalUrl: "https://naukri.com/job-listings-a-1",
      deadline: { date: "2027-01-09", evidence: "Apply By 9 Jan 2027" },
    });
    expect(parsed && parsed.ok && parsed.deadline).toEqual({
      date: "2027-01-09",
      evidence: "Apply By 9 Jan 2027",
    });
    expect(parseExtractionPayload({ ok: false, reason: "injection-failed" })).toEqual({
      ok: false,
      reason: "injection-failed",
    });
    expect(parseExtractionPayload({ ok: true })).toBeNull();
  });
});
