import { describe, expect, it } from "vitest";
import { makeJob } from "../../tests/factories";
import { findDuplicates, tokenSimilarity } from "./duplicates";

const now = new Date("2026-11-22T12:00:00");

describe("tokenSimilarity", () => {
  it("treats company suffixes and punctuation as the same name", () => {
    expect(tokenSimilarity("Zomato Pvt. Ltd.", "zomato")).toBe(1);
    expect(tokenSimilarity("Acme, Inc.", "Acme")).toBe(1);
  });

  it("does not match different companies", () => {
    expect(tokenSimilarity("Zomato", "Swiggy")).toBe(0);
  });
});

describe("findDuplicates", () => {
  const saved = makeJob({
    title: "Data Analyst Intern",
    company: "Zomato Pvt Ltd",
    url: "https://www.linkedin.com/jobs/view/123/?trk=public",
    canonicalUrl: "https://linkedin.com/jobs/view/123",
    source: "linkedin",
    sourceJobId: "123",
    status: "applied",
    savedAt: "2026-11-12T09:00:00.000Z",
  });

  it("matches the same job link after normalisation", () => {
    const matches = findDuplicates(
      {
        title: "Something else",
        company: "Other",
        url: "http://linkedin.com/jobs/view/data-analyst-123",
      },
      [saved],
      now,
    );
    expect(matches.map((match) => match.kind)).toEqual(["exact"]);
    expect(matches[0]?.job.id).toBe(saved.id);
  });

  it("matches the same source job id even when the link text differs", () => {
    const matches = findDuplicates(
      {
        title: "Other",
        company: "Other",
        url: "https://example.com/not-the-same",
        source: "linkedin",
        sourceJobId: "123",
      },
      [saved],
      now,
    );
    expect(matches.map((match) => match.kind)).toEqual(["exact"]);
  });

  it("matches a similar company and title saved within 60 days", () => {
    const matches = findDuplicates(
      { title: "Data Analyst Intern", company: "Zomato", url: "https://careers.example.com/other" },
      [saved],
      now,
    );
    expect(matches.map((match) => match.kind)).toEqual(["probable"]);
  });

  it("ignores a similar title once the saved job is older than 60 days", () => {
    const old = {
      ...saved,
      savedAt: "2026-08-01T00:00:00.000Z",
      url: "https://example.com/old",
      canonicalUrl: "https://example.com/old",
    };
    const matches = findDuplicates(
      { title: "Data Analyst Intern", company: "Zomato", url: "https://careers.example.com/new" },
      [old],
      now,
    );
    expect(matches).toEqual([]);
  });

  it("does not match a different role at the same company", () => {
    const matches = findDuplicates(
      { title: "Finance Intern", company: "Zomato", url: "https://careers.example.com/finance" },
      [saved],
      now,
    );
    expect(matches).toEqual([]);
  });

  it("does not report the job being edited as a duplicate of itself", () => {
    const matches = findDuplicates(
      { title: saved.title, company: saved.company, url: saved.url },
      [saved],
      now,
      saved.id,
    );
    expect(matches).toEqual([]);
  });
});
