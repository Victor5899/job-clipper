import { describe, expect, it } from "vitest";
import { classify, type ClassifyInput } from "./classify";
import type { IndiaEligibility } from "../model/enums";

interface Case {
  name: string;
  input: ClassifyInput;
  value: IndiaEligibility;
  confidence: "high" | "medium" | "low";
  visa?: "yes" | "no" | "unknown";
  reason?: RegExp;
  batch?: string;
}

const cases: Case[] = [
  {
    name: "keeps a manual correction",
    input: {
      workArrangement: "remote",
      text: "US citizens only",
      override: { value: "remote_india" },
    },
    value: "remote_india",
    confidence: "high",
    reason: /you corrected this/i,
  },
  {
    name: "keeps a correction even when the page is on-site in the US",
    input: {
      workArrangement: "onsite",
      locationRaw: "New York, United States",
      override: { value: "india_onsite" },
    },
    value: "india_onsite",
    confidence: "high",
    reason: /you corrected this/i,
  },
  {
    name: "on-site Bangalore without a country",
    input: { workArrangement: "onsite", locationRaw: "Bangalore, Karnataka" },
    value: "india_onsite",
    confidence: "high",
  },
  {
    name: "on-site Gurgaon",
    input: { workArrangement: "onsite", locationRaw: "Gurgaon" },
    value: "india_onsite",
    confidence: "high",
  },
  {
    name: "on-site Mumbai",
    input: { workArrangement: "onsite", locationRaw: "Mumbai, India" },
    value: "india_onsite",
    confidence: "high",
  },
  {
    name: "on-site Hyderabad",
    input: { workArrangement: "onsite", locationRaw: "Hyderabad" },
    value: "india_onsite",
    confidence: "high",
  },
  {
    name: "on-site Chennai",
    input: { workArrangement: "onsite", locationRaw: "Chennai" },
    value: "india_onsite",
    confidence: "high",
  },
  {
    name: "on-site Pune",
    input: { workArrangement: "onsite", locationRaw: "Pune" },
    value: "india_onsite",
    confidence: "high",
  },
  {
    name: "on-site Jaipur",
    input: { workArrangement: "onsite", locationRaw: "Jaipur" },
    value: "india_onsite",
    confidence: "high",
  },
  {
    name: "hybrid Delhi NCR",
    input: { workArrangement: "hybrid", locationRaw: "Delhi / NCR" },
    value: "india_hybrid",
    confidence: "high",
  },
  {
    name: "hybrid Bengaluru",
    input: { workArrangement: "hybrid", locationRaw: "Bengaluru, Karnataka, India" },
    value: "india_hybrid",
    confidence: "high",
  },
  {
    name: "hybrid Gurugram",
    input: { workArrangement: "hybrid", locationRaw: "Gurugram" },
    value: "india_hybrid",
    confidence: "high",
  },
  {
    name: "on-site London",
    input: { workArrangement: "onsite", locationRaw: "London, United Kingdom" },
    value: "international_relocation",
    confidence: "high",
  },
  {
    name: "hybrid New York",
    input: { workArrangement: "hybrid", locationRaw: "New York, United States" },
    value: "international_relocation",
    confidence: "high",
  },
  {
    name: "on-site Singapore",
    input: { workArrangement: "onsite", locationRaw: "Singapore" },
    value: "international_relocation",
    confidence: "high",
  },
  {
    name: "on-site Dubai",
    input: { workArrangement: "onsite", locationRaw: "Dubai" },
    value: "international_relocation",
    confidence: "high",
  },
  {
    name: "on-site United States",
    input: { workArrangement: "onsite", locationRaw: "United States" },
    value: "international_relocation",
    confidence: "high",
  },
  {
    name: "hybrid Berlin",
    input: { workArrangement: "hybrid", locationRaw: "Berlin, Germany" },
    value: "international_relocation",
    confidence: "high",
  },
  {
    name: "bare Remote",
    input: { workArrangement: "remote", locationRaw: "Remote" },
    value: "unknown",
    confidence: "low",
    reason: /no evidence/i,
  },
  {
    name: "Remote with no eligibility sentence",
    input: { workArrangement: "remote", text: "This is a remote role." },
    value: "unknown",
    confidence: "low",
  },
  {
    name: "Remote APAC",
    input: { workArrangement: "remote", locationRaw: "Remote", text: "Remote, APAC" },
    value: "unknown",
    confidence: "low",
  },
  {
    name: "LinkedIn Remote label",
    input: { workArrangement: "remote", locationRaw: "Remote", source: "linkedin" },
    value: "unknown",
    confidence: "low",
  },
  {
    name: "Naukri Remote plus an Indian office",
    input: { workArrangement: "remote", locationRaw: "Hyderabad", source: "naukri" },
    value: "unknown",
    confidence: "low",
  },
  {
    name: "anywhere in the world",
    input: { workArrangement: "remote", text: "Open to anyone, anywhere in the world." },
    value: "remote_worldwide",
    confidence: "high",
  },
  {
    name: "work from anywhere",
    input: { workArrangement: "remote", text: "Work from anywhere." },
    value: "remote_worldwide",
    confidence: "high",
  },
  {
    name: "worldwide",
    input: { workArrangement: "remote", text: "This role is worldwide." },
    value: "remote_worldwide",
    confidence: "high",
  },
  {
    name: "global remote",
    input: { workArrangement: "remote", text: "Global remote position." },
    value: "remote_worldwide",
    confidence: "high",
  },
  {
    name: "worldwide and US only",
    input: { workArrangement: "remote", text: "Worldwide, but US only." },
    value: "unknown",
    confidence: "low",
    reason: /worldwide and also names a restriction/i,
  },
  {
    name: "must reside in Canada",
    input: { workArrangement: "remote", text: "Applicants must reside in Canada." },
    value: "remote_restricted",
    confidence: "high",
  },
  {
    name: "EU only",
    input: { workArrangement: "remote", text: "EU only." },
    value: "remote_restricted",
    confidence: "high",
  },
  {
    name: "Europe only",
    input: { workArrangement: "remote", text: "Europe only." },
    value: "remote_restricted",
    confidence: "high",
  },
  {
    name: "Americas only",
    input: { workArrangement: "remote", text: "Americas only." },
    value: "remote_restricted",
    confidence: "high",
  },
  {
    name: "authorized to work in the United States",
    input: { workArrangement: "remote", text: "Must be authorized to work in the United States." },
    value: "remote_restricted",
    confidence: "high",
  },
  {
    name: "US citizens only",
    input: { workArrangement: "remote", text: "US citizens only." },
    value: "remote_restricted",
    confidence: "high",
    visa: "no",
  },
  {
    name: "not available in India",
    input: { workArrangement: "remote", text: "Not available in India." },
    value: "remote_restricted",
    confidence: "high",
  },
  {
    name: "Remote (India)",
    input: { workArrangement: "remote", text: "Remote (India)" },
    value: "remote_india",
    confidence: "high",
  },
  {
    name: "Remote, India",
    input: { workArrangement: "remote", text: "Remote, India" },
    value: "remote_india",
    confidence: "high",
  },
  {
    name: "anywhere in India",
    input: { workArrangement: "remote", text: "You can work from anywhere in India." },
    value: "remote_india",
    confidence: "high",
  },
  {
    name: "open to candidates in India",
    input: { workArrangement: "remote", text: "Open to candidates in India." },
    value: "remote_india",
    confidence: "high",
  },
  {
    name: "based in India",
    input: { workArrangement: "remote", text: "Based in India." },
    value: "remote_india",
    confidence: "high",
  },
  {
    name: "eligible countries include India",
    input: { workArrangement: "remote", eligibleCountries: ["US", "IN"] },
    value: "remote_india",
    confidence: "high",
  },
  {
    name: "applicant location India",
    input: { workArrangement: "remote", applicantLocations: ["India"] },
    value: "remote_india",
    confidence: "high",
  },
  {
    name: "a country list without India",
    input: { workArrangement: "remote", applicantLocations: ["Denmark", "Germany"] },
    value: "remote_restricted",
    confidence: "high",
  },
  {
    name: "United States as the only applicant country",
    input: { workArrangement: "remote", applicantLocations: ["US"] },
    value: "remote_restricted",
    confidence: "high",
  },
  {
    name: "an empty NA applicant location is not a country",
    input: { workArrangement: "remote", applicantLocations: ["NA"], locationRaw: "Remote only" },
    value: "unknown",
    confidence: "low",
  },
  {
    name: "US citizen/visa only",
    input: { workArrangement: "remote", text: "Visa: US citizen/visa only" },
    value: "remote_restricted",
    confidence: "high",
    visa: "no",
  },
  {
    name: "India plus a US-only line",
    input: { workArrangement: "remote", text: "Remote, India. US only." },
    value: "unknown",
    confidence: "low",
    reason: /both includes India and states a location restriction/i,
  },
  {
    name: "Internshala work from home alone",
    input: {
      workArrangement: "remote",
      locationRaw: "Work from home",
      source: "internshala",
      workFromHome: true,
    },
    value: "unknown",
    confidence: "low",
    reason: /work from home does not say/i,
  },
  {
    name: "Naukri work from home alone",
    input: { workArrangement: "remote", locationRaw: "Work from home", source: "naukri" },
    value: "unknown",
    confidence: "low",
    reason: /work from home does not say/i,
  },
  {
    name: "work from home with no arrangement word",
    input: { workArrangement: "unknown", locationRaw: "Work from home", source: "internshala" },
    value: "unknown",
    confidence: "low",
    reason: /work from home does not say/i,
  },
  {
    name: "work from home plus an explicit India phrase",
    input: {
      workArrangement: "remote",
      locationRaw: "Work from home",
      source: "internshala",
      workFromHome: true,
      text: "Open to candidates from anywhere in India.",
    },
    value: "remote_india",
    confidence: "high",
  },
  {
    name: "on-site in India wins over a remote sentence",
    input: {
      workArrangement: "onsite",
      locationRaw: "Mumbai",
      text: "This team is remote worldwide.",
    },
    value: "india_onsite",
    confidence: "high",
  },
  {
    name: "Indian city without an arrangement",
    input: { workArrangement: "unknown", locationRaw: "Mumbai" },
    value: "unknown",
    confidence: "low",
    reason: /does not say on-site, hybrid, or remote/i,
  },
  {
    name: "nothing to go on",
    input: { workArrangement: "unknown" },
    value: "unknown",
    confidence: "low",
  },
  {
    name: "hybrid abroad with sponsorship",
    input: {
      workArrangement: "hybrid",
      locationRaw: "London, United Kingdom",
      text: "Visa sponsorship is available.",
    },
    value: "international_relocation",
    confidence: "high",
    visa: "yes",
  },
  {
    name: "worldwide without sponsorship",
    input: { workArrangement: "remote", text: "Worldwide. No visa sponsorship." },
    value: "remote_worldwide",
    confidence: "high",
    visa: "no",
  },
  {
    name: "time-zone overlap is not a region restriction",
    input: { workArrangement: "remote", text: "Anywhere in the world. Overlap with US hours." },
    value: "remote_worldwide",
    confidence: "high",
    reason: /time-zone overlap/i,
  },
  {
    name: "matches the profile graduation year",
    input: {
      workArrangement: "onsite",
      locationRaw: "Bangalore",
      text: "2026/2027 batch",
      profileGraduationYear: 2027,
    },
    value: "india_onsite",
    confidence: "high",
    batch: "Matches 2027 batch",
  },
  {
    name: "excludes the profile graduation year",
    input: {
      workArrangement: "onsite",
      locationRaw: "Chennai",
      text: "2026 batch",
      profileGraduationYear: 2027,
    },
    value: "india_onsite",
    confidence: "high",
    batch: "Excludes 2027",
  },
  {
    name: "country code IN with hybrid",
    input: { workArrangement: "hybrid", countryCode: "IN", locationRaw: "Multiple cities" },
    value: "india_hybrid",
    confidence: "high",
  },
  {
    name: "country code US with on-site",
    input: { workArrangement: "onsite", countryCode: "US" },
    value: "international_relocation",
    confidence: "high",
  },
];

describe("classify", () => {
  it("covers the eligibility rules", () => {
    expect(cases.length).toBeGreaterThanOrEqual(40);
  });

  it.each(cases)("$name", (item) => {
    const result = classify(item.input);
    expect(result.value).toBe(item.value);
    expect(result.confidence).toBe(item.confidence);
    if (item.visa) expect(result.visaSponsorship).toBe(item.visa);
    if (item.reason) expect(result.reasons.join(" ")).toMatch(item.reason);
    if (item.batch) expect(result.batchNote).toBe(item.batch);
  });
});
