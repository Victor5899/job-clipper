import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildClipReview } from "../core/extraction/review";
import { extractFromDocument } from "./pipeline";

/**
 * These fixtures are trimmed excerpts of public pages observed on 2026-11-22.
 * They lock the parser. They are not evidence that a live site still matches,
 * and they are not a Chrome extension test.
 */
const fixtureRoot = join(dirname(fileURLToPath(import.meta.url)), "../../tests/fixtures/sites");

function page(name: string): Document {
  const html = readFileSync(join(fixtureRoot, name), "utf8");
  return new DOMParser().parseFromString(html, "text/html");
}

describe("Internshala adapter", () => {
  it("reads an Apply By label and ignores JSON-LD expiry and description dates", () => {
    const job = extractFromDocument(
      page("internshala/wfh-apply-by.html"),
      "https://www.internshala.com/internship/detail/work-from-home-data-science-internship-at-codeatrix1794985193?utm_source=x",
    );
    expect(job.mode).toBe("detected");
    expect(job.source).toBe("internshala");
    expect(job.title).toBe("Data Science");
    expect(job.company).toBe("Codeatrix");
    expect(job.fieldSources.title).toBe("adapter");
    expect(job.fieldSources.company).toBe("adapter");
    expect(job.locationRaw).toBe("Work from home");
    expect(job.workArrangement).toBe("remote");
    expect(job.workFromHome).toBe(true);
    expect(job.employmentType).toBe("internship");
    expect(job.compensationRaw).toBe("₹ 20,000 - 27,000 /month");
    expect(job.skills).toEqual(["Python", "SQL"]);
    expect(job.description).toMatch(/clean data/i);
    expect(job.deadline).toEqual({
      date: "2026-12-18",
      evidence: "APPLY BY 18 Dec' 26",
    });
    expect(job.sourceJobId).toBe("1794985193");
    expect(job.canonicalUrl).toBe(
      "https://internshala.com/internship/detail/work-from-home-data-science-internship-at-codeatrix1794985193",
    );

    const review = buildClipReview(job, 2027);
    expect(review.eligibility).toBe("unknown");
    expect(review.eligibilityConfidence).toBe("low");
    expect(review.eligibilityReasons.join(" ")).toMatch(/work from home does not say/i);
    expect(review.missing).toEqual(["Experience"]);
  });

  it("treats a city, rather than work from home, as on-site in India", () => {
    const job = extractFromDocument(
      page("internshala/chennai-onsite.html"),
      "https://internshala.com/internship/detail/data-science-internship-in-chennai-at-career-solutions1790000001/",
    );
    expect(job.company).toBe("Career Solutions");
    expect(job.locationRaw).toBe("Chennai");
    expect(job.workArrangement).toBe("onsite");
    expect(job.deadline?.date).toBe("2026-12-20");
    expect(job.compensationRaw).toBe("₹ 10,000 /month");
    expect(buildClipReview(job).eligibility).toBe("india_onsite");
  });

  it("does not turn a start date or a JSON-LD deadline into an application deadline", () => {
    const job = extractFromDocument(
      page("internshala/job-no-deadline.html"),
      "https://internshala.com/job/detail/associate-data-scientist-job-at-softsensorai1790000002",
    );
    expect(job.deadline).toBeUndefined();
    expect(job.employmentType).toBe("full_time");
    expect(job.experienceRaw).toBe("No experience required");
    expect(job.compensationRaw).toBe("₹ 5,00,000 - 6,00,000 /year");
    expect(job.locationRaw).toMatch(/Gurgaon/);
    expect(job.locationRaw).toMatch(/Jaipur/);
    expect(job.workArrangement).toBe("onsite");
    expect(job.description).toMatch(/start date/i);
    expect(buildClipReview(job).eligibility).toBe("india_onsite");
  });
});

describe("LinkedIn adapter", () => {
  it("reads the guest job card and ignores validThrough plus a date written in prose", () => {
    const job = extractFromDocument(
      page("linkedin/guest-internship.html"),
      "https://www.linkedin.com/jobs/view/healthcare-data-analyst-intern-at-milliman-4391658594?trk=public",
    );
    expect(job.mode).toBe("detected");
    expect(job.title).toBe("Healthcare Data Analyst-Intern");
    expect(job.company).toBe("Milliman India");
    expect(job.fieldSources.title).toBe("adapter");
    expect(job.locationRaw).toBe("Gurgaon, Haryana, India");
    expect(job.workArrangement).toBeUndefined();
    expect(job.employmentType).toBe("internship");
    expect(job.deadline).toBeUndefined();
    expect(job.description).toMatch(/Hybrid/);
    expect(job.sourceJobId).toBe("4391658594");
    expect(job.canonicalUrl).toBe("https://linkedin.com/jobs/view/4391658594");
    expect(buildClipReview(job).eligibility).toBe("unknown");
  });

  it("keeps a bare Remote label as unknown even when the description restricts a region", () => {
    const job = extractFromDocument(
      page("linkedin/remote-restricted.html"),
      "https://linkedin.com/jobs/view/support-engineer-1000001",
    );
    expect(job.workArrangement).toBe("remote");
    expect(job.company).toBe("Northwind");
    expect(job.deadline).toBeUndefined();
    const review = buildClipReview(job);
    expect(review.eligibility).toBe("remote_restricted");
    expect(review.visaSponsorship).toBe("no");
    expect(review.missing).toContain("Deadline");
    expect(review.missing).toContain("Salary");
  });

  it("reports a detected job when the company link is missing", () => {
    const job = extractFromDocument(
      page("linkedin/missing-company.html"),
      "https://linkedin.com/jobs/view/data-analyst-1000002",
    );
    expect(job.mode).toBe("detected");
    expect(job.title).toBe("Data Analyst");
    expect(job.company).toBeUndefined();
    expect(buildClipReview(job).missing).toContain("Company");
  });
});

