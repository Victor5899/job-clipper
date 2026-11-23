import { parseExplicitDate } from "../../core/normalize/dates";
import { visibleText } from "../domText";
import { findLabelledValue } from "../labelValue";
import { mapWorkArrangement } from "../mapFields";
import type { AdapterFields, SiteAdapter } from "../types";

function hostMatches(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return host === "unstop.com" || host.endsWith(".unstop.com");
}

function kind(url: URL): "internship" | "job" | undefined {
  const match = url.pathname.replace(/\/+$/, "").match(/^\/(internships|jobs)\/[^/]+-\d{5,}$/);
  if (match?.[1] === "internships") return "internship";
  if (match?.[1] === "jobs") return "job";
  return undefined;
}

export const unstopAdapter: SiteAdapter = {
  id: "unstop",
  name: "Unstop",
  version: 1,
  enabled: true,
  verified: false,
  matches: hostMatches,
  isJobPage(doc, url) {
    return Boolean(kind(url) && doc.querySelector("h1"));
  },
  extract({ doc, url }) {
    const fields: AdapterFields = {};
    const listing = kind(url);
    const heading = doc.querySelector("h1");
    const title = heading ? visibleText(heading).replace(/\s+/g, " ").trim() : "";
    if (title) fields.title = title;

    const titleBlock = doc.querySelector(".title") ?? heading?.parentElement;
    const companyLink = titleBlock?.querySelector("a");
    const company = companyLink ? visibleText(companyLink).replace(/\s+/g, " ").trim() : "";
    if (company && company.length < 80 && !/^home$/i.test(company)) fields.company = company;

    const mode = visibleText(doc.querySelector(".head-line") ?? doc.createElement("div"));
    const arrangement = mapWorkArrangement(mode);
    if (arrangement) fields.workArrangement = arrangement;
    if (/work from home/i.test(mode)) fields.workFromHome = true;

    const location = findLabelledValue(doc.body, /^location$/i);
    if (location && location.value.length <= 80) fields.locationRaw = location.value;
    const eligibility = findLabelledValue(doc.body, /^eligibility$/i);
    if (eligibility && eligibility.value.length <= 40) fields.experienceRaw = eligibility.value;
    if (listing === "internship") fields.employmentType = "internship";

    const deadline = findLabelledValue(
      doc.body,
      /^(apply by|apply before|application deadline|registration deadline|last date to apply|deadline)$/i,
    );
    if (deadline) {
      const date = parseExplicitDate(deadline.value);
      if (date) fields.deadline = { date, evidence: `${deadline.label} ${deadline.value}` };
    }
    return fields;
  },
};
