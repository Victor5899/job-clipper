import { describe, expect, it } from "vitest";
import { categorize } from "./category";
import { parseExplicitDate } from "./dates";
import { parseExperience } from "./experience";
import { parseLocation } from "./location";
import { parseCompensation } from "./salary";

describe("parseExplicitDate", () => {
  it("reads an isolated labelled date and nothing else", () => {
    expect(parseExplicitDate("18 Dec' 26")).toBe("2026-12-18");
    expect(parseExplicitDate("20 Dec' 26")).toBe("2026-12-20");
    expect(parseExplicitDate("9 Jan 2027")).toBe("2027-01-09");
    expect(parseExplicitDate("2026-12-18")).toBe("2026-12-18");
    expect(parseExplicitDate("1st December 2026")).toBe("2026-12-01");
    expect(parseExplicitDate("Dec 10, 2026")).toBe("2026-12-10");
    expect(parseExplicitDate("Dec 2th, 2026")).toBe("2026-12-02");
    expect(parseExplicitDate("Immediately")).toBeNull();
    expect(parseExplicitDate("Apply by 18 Dec 2026")).toBeNull();
    expect(parseExplicitDate("The deadline is 18 Dec 2026")).toBeNull();
    expect(parseExplicitDate("31 Feb 2026")).toBeNull();
    expect(parseExplicitDate("")).toBeNull();
  });
});

describe("parseCompensation", () => {
  it("reads stipends, lacs and Indian grouping, and leaves undisclosed pay empty of amounts", () => {
    expect(parseCompensation("₹ 20,000 - 27,000 /month")).toMatchObject({
      min: 20_000,
      max: 27_000,
      currency: "INR",
      period: "month",
      kind: "stipend",
    });
    expect(parseCompensation("₹ 5,00,000 - 6,00,000 /year")).toMatchObject({
      min: 500_000,
      max: 600_000,
      period: "year",
      kind: "salary",
    });
    expect(parseCompensation("3.5-8 Lacs P.A.")).toMatchObject({
      min: 350_000,
      max: 800_000,
      currency: "INR",
      period: "year",
      kind: "salary",
    });
    const undisclosed = parseCompensation("Not Disclosed");
    expect(undisclosed.min).toBeUndefined();
    expect(undisclosed.max).toBeUndefined();
    expect(parseCompensation("Unpaid").kind).toBe("stipend");
  });
});

describe("parseExperience", () => {
  it("maps ranges and fresher labels onto experience levels", () => {
    expect(parseExperience("4 - 9 years")).toMatchObject({
      minYears: 4,
      maxYears: 9,
      level: "mid",
    });
    expect(parseExperience("0 - 2 years").level).toBe("entry");
    expect(parseExperience("No experience required").level).toBe("fresher");
    expect(parseExperience(undefined).level).toBe("unknown");
  });
});

describe("parseLocation", () => {
  it("recognises Indian cities, aliases, and places outside India", () => {
    const home = parseLocation("Work from home");
    expect(home.inIndia).toBe(false);
    expect(home.city).toBeUndefined();
    expect(parseLocation("Chennai")).toMatchObject({
      city: "Chennai",
      countryCode: "IN",
      inIndia: true,
    });
    expect(parseLocation("Gurgaon, Haryana, India").city).toBe("Gurugram");
    expect(parseLocation("London, United Kingdom")).toMatchObject({
      outsideIndia: true,
      countryCode: "GB",
    });
    const mixed = parseLocation("Bengaluru, United States");
    expect(mixed.inIndia).toBe(false);
    expect(mixed.outsideIndia).toBe(false);
  });
});

describe("categorize", () => {
  it("uses the title before the description", () => {
    expect(categorize("Healthcare Data Analyst-Intern")).toBe("data_analyst");
    expect(categorize("Campus hire", "Looking for a data analyst")).toBe("graduate_trainee");
    expect(categorize("Data Science")).toBe("other");
  });
});
