import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildClipReview } from "../core/extraction/review";
import { extractFromDocument } from "./pipeline";

/**
 * These fixtures are trimmed excerpts of public pages observed on 2026-11-23.
 * They lock the parser. They are not evidence that a live site still matches,
 * and they are not a Chrome extension test.
 */
const fixtureRoot = join(dirname(fileURLToPath(import.meta.url)), "../../tests/fixtures/sites");

function page(name: string): Document {
  const html = readFileSync(join(fixtureRoot, name), "utf8");
  return new DOMParser().parseFromString(html, "text/html");
}

describe("Wellfound adapter", () => {
  it("reads a remote India listing and does not invent a deadline or a salary", () => {
    const job = extractFromDocument(
      page("wellfound/remote-india.html"),
      "https://www.wellfound.com/jobs/4981464-software-engineer?utm_source=x",
    );
    expect(job.mode).toBe("detected");
    expect(job.source).toBe("wellfound");
    expect(job.title).toBe("Software Engineer");
    expect(job.company).toBe("Vested Finance");
    expect(job.workArrangement).toBe("remote");
    expect(job.workFromHome).toBe(true);
    expect(job.employmentType).toBe("full_time");
    expect(job.experienceRaw).toBe("2 years of exp");
    expect(job.locationRaw).toBe("Ahmedabad, Mumbai, Gandhinagar, Bangalore Urban");
    expect(job.eligibleCountries).toEqual(["India"]);
    expect(job.skills).toEqual(["Java", "Node.js"]);
    expect(job.compensationRaw).toBeUndefined();
    expect(job.deadline).toBeUndefined();
    expect(job.description).toMatch(/Visa Sponsorship Not Available/);
    expect(job.sourceJobId).toBe("4981464");
    expect(job.canonicalUrl).toBe("https://wellfound.com/jobs/4981464-software-engineer");
    const review = buildClipReview(job);
    expect(review.eligibility).toBe("remote_india");
    expect(review.visaSponsorship).toBe("no");
    expect(review.missing).toEqual(expect.arrayContaining(["Deadline", "Salary"]));
  });

  it("stays manual when the heading is empty or the URL is not a job", () => {
    const empty = extractFromDocument(
      page("wellfound/malformed.html"),
      "https://wellfound.com/jobs/4875063-junior-qa-engineer",
    );
    expect(empty.mode).toBe("manual");
    expect(empty.reason).toBe("empty");
    expect(empty.deadline).toBeUndefined();

    const search = extractFromDocument(
      page("wellfound/remote-india.html"),
      "https://wellfound.com/jobs",
    );
    expect(search.mode).toBe("manual");
    expect(search.reason).toBe("not-job-page");
  });
});

describe("YC Jobs adapter", () => {
  it("treats a US remote listing as restricted and ignores the $1 salary and validThrough", () => {
    const job = extractFromDocument(
      page("ycombinator/remote-us.html"),
      "https://www.ycombinator.com/companies/wasmer/jobs/peVgEv8-rust-engineer-distributed-systems?ref=x",
    );
    expect(job.mode).toBe("detected");
    expect(job.title).toBe("Rust Engineer, Distributed Systems");
    expect(job.company).toBe("Wasmer");
    expect(job.workArrangement).toBe("remote");
    expect(job.locationRaw).toBe("Remote");
    expect(job.employmentType).toBe("full_time");
    expect(job.experienceRaw).toBe("6+ years");
    expect(job.compensationRaw).toBeUndefined();
    expect(job.deadline).toBeUndefined();
    expect(job.applicantLocations).toEqual(["US"]);
    expect(job.sourceJobId).toBe("peVgEv8");
    const review = buildClipReview(job);
    expect(review.eligibility).toBe("remote_restricted");
    expect(review.visaSponsorship).toBe("unknown");
    expect(review.missing).toEqual(expect.arrayContaining(["Deadline", "Salary"]));
  });

  it("keeps a city listing unknown and records a visa limit without a deadline", () => {
    const job = extractFromDocument(
      page("ycombinator/city-visa.html"),
      "https://ycombinator.com/companies/turing-labs-inc/jobs/ta5gNnk-senior-software-engineer-full-stack",
    );
    expect(job.locationRaw).toBe("Palo Alto, CA, US");
    expect(job.workArrangement).toBeUndefined();
    expect(job.compensationRaw).toBe("$200K–$250K");
    expect(job.skills).toEqual(["TypeScript", "React", "Node.js"]);
    expect(job.deadline).toBeUndefined();
    expect(job.sourceJobId).toBe("ta5gNnk");
    const review = buildClipReview(job);
    expect(review.eligibility).toBe("unknown");
    expect(review.visaSponsorship).toBe("no");
  });

  it("stays manual for a broken listing and ignores the jobs index", () => {
    const broken = extractFromDocument(
      page("ycombinator/malformed.html"),
      "https://ycombinator.com/companies/wasmer/jobs/peVgEv8-rust-engineer",
    );
    expect(broken.mode).toBe("manual");
    expect(broken.reason).toBe("empty");
    const index = extractFromDocument(
      page("ycombinator/remote-us.html"),
      "https://www.ycombinator.com/jobs",
    );
    expect(index.reason).toBe("not-job-page");
  });
});

