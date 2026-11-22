import { describe, expect, it } from "vitest";
import { canonicalizeUrl, parseHttpUrl, sourceFromUrl } from "./url";

describe("parseHttpUrl", () => {
  it("accepts only http and https", () => {
    expect(parseHttpUrl("https://example.com/a")?.href).toBe("https://example.com/a");
    expect(parseHttpUrl("http://example.com")?.href).toBe("http://example.com/");
    expect(parseHttpUrl("chrome://newtab")).toBeNull();
    expect(parseHttpUrl("javascript:void(0)")).toBeNull();
    expect(parseHttpUrl("")).toBeNull();
  });
});

describe("canonicalizeUrl", () => {
  it("strips www, the fragment and tracking parameters", () => {
    const url = new URL(
      "https://WWW.Example.com/jobs/1/?utm_source=newsletter&trk=feed&refId=9#apply",
    );
    expect(canonicalizeUrl(url)).toEqual({ canonicalUrl: "https://example.com/jobs/1" });
  });

  it("treats http and https, and a trailing slash, as the same LinkedIn job", () => {
    const http = canonicalizeUrl(new URL("http://www.linkedin.com/jobs/view/123/"));
    const https = canonicalizeUrl(
      new URL("https://linkedin.com/jobs/view/data-analyst-at-acme-123?trk=public"),
    );
    expect(http).toEqual({
      canonicalUrl: "https://linkedin.com/jobs/view/123",
      sourceJobId: "123",
    });
    expect(https.canonicalUrl).toBe(http.canonicalUrl);
  });

  it("keeps the Indeed country subdomain and the job id", () => {
    const url = new URL("https://in.indeed.com/viewjob?jk=abc123&utm_campaign=x");
    expect(canonicalizeUrl(url)).toEqual({
      canonicalUrl: "https://in.indeed.com/viewjob?jk=abc123",
      sourceJobId: "abc123",
    });
  });

  it("sorts the remaining query so parameter order does not matter", () => {
    const a = canonicalizeUrl(new URL("https://example.com/job?b=2&a=1"));
    const b = canonicalizeUrl(new URL("https://example.com/job?a=1&b=2"));
    expect(a.canonicalUrl).toBe(b.canonicalUrl);
  });
});

describe("sourceFromUrl", () => {
  it.each([
    ["https://internshala.com/internship/detail/x", "internshala"],
    ["https://www.linkedin.com/jobs/view/1", "linkedin"],
    ["https://in.indeed.com/viewjob?jk=1", "indeed"],
    ["https://www.glassdoor.co.in/job-listing/x", "glassdoor"],
    ["https://notlinkedin.com/jobs", "other"],
    ["https://careers.example.com/job/1", "other"],
  ])("labels %s as %s", (url, source) => {
    expect(sourceFromUrl(new URL(url))).toBe(source);
  });
});