describe("Naukri adapter", () => {
  it("reads hybrid, skills and experience, and ignores validThrough", () => {
    const job = extractFromDocument(
      page("naukri/hybrid-no-deadline.html"),
      "https://www.naukri.com/job-listings-data-analyst-capgemini-987654321",
    );
    expect(job.mode).toBe("detected");
    expect(job.title).toBe("Data Analyst");
    expect(job.company).toBe("Capgemini");
    expect(job.experienceRaw).toBe("4 - 9 years");
    expect(job.compensationRaw).toBeUndefined();
    expect(job.workArrangement).toBe("hybrid");
    expect(job.locationRaw).toMatch(/Chennai/);
    expect(job.employmentType).toBe("full_time");
    expect(job.fieldSources.employmentType).toBe("jsonld");
    expect(job.skills).toEqual(["SQL", "Power BI"]);
    expect(job.deadline).toBeUndefined();
    expect(job.description).toMatch(/SQL/);
    expect(job.sourceJobId).toBe("987654321");
    expect(buildClipReview(job).eligibility).toBe("india_hybrid");
    expect(buildClipReview(job).missing).toEqual(expect.arrayContaining(["Deadline", "Salary"]));
  });

  it("does not treat Remote plus an Indian office as India-eligible", () => {
    const job = extractFromDocument(
      page("naukri/remote-salary.html"),
      "https://www.naukri.com/job-listings-data-analyst-sphinxhire-111111",
    );
    expect(job.workArrangement).toBe("remote");
    expect(job.workFromHome).toBeUndefined();
    expect(job.locationRaw).toBe("Hyderabad");
    expect(job.compensationRaw).toBe("3.5-8 Lacs P.A.");
    expect(job.experienceRaw).toBe("0 - 2 years");
    expect(job.deadline).toBeUndefined();
    expect(buildClipReview(job).eligibility).toBe("unknown");
  });

  it("reads an explicit Apply By label and drops tracking from the URL", () => {
    const job = extractFromDocument(
      page("naukri/labelled-deadline.html"),
      "https://www.naukri.com/job-listings-campus-analyst-example-1234567?utm_campaign=x",
    );
    expect(job.deadline).toEqual({ date: "2027-01-09", evidence: "Apply By 9 Jan 2027" });
    expect(job.canonicalUrl).toBe("https://naukri.com/job-listings-campus-analyst-example-1234567");
    expect(job.company).toBe("Example Labs");
  });
});

describe("extraction fallback", () => {
  it("stays on manual entry for an unsupported site", () => {
    const job = extractFromDocument(
      page("invalid.html"),
      "https://boards.greenhouse.io/example/jobs/1",
    );
    expect(job).toMatchObject({
      mode: "manual",
      reason: "unsupported",
      source: "other",
      adapter: "none",
    });
    expect(job.title).toBeUndefined();
  });

  it("stays on manual entry when a supported host is not a job page", () => {
    const job = extractFromDocument(
      page("internshala/wfh-apply-by.html"),
      "https://internshala.com/internships/work-from-home-internships",
    );
    expect(job).toMatchObject({ mode: "manual", reason: "not-job-page", source: "internshala" });
    expect(job.title).toBeUndefined();
  });

  it("drops a page that has no readable title or company", () => {
    const job = extractFromDocument(
      page("invalid.html"),
      "https://internshala.com/internship/detail/broken-page-100000",
    );
    expect(job).toMatchObject({ mode: "manual", reason: "empty" });
    expect(job.title).toBeUndefined();
    expect(job.deadline).toBeUndefined();
  });

  it("rejects a restricted URL without reading it as a job", () => {
    const job = extractFromDocument(page("invalid.html"), "chrome://extensions/");
    expect(job).toMatchObject({ mode: "manual", reason: "unreadable", source: "other" });
  });

  it("survives broken JSON-LD", () => {
    const doc = page("linkedin/missing-company.html");
    const script = doc.createElement("script");
    script.type = "application/ld+json";
    script.textContent = "{not json";
    doc.body.append(script);
    const job = extractFromDocument(doc, "https://linkedin.com/jobs/view/data-analyst-1000002");
    expect(job.title).toBe("Data Analyst");
    expect(job.deadline).toBeUndefined();
  });
});
