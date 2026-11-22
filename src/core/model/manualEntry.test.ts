import { describe, expect, it } from "vitest";
import {
  clearFieldError,
  EMPTY_MANUAL_ENTRY,
  validateManualEntry,
  type ManualEntryValues,
} from "./manualEntry";

const valid: ManualEntryValues = {
  title: "Data Engineering Intern",
  company: "Zomato",
  url: "https://internshala.com/internship/detail/data-engineering-intern",
  deadlineDate: "",
  deadlineTime: "",
};

describe("validateManualEntry", () => {
  it("requires title, company and URL", () => {
    const result = validateManualEntry(EMPTY_MANUAL_ENTRY);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual({
      title: "Enter the job title.",
      company: "Enter the company name.",
      url: "Enter the link to the job listing.",
    });
  });

  it("treats whitespace-only values as missing", () => {
    const result = validateManualEntry({ ...valid, title: "   ", company: "\n\t" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(["company", "title"]);
  });

  it.each([
    ["javascript:alert(1)"],
    ["ftp://example.com/job"],
    ["file:///etc/passwd"],
    ["chrome://extensions"],
    ["data:text/html,hi"],
    ["not a url"],
    ["www.example.com/job"],
  ])("rejects the non-http(s) URL %s", (url) => {
    const result = validateManualEntry({ ...valid, url });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.url).toBe("Enter a full web address starting with http:// or https://.");
  });

  it("rejects URLs longer than 2048 characters", () => {
    const result = validateManualEntry({
      ...valid,
      url: `https://example.com/${"a".repeat(2100)}`,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.url).toBe("This link is too long.");
  });

  it("accepts http and https URLs and normalises them", () => {
    const result = validateManualEntry({ ...valid, url: "  HTTP://Example.com/jobs/1  " });
    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({ url: "http://example.com/jobs/1" }),
    });
  });

  it("returns a null deadline when none is provided", () => {
    const result = validateManualEntry(valid);
    expect(result).toEqual({
      ok: true,
      value: {
        title: "Data Engineering Intern",
        company: "Zomato",
        url: "https://internshala.com/internship/detail/data-engineering-intern",
        deadline: null,
      },
    });
  });

  it("keeps a deadline date with an optional time", () => {
    expect(validateManualEntry({ ...valid, deadlineDate: "2026-11-30" })).toMatchObject({
      ok: true,
      value: { deadline: { date: "2026-11-30" } },
    });
    expect(
      validateManualEntry({ ...valid, deadlineDate: "2026-11-30", deadlineTime: "18:30" }),
    ).toMatchObject({ ok: true, value: { deadline: { date: "2026-11-30", time: "18:30" } } });
  });

  it("accepts a deadline in the past (the job is simply closed)", () => {
    expect(validateManualEntry({ ...valid, deadlineDate: "2020-01-15" }).ok).toBe(true);
  });

  it("rejects impossible dates and malformed times", () => {
    const badDate = validateManualEntry({ ...valid, deadlineDate: "2026-02-30" });
    expect(badDate.ok || badDate.errors.deadlineDate).toBe("Enter a real calendar date.");

    const badTime = validateManualEntry({
      ...valid,
      deadlineDate: "2026-11-30",
      deadlineTime: "25:00",
    });
    expect(badTime.ok || badTime.errors.deadlineTime).toBe("Enter a time as HH:MM.");
  });

  it("rejects a time without a date", () => {
    const result = validateManualEntry({ ...valid, deadlineTime: "10:00" });
    expect(result.ok || result.errors.deadlineTime).toBe(
      "Add a deadline date before adding a time.",
    );
  });

  it("clears a single field's error without touching the others", () => {
    const errors = { title: "a", url: "b" };
    expect(clearFieldError(errors, "title")).toEqual({ url: "b" });
    expect(clearFieldError(errors, "company")).toBe(errors);
    expect(errors).toEqual({ title: "a", url: "b" });
  });

  it("collapses whitespace and strips control characters", () => {
    const result = validateManualEntry({ ...valid, title: "  Data\u0000  Analyst\n Intern " });
    expect(result.ok && result.value.title).toBe("Data Analyst Intern");
  });
});
