import { visibleText } from "../domText";
import { mapWorkArrangement } from "../mapFields";
import type { AdapterFields, SiteAdapter } from "../types";

function hostMatches(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return host === "cutshort.io" || host.endsWith(".cutshort.io");
}

function isListing(url: URL): boolean {
  return /^\/job\/[^/]+$/.test(url.pathname.replace(/\/+$/, ""));
}

export const cutshortAdapter: SiteAdapter = {
  id: "cutshort",
  name: "Cutshort",
  version: 1,
  enabled: true,
  verified: false,
  matches: hostMatches,
  isJobPage(doc, url) {
    if (!isListing(url)) return false;
    return Boolean(doc.querySelector("h1"));
  },
  extract({ doc }) {
    const fields: AdapterFields = {};
    const heading = doc.querySelector("h1");
    const title = heading ? visibleText(heading).replace(/\s+/g, " ").trim() : "";
    if (title) fields.title = title;

    const companyLink = doc.querySelector('h2 a[href^="/company/"], a[href^="/company/"]');
    const company = companyLink ? visibleText(companyLink).replace(/\s+/g, " ").trim() : "";
    if (company && company.length < 80) fields.company = company;

    const summary = visibleText(
      doc.querySelector('section[aria-label="Job summary"]') ?? doc.createElement("div"),
    );
    const parts = summary
      .split("·")
      .map((part) => part.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .slice(1);
    for (const part of parts) {
      if (/^posted\b/i.test(part) || /^raised funding$/i.test(part)) continue;
      const arrangement = mapWorkArrangement(part);
      if (arrangement && !fields.workArrangement) {
        fields.workArrangement = arrangement;
        if (/work from home/i.test(part)) fields.workFromHome = true;
        if (!fields.locationRaw) fields.locationRaw = part;
        continue;
      }
      if (/\d.*\byears?\b/i.test(part) && !fields.experienceRaw) {
        fields.experienceRaw = part;
        continue;
      }
      if (/[₹$]|\/\s*yr|\blacs?\b/i.test(part) && !/^not disclosed$/i.test(part)) {
        fields.compensationRaw = part;
      } else if (!arrangement && part.length < 80 && !fields.locationRaw) {
        fields.locationRaw = part;
      }
    }
    return fields;
  },
};
