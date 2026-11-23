import { visibleText } from "../domText";
import { mapEmploymentType, mapWorkArrangement } from "../mapFields";
import type { AdapterFields, SiteAdapter } from "../types";

function hostMatches(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return host === "ycombinator.com" || host.endsWith(".ycombinator.com");
}

function isListing(url: URL): boolean {
  return /^\/companies\/[^/]+\/jobs\/[^/]+$/.test(url.pathname.replace(/\/+$/, ""));
}

function fact(doc: Document, label: string): string {
  for (const strong of doc.querySelectorAll("strong")) {
    if (visibleText(strong).replace(/\s+/g, " ").trim().toLowerCase() !== label) continue;
    const span = strong.parentElement?.parentElement?.querySelector("span");
    const value = span ? visibleText(span).replace(/\s+/g, " ").trim() : "";
    if (value && value.toLowerCase() !== label) return value;
  }
  return "";
}

export const yCombinatorAdapter: SiteAdapter = {
  id: "ycombinator",
  name: "YC Jobs",
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
    const companyLink = [...doc.querySelectorAll("a")].find((link) => {
      const href = link.getAttribute("href") ?? "";
      if (companySlug && href !== `/companies/${companySlug}`) return false;
      if (!/^\/companies\/[^/]+$/.test(href)) return false;
      const name = visibleText(link).replace(/\s+/g, " ").trim();
      return name.length > 1 && name.length < 80;
    });
    const company = companyLink ? visibleText(companyLink).replace(/\s+/g, " ").trim() : "";
    if (company) fields.company = company;

    const bits = heading?.nextElementSibling
      ? [...heading.nextElementSibling.querySelectorAll(":scope > span")]
          .map((node) => visibleText(node).replace(/\s+/g, " ").trim())
          .filter((bit) => bit && bit !== "•" && bit !== "·")
      : [];
    const pay = bits.find((bit) => /^[$₹€£]/.test(bit) && !/%/.test(bit) && !/^\$1$/.test(bit));
    if (pay) fields.compensationRaw = pay;
    const place = bits
      .filter((bit) => bit !== pay && !/%/.test(bit) && !/^\$1$/.test(bit))
      .join(", ");
    if (place) fields.locationRaw = place;
    const arrangement = mapWorkArrangement(place);
    if (arrangement) fields.workArrangement = arrangement;

    const employment = mapEmploymentType(fact(doc, "job type"));
    if (employment) fields.employmentType = employment;
    const experience = fact(doc, "experience");
    if (experience) fields.experienceRaw = experience;
    const skills = fact(doc, "skills")
      .split(",")
      .map((skill) => skill.trim())
      .filter((skill) => skill.length > 1 && skill.length < 60);
    if (skills.length > 0) fields.skills = skills;

    const about = [...doc.querySelectorAll("h2")].find(
      (node) => visibleText(node).replace(/\s+/g, " ").trim().toLowerCase() === "about the role",
    );
    const prose = about?.parentElement?.querySelector(".prose") ?? about?.nextElementSibling;
    let description = prose ? visibleText(prose) : "";
    const visa = fact(doc, "visa");
    if (visa) description = [description, `Visa: ${visa}`].filter(Boolean).join("\n");
    if (description) fields.description = description;
    return fields;
  },
};
