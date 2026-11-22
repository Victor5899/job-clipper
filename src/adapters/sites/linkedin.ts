import { visibleText } from "../domText";
import { mapEmploymentType, mapWorkArrangement } from "../mapFields";
import type { AdapterFields, SiteAdapter } from "../types";

function hostMatches(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return host === "linkedin.com" || host.endsWith(".linkedin.com");
}

function jobId(url: URL): string | undefined {
  return (
    url.pathname.match(/\/jobs\/view\/(?:.*-)?(\d+)/)?.[1] ??
    url.searchParams.get("currentJobId") ??
    undefined
  );
}

export const linkedInAdapter: SiteAdapter = {
  id: "linkedin",
  name: "LinkedIn",
  version: 1,
  enabled: true,
  verified: false,
  matches: hostMatches,
  isJobPage(doc, url) {
    if (!jobId(url)) return false;
    const onView = /\/jobs\/view\/(?:.*-)?\d+/.test(url.pathname);
    if (onView) return Boolean(doc.querySelector("h1"));
    return Boolean(
      doc.querySelector(
        "h1.topcard__title, .jobs-details h1, .job-details-jobs-unified-top-card__job-title",
      ),
    );
  },
  extract({ doc }) {
    const fields: AdapterFields = {};
    const titleEl = doc.querySelector(
      "h1.topcard__title, h1.job-details-jobs-unified-top-card__job-title, .jobs-details h1, h1",
    );
    const title = titleEl ? visibleText(titleEl).replace(/\s+/g, " ") : "";
    if (title) fields.title = title;

    const companyEl = doc.querySelector(
      "a.topcard__org-name-link, a[data-tracking-control-name='public_jobs_topcard-org-name'], .jobs-unified-top-card__company-name a, .job-details-jobs-unified-top-card__company-name a",
    );
    const company = companyEl ? visibleText(companyEl).replace(/\s+/g, " ") : "";
    if (company) fields.company = company;

    const locationEl = doc.querySelector(
      ".topcard__flavor--bullet, .job-details-jobs-unified-top-card__bullet",
    );
    const location = locationEl ? visibleText(locationEl).replace(/\s+/g, " ") : "";
    if (location) fields.locationRaw = location;
    const arrangement = mapWorkArrangement(location);
    if (arrangement) fields.workArrangement = arrangement;

    let seniority = "";
    let employment = "";
    for (const item of doc.querySelectorAll(".description__job-criteria-item")) {
      const label = visibleText(item.querySelector("h3") ?? item).toLowerCase();
      const value = visibleText(item.querySelector("span") ?? item);
      if (label.includes("seniority")) seniority = value;
      if (label.includes("employment")) employment = value;
    }
    const employmentType = mapEmploymentType(`${seniority} ${employment}`);
    if (employmentType) fields.employmentType = employmentType;

    const descriptionEl = doc.querySelector(
      ".show-more-less-html__markup, .jobs-description__content, .jobs-box__html-content",
    );
    const description = descriptionEl ? visibleText(descriptionEl) : "";
    if (description) fields.description = description;

    return fields;
  },
};
