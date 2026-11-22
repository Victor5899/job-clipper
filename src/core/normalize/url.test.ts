import { describe, expect, it } from "vitest";
import { parseHttpUrl, sourceFromUrl } from "./url";

describe("parseHttpUrl", () => {
  it("accepts only http and https", () => {
    expect(parseHttpUrl("https://example.com/a")?.href).toBe("https://example.com/a");
    expect(parseHttpUrl("http://example.com")?.href).toBe("http://example.com/");
    expect(parseHttpUrl("chrome://newtab")).toBeNull();
    expect(parseHttpUrl("javascript:void(0)")).toBeNull();
    expect(parseHttpUrl("")).toBeNull();
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