describe("Himalayas adapter", () => {
  it("reads Apply before and ignores Posted on and validThrough", () => {
    const job = extractFromDocument(
      page("himalayas/india-deadline.html"),
      "https://himalayas.app/companies/nurdsoft/jobs/senior-qa-engineer-india?utm_source=x",
    );
    expect(job.mode).toBe("detected");
    expect(job.company).toBe("Nurdsoft");
    expect(job.title).toBe("Senior QA Engineer- India");
    expect(job.workArrangement).toBe("remote");
    expect(job.workFromHome).toBe(true);
    expect(job.employmentType).toBe("full_time");
    expect(job.experienceRaw).toBe("5 years minimum");
    expect(job.skills).toEqual(["QA", "Selenium"]);
    expect(job.eligibleCountries).toEqual(["India"]);
    expect(job.deadline).toEqual({ date: "2026-12-10", evidence: "Apply before Dec 10, 2026" });
    expect(job.description).toMatch(/India team/);
    expect(job.description).not.toMatch(/Ignore this copy/);
    expect(job.sourceJobId).toBe("senior-qa-engineer-india");
    expect(job.compensationRaw).toBeUndefined();
    const review = buildClipReview(job);
    expect(review.eligibility).toBe("remote_india");
    expect(review.missing).toContain("Salary");
  });

  it("keeps a country list that excludes India even when the title says Worldwide", () => {
    const job = extractFromDocument(
      page("himalayas/country-list.html"),
      "https://himalayas.app/companies/holepunch/jobs/p2p-node-js-engineer-100-remote-worldwide-7428948833",
    );
    expect(job.deadline?.date).toBe("2026-12-10");
    expect(job.applicantLocations).toEqual(["Denmark", "Germany", "Greece", "Switzerland"]);
    expect(job.workArrangement).toBe("remote");
    expect(job.sourceJobId).toBe("7428948833");
    expect(buildClipReview(job).eligibility).toBe("remote_restricted");
  });

  it("does not invent a deadline from validThrough and rejects a page without a heading", () => {
    const open = extractFromDocument(
      page("himalayas/no-deadline.html"),
      "https://himalayas.app/companies/nurdsoft/jobs/support-engineer",
    );
    expect(open.mode).toBe("detected");
    expect(open.deadline).toBeUndefined();
    expect(buildClipReview(open).missing).toEqual(
      expect.arrayContaining(["Deadline", "Salary", "Experience"]),
    );

    const broken = extractFromDocument(
      page("himalayas/malformed.html"),
      "https://himalayas.app/companies/nurdsoft/jobs/support-engineer",
    );
    expect(broken.mode).toBe("manual");
    expect(broken.reason).toBe("empty");
  });
});

