import { parseExplicitDate } from "../../core/normalize/dates";
import { ownText, visibleText } from "../domText";
import { findLabelledValue } from "../labelValue";
import { mapEmploymentType, mapWorkArrangement } from "../mapFields";
import type { AdapterFields, SiteAdapter } from "../types";

function hostMatches(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return host === "himalayas.app" || host.endsWith(".himalayas.app");
}

function isListing(url: URL): boolean {
  return /^\/companies\/[^/]+\/jobs\/[^/]+$/.test(url.pathname.replace(/\/+$/, ""));
}

function shortText(doc: ParentNode, pattern: RegExp): string {
  for (const node of doc.querySelectorAll("div, span, a, p")) {
    const text = visibleText(node).replace(/\s+/g, " ").trim();
    if (text.length > 24 || !pattern.test(text)) continue;
    return text;
  }
  return "";
}

export const himalayasAdapter: SiteAdapter = {
  id: "himalayas",
  name: "Himalayas",
  version: 1,
  enabled: true,
  verified: false,
  matches: hostMatches,
  isJobPage(doc, url) {
    return isListing(url) && Boolean(doc.querySelector("h1"));
  },
  extract({ doc, url }) {
    const fields: AdapterFields = {};
    const heading = doc.querySelector("h1");
    const title = heading ? visibleText(heading).replace(/\s+/g, " ").trim() : "";
    if (title) fields.title = title;

    const companySlug = url.pathname.match(/^\/companies\/([^/]+)\/jobs\//)?.[1];
    const companyNames = [...doc.querySelectorAll("a")]
      .filter((link) => {
        const href = link.getAttribute("href") ?? "";
        return companySlug
          ? href === `/companies/${companySlug}`
          : /^\/companies\/[^/]+$/.test(href);
      })
      .map((link) => visibleText(link).replace(/\s+/g, " ").trim())
      .filter((name) => name.length > 2 && name.length < 80);
    const company = companyNames.sort((left, right) => right.length - left.length)[0];
    if (company) fields.company = company;

    const badge = shortText(doc, /^(india only|us only|usa only|united states only|worldwide)$/i);
    if (/^india only$/i.test(badge)) fields.eligibleCountries = ["India"];
    else if (/worldwide/i.test(badge)) fields.eligibleCountries = ["Worldwide"];
    else if (/us only|usa only|united states only/i.test(badge)) {
      fields.eligibleCountries = ["United States"];
    }

    const arrangement = mapWorkArrangement(`${title} ${doc.title}`);
    if (arrangement) fields.workArrangement = arrangement;
    if (/work from home/i.test(`${title} ${doc.title}`)) fields.workFromHome = true;

    const deadline = findLabelledValue(doc.body, /^apply before$/i);
    if (deadline) {
      const date = parseExplicitDate(deadline.value);
      if (date) fields.deadline = { date, evidence: `${deadline.label} ${deadline.value}` };
    }

    const jobType = findLabelledValue(doc.body, /^job type$/i);
    const employment = mapEmploymentType(jobType?.value);
    if (employment) fields.employmentType = employment;
    const experience = findLabelledValue(doc.body, /^experience$/i);
    if (experience && experience.value.length <= 40) fields.experienceRaw = experience.value;

    const skillsHeading = [...doc.querySelectorAll("h3")].find(
      (node) => ownText(node).toLowerCase() === "skills",
    );
    const skills = skillsHeading?.parentElement
      ? [...skillsHeading.parentElement.querySelectorAll("a")]
          .map((link) => visibleText(link).replace(/\s+/g, " ").trim())
          .filter((skill) => skill.length > 1 && skill.length < 40)
      : [];
    if (skills.length > 0) fields.skills = [...new Set(skills)];

    const descriptionEl = doc.querySelector("article.prose-content");
    const description = descriptionEl ? visibleText(descriptionEl) : "";
    if (description) fields.description = description;
    return fields;
  },
};
