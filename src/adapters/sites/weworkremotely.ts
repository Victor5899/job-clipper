import { parseExplicitDate } from "../../core/normalize/dates";
import { ownText, visibleText } from "../domText";
import { mapEmploymentType } from "../mapFields";
import type { AdapterFields, SiteAdapter } from "../types";

function hostMatches(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return host === "weworkremotely.com" || host.endsWith(".weworkremotely.com");
}

function isListing(url: URL): boolean {
  return /^\/remote-jobs\/[^/]+$/.test(url.pathname.replace(/\/+$/, ""));
}

function aboutItems(doc: Document): { label: string; value: string; item: Element }[] {
  const root = doc.querySelector(".lis-container__job__sidebar__job-about") ?? doc.body;
  return [...root.querySelectorAll("li")].flatMap((item) => {
    const label = ownText(item);
    const value = visibleText(item)
      .replace(/\s+/g, " ")
      .replace(new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`, "i"), "")
      .trim();
    if (!label || !value || label.length > 40) return [];
    return [{ label, value, item }];
  });
}

function countryNames(value: string): string[] {
  return value
    .split(/[·|,]/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter((part) => part.length > 1 && part.length < 60);
}

export const weWorkRemotelyAdapter: SiteAdapter = {
  id: "weworkremotely",
  name: "We Work Remotely",
  version: 1,
  enabled: true,
  verified: false,
  matches: hostMatches,
  isJobPage(doc, url) {
    return isListing(url) && Boolean(doc.querySelector("h1"));
  },
  extract({ doc }) {
    const fields: AdapterFields = {};
    const heading = doc.querySelector("h1");
    const title = heading ? visibleText(heading).replace(/\s+/g, " ").trim() : "";
    if (title) fields.title = title;

    const companyEl =
      doc.querySelector(".lis-container__job__sidebar h3") ?? doc.querySelector("h3");
    const company = companyEl ? visibleText(companyEl).replace(/\s+/g, " ").trim() : "";
    if (company && company.length < 80) fields.company = company;
    fields.workArrangement = "remote";

    for (const item of aboutItems(doc)) {
      const label = item.label.toLowerCase();
      if (label === "apply before") {
        const date = parseExplicitDate(item.value);
        if (date) fields.deadline = { date, evidence: `${item.label} ${item.value}` };
      } else if (label === "job type") {
        const employment = mapEmploymentType(item.value);
        if (employment) fields.employmentType = employment;
      } else if (label === "salary" && !/^not disclosed$/i.test(item.value)) {
        fields.compensationRaw = item.value;
      } else if (label === "country" || label === "region") {
        fields.locationRaw = item.value;
        if (/anywhere in the world|^anywhere$|^worldwide$/i.test(item.value)) {
          fields.eligibleCountries = ["Worldwide"];
        } else {
          const links = [...item.item.querySelectorAll("a")]
            .map((link) => visibleText(link).replace(/\s+/g, " ").trim())
            .filter((name) => name.length > 1 && name.length < 60);
          const names = links.length > 0 ? links : countryNames(item.value);
          if (names.length > 0) fields.eligibleCountries = names.slice(0, 20);
          if (names.some((name) => /india/i.test(name))) {
            fields.eligibleCountries = [
              "India",
              ...names.filter((name) => !/india/i.test(name)),
            ].slice(0, 20);
          }
        }
      } else if (label === "skills") {
        const skills = [...item.item.querySelectorAll("a")]
          .map((link) => visibleText(link).replace(/\s+/g, " ").trim())
          .filter((skill) => skill.length > 1 && skill.length < 40);
        if (skills.length > 0) fields.skills = [...new Set(skills)];
      }
    }

    const job = doc.querySelector(".lis-container__job");
    if (job) {
      const copy = job.cloneNode(true) as Element;
      copy.querySelector(".lis-container__job__sidebar")?.remove();
      const description = visibleText(copy);
      if (description) fields.description = description;
    }
    return fields;
  },
};