describe("We Work Remotely adapter", () => {
  it("reads Apply before from the sidebar and a single country", () => {
    const job = extractFromDocument(
      page("weworkremotely/us-deadline.html"),
      "https://weworkremotely.com/remote-jobs/welcomehome-software-senior-software-engineer/",
    );
    expect(job.mode).toBe("detected");
    expect(job.title).toBe("Senior Software Engineer");
    expect(job.company).toBe("WelcomeHome Software");
    expect(job.workArrangement).toBe("remote");
    expect(job.employmentType).toBe("full_time");
    expect(job.compensationRaw).toBe("$100,000 or more USD");
    expect(job.skills).toEqual(["Ruby", "Ruby on Rails"]);
    expect(job.eligibleCountries).toEqual(["United States of America"]);
    expect(job.deadline).toEqual({ date: "2026-12-02", evidence: "Apply before Dec 2th, 2026" });
    expect(job.description).toMatch(/based in the U\.S\./);
    expect(job.description).not.toMatch(/\$100,000/);
    expect(job.sourceJobId).toBe("welcomehome-software-senior-software-engineer");
    const review = buildClipReview(job);
    expect(review.eligibility).toBe("remote_restricted");
    expect(review.missing).not.toContain("Deadline");
  });

  it("treats a country list without India as restricted and records the visa line", () => {
    const job = extractFromDocument(
      page("weworkremotely/country-list.html"),
      "https://weworkremotely.com/remote-jobs/lemon-io-senior-react-full-stack-developer-8",
    );
    expect(job.deadline?.date).toBe("2026-12-19");
    expect(job.compensationRaw).toBeUndefined();
    expect(job.eligibleCountries).toEqual(["Japan", "Singapore", "South Korea"]);
    const review = buildClipReview(job);
    expect(review.eligibility).toBe("remote_restricted");
    expect(review.visaSponsorship).toBe("no");
    expect(review.missing).toContain("Salary");
  });

  it("accepts Anywhere in the World and ignores a posted date", () => {
    const open = extractFromDocument(
      page("weworkremotely/anywhere.html"),
      "https://weworkremotely.com/remote-jobs/northwind-writer",
    );
    expect(open.eligibleCountries).toEqual(["Worldwide"]);
    expect(open.deadline).toBeUndefined();
    expect(buildClipReview(open).eligibility).toBe("remote_worldwide");

    const posted = extractFromDocument(
      page("weworkremotely/no-deadline.html"),
      "https://weworkremotely.com/remote-jobs/northwind-designer",
    );
    expect(posted.deadline).toBeUndefined();
    expect(buildClipReview(posted).eligibility).toBe("remote_restricted");

    const broken = extractFromDocument(
      page("weworkremotely/malformed.html"),
      "https://weworkremotely.com/remote-jobs/northwind-designer",
    );
    expect(broken.reason).toBe("empty");
    expect(
      extractFromDocument(page("weworkremotely/us-deadline.html"), "https://weworkremotely.com/")
        .reason,
    ).toBe("not-job-page");
  });
});

describe("Unstop adapter", () => {
  it("reads an on-site India job and ignores unpaid salary and validThrough", () => {
    const job = extractFromDocument(
      page("unstop/job-onsite.html"),
      "https://unstop.com/jobs/data-scientist-exl-1821516?trk=1",
    );
    expect(job.mode).toBe("detected");
    expect(job.title).toBe("Data Scientist");
    expect(job.company).toBe("EXL");
    expect(job.workArrangement).toBe("onsite");
    expect(job.locationRaw).toBe("Pan India");
    expect(job.experienceRaw).toBe("Fresher");
    expect(job.employmentType).toBe("full_time");
    expect(job.skills).toEqual(["Python", "Conversational AI"]);
    expect(job.compensationRaw).toBeUndefined();
    expect(job.deadline).toBeUndefined();
    expect(job.description).toMatch(/portfolio/);
    expect(job.sourceJobId).toBe("1821516");
    const review = buildClipReview(job);
    expect(review.eligibility).toBe("india_onsite");
    expect(review.missing).toEqual(expect.arrayContaining(["Deadline", "Salary"]));
  });

  it("uses the internship path instead of JSON-LD full-time", () => {
    const job = extractFromDocument(
      page("unstop/internship.html"),
      "https://unstop.com/internships/power-bi-apprenticeship-crowe-llp-1809168",
    );
    expect(job.company).toBe("Crowe LLP");
    expect(job.employmentType).toBe("internship");
    expect(job.fieldSources.employmentType).toBe("adapter");
    expect(job.locationRaw).toBe("Hyderabad");
    expect(job.skills).toEqual(["Power BI"]);
    expect(job.compensationRaw).toBeUndefined();
    expect(job.deadline).toBeUndefined();
    expect(job.sourceJobId).toBe("1809168");
    expect(buildClipReview(job).eligibility).toBe("india_onsite");
  });

  it("reads a registration deadline only when that label is present", () => {
    const job = extractFromDocument(
      page("unstop/labelled-deadline.html"),
      "https://unstop.com/jobs/campus-analyst-example-1000001",
    );
    expect(job.deadline).toEqual({
      date: "2026-12-18",
      evidence: "Registration Deadline 18 Dec 2026",
    });
    expect(job.employmentType).toBe("full_time");
  });

  it("waits on the shell and ignores competitions", () => {
    const shell = extractFromDocument(
      page("unstop/shell.html"),
      "https://unstop.com/jobs/data-scientist-exl-1821516",
    );
    expect(shell.mode).toBe("manual");
    expect(shell.reason).toBe("not-job-page");
    const competition = extractFromDocument(
      page("unstop/job-onsite.html"),
      "https://unstop.com/competitions/hackathon-123456",
    );
    expect(competition.reason).toBe("not-job-page");
  });
});

