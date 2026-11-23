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

  it("keeps an Internshala detail slug and its trailing id", () => {
    const url = new URL(
      "https://WWW.Internshala.com/internship/detail/work-from-home-data-science-internship-at-codeatrix1794985193/?utm_source=x#apply",
    );
    expect(canonicalizeUrl(url)).toEqual({
      canonicalUrl:
        "https://internshala.com/internship/detail/work-from-home-data-science-internship-at-codeatrix1794985193",
      sourceJobId: "1794985193",
    });
  });

  it("keeps a Naukri listing path and its trailing id", () => {
    const url = new URL(
      "https://www.naukri.com/job-listings-data-analyst-capgemini-987654321?utm_campaign=x",
    );
    expect(canonicalizeUrl(url)).toEqual({
      canonicalUrl: "https://naukri.com/job-listings-data-analyst-capgemini-987654321",
      sourceJobId: "987654321",
    });
  });

  it("collapses Wellfound company and job links onto the job id", () => {
    const direct = canonicalizeUrl(
      new URL("https://www.wellfound.com/jobs/4981464-software-engineer?utm_source=x"),
    );
    const company = canonicalizeUrl(
      new URL("https://wellfound.com/company/vested-finance-1/jobs/4981464-software-engineer/"),
    );
    expect(direct).toEqual({
      canonicalUrl: "https://wellfound.com/jobs/4981464-software-engineer",
      sourceJobId: "4981464",
    });
    expect(company.canonicalUrl).toBe(direct.canonicalUrl);
  });

  it("keeps a Y Combinator company job and its id", () => {
    const url = new URL(
      "https://www.ycombinator.com/companies/wasmer/jobs/peVgEv8-rust-engineer-distributed-systems?ref=x",
    );
    expect(canonicalizeUrl(url)).toEqual({
      canonicalUrl:
        "https://ycombinator.com/companies/wasmer/jobs/peVgEv8-rust-engineer-distributed-systems",
      sourceJobId: "peVgEv8",
    });
  });

  it("keeps Himalayas, We Work Remotely, Unstop and Cutshort ids", () => {
    expect(
      canonicalizeUrl(
        new URL(
          "https://himalayas.app/companies/holepunch/jobs/p2p-node-js-engineer-100-remote-worldwide-7428948833?utm_source=x",
        ),
      ),
    ).toEqual({
      canonicalUrl:
        "https://himalayas.app/companies/holepunch/jobs/p2p-node-js-engineer-100-remote-worldwide-7428948833",
      sourceJobId: "7428948833",
    });
    expect(
      canonicalizeUrl(
        new URL(
          "https://weworkremotely.com/remote-jobs/welcomehome-software-senior-software-engineer/",
        ),
      ).sourceJobId,
    ).toBe("welcomehome-software-senior-software-engineer");
    expect(
      canonicalizeUrl(new URL("https://unstop.com/jobs/data-scientist-exl-1821516?trk=1")),
    ).toEqual({
      canonicalUrl: "https://unstop.com/jobs/data-scientist-exl-1821516",
      sourceJobId: "1821516",
    });
    expect(
      canonicalizeUrl(
        new URL("https://cutshort.io/job/Senior-Full-stack-Engineer-Sprinto-Rqw1mekJ"),
      ).sourceJobId,
    ).toBe("Rqw1mekJ");
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
    ["https://www.naukri.com/job-listings-a-1", "naukri"],
    ["https://www.glassdoor.co.in/job-listing/x", "glassdoor"],
    ["https://notlinkedin.com/jobs", "other"],
    ["https://careers.example.com/job/1", "other"],
  ])("labels %s as %s", (url, source) => {
    expect(sourceFromUrl(new URL(url))).toBe(source);
  });
});
