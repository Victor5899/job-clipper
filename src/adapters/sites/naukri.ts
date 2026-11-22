import { parseExplicitDate } from "../../core/normalize/dates";
import { visibleText } from "../domText";
import { findLabelledValue } from "../labelValue";
import { mapWorkArrangement } from "../mapFields";
import type { AdapterFields, SiteAdapter } from "../types";

function hostMatches(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return host === "naukri.com" || host.endsWith(".naukri.com");
}

function isListing(url: URL): boolean {
  return /\/job-listings-[^/]+/i.test(url.pathname);
}

const MODE = /^(hybrid|remote|work from office|work from home)$/i;

function headerRoot(doc: Document): Element | null {
  const heading = doc.querySelector("h1");
  if (!heading) return null;
  let node: Element | null = heading;
  for (let depth = 0; depth < 10 && node; depth += 1) {
    if (
      node.querySelector(
        "[class*='jhc__exp__'], [class*='jhc__location__'], [class*='jhc__salary__']",
      )
    ) {
      return node;
    }
    if (node.parentElement === doc.body || !node.parentElement) break;
    node = node.parentElement;
  }
  return heading.parentElement ?? heading;
}

function leafText(root: Element, pattern: RegExp): string | undefined {
  for (const node of root.querySelectorAll("span, a, p, div")) {
    if (node.children.length > 0) continue;
    const text = visibleText(node).replace(/\s+/g, " ");
    if (pattern.test(text)) return text;
  }
  return undefined;
}

export const naukriAdapter: SiteAdapter = {
  id: "naukri",
  name: "Naukri",
  version: 1,
  enabled: true,
  verified: false,
  matches: hostMatches,
  isJobPage(doc, url) {
    if (!isListing(url)) return false;
    const jsonLd = [...doc.querySelectorAll('script[type="application/ld+json"]')].some((node) =>
      (node.textContent ?? "").includes("JobPosting"),
    );
    return Boolean(doc.querySelector("h1") || jsonLd);
  },
  extract({ doc }) {
    const fields: AdapterFields = {};
    const heading = doc.querySelector("h1");
    const title = heading ? visibleText(heading).replace(/\s+/g, " ") : "";
    if (title) fields.title = title;

    const companyEl = doc.querySelector("[class*='jd-header-comp-name'] a, [class*='comp-name'] a");
    const company = companyEl ? visibleText(companyEl).replace(/\s+/g, " ") : "";
    if (company) fields.company = company;

    const header = headerRoot(doc) ?? doc.body;
    const experience =
      leafText(header, /^\d+\s*-\s*\d+\s*years?$/i) ??
      visibleText(header).match(/\d+\s*-\s*\d+\s*years?/i)?.[0];
    if (experience) fields.experienceRaw = experience;

    const salaryEl = header.querySelector("[class*='jhc__salary__']");
    const salary = salaryEl ? visibleText(salaryEl).replace(/\s+/g, " ") : "";
    if (salary && !/^not disclosed$/i.test(salary)) fields.compensationRaw = salary;

    const locationEl = header.querySelector("[class*='jhc__location__']");
    const location = locationEl ? visibleText(locationEl).replace(/\s+/g, " ") : "";
    if (location) fields.locationRaw = location;

    const mode = leafText(header, MODE);
    const arrangement = mapWorkArrangement(mode);
    if (arrangement) fields.workArrangement = arrangement;
    if (mode && /work from home/i.test(mode)) fields.workFromHome = true;

    const deadline = findLabelledValue(
      header,
      /^(apply by|application deadline|last date to apply|deadline)$/i,
    );
    if (deadline) {
      const date = parseExplicitDate(deadline.value);
      if (date) fields.deadline = { date, evidence: `${deadline.label} ${deadline.value}` };
    }

    const descriptionEl = doc.querySelector("[class*='dang-inner-html']");
    const description = descriptionEl ? visibleText(descriptionEl) : "";
    if (description) fields.description = description;

    const skillsHeading = [...doc.querySelectorAll("h2, h3, div, span")].find(
      (node) => visibleText(node).replace(/\s+/g, " ") === "Key Skills",
    );
    const skillsRoot = skillsHeading?.parentElement;
    if (skillsRoot && visibleText(skillsRoot).length < 800) {
      const skills = [...skillsRoot.querySelectorAll("[class*='chip']")]
        .map((node) => visibleText(node).replace(/\s+/g, " "))
        .filter((skill) => skill && !/key skills/i.test(skill));
      if (skills.length > 0) fields.skills = [...new Set(skills)];
    }

    return fields;
  },
};