describe("Cutshort adapter", () => {
  it("reads the summary and does not treat NA, a posted date, or validThrough as eligibility or a deadline", () => {
    const job = extractFromDocument(
      page("cutshort/remote.html"),
      "https://cutshort.io/job/Senior-Full-stack-Engineer-Sprinto-Rqw1mekJ",
    );
    expect(job.mode).toBe("detected");
    expect(job.title).toBe("Senior Full-stack Engineer");
    expect(job.company).toBe("Sprinto");
    expect(job.workArrangement).toBe("remote");
    expect(job.workFromHome).toBeUndefined();
    expect(job.experienceRaw).toBe("5 - 9 years");
    expect(job.compensationRaw).toMatch(/₹30L/);
    expect(job.employmentType).toBe("full_time");
    expect(job.skills).toEqual(["Node.js", "React", "TypeScript"]);
    expect(job.applicantLocations).toBeUndefined();
    expect(job.deadline).toBeUndefined();
    expect(job.description).toMatch(/compliance/);
    expect(job.sourceJobId).toBe("Rqw1mekJ");
    const review = buildClipReview(job);
    expect(review.eligibility).toBe("unknown");
    expect(review.eligibilityReasons.join(" ")).toMatch(/no evidence/i);
    expect(review.missing).toContain("Deadline");
  });

  it("leaves undisclosed pay missing and stays manual without a heading", () => {
    const job = extractFromDocument(
      page("cutshort/undisclosed.html"),
      "https://cutshort.io/job/Software-Architect-Reflektive-5Jr0Iim2",
    );
    expect(job.company).toBe("Reflektive");
    expect(job.workArrangement).toBe("remote");
    expect(job.compensationRaw).toBeUndefined();
    expect(job.deadline).toBeUndefined();
    expect(job.applicantLocations).toBeUndefined();
    expect(buildClipReview(job).eligibility).toBe("unknown");
    expect(buildClipReview(job).missing).toEqual(
      expect.arrayContaining(["Deadline", "Salary", "Experience"]),
    );

    const broken = extractFromDocument(
      page("cutshort/malformed.html"),
      "https://cutshort.io/job/Software-Architect-Reflektive-5Jr0Iim2",
    );
    expect(broken.reason).toBe("empty");
    expect(
      extractFromDocument(page("cutshort/remote.html"), "https://cutshort.io/jobs").reason,
    ).toBe("not-job-page");
  });
});

describe("sites left on manual entry", () => {
  it("does not extract Indeed, HiringCafe, Glassdoor, or ZipRecruiter", () => {
    const html = page("wellfound/remote-india.html");
    for (const url of [
      "https://in.indeed.com/viewjob?jk=abc123",
      "https://hiringcafe.com/job/example",
      "https://www.glassdoor.co.in/job-listing/example.htm",
      "https://www.ziprecruiter.com/jobs/example",
    ]) {
      const job = extractFromDocument(html, url);
      expect(job.mode).toBe("manual");
      expect(job.reason).toBe("unsupported");
      expect(job.adapter).toBe("none");
      expect(job.deadline).toBeUndefined();
    }
  });
});
