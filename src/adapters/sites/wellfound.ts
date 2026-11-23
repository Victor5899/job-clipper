import { parseLocation } from "../../core/normalize/location";
import { parseExplicitDate } from "../../core/normalize/dates";
import { ownText, visibleText } from "../domText";
import { findLabelledValue } from "../labelValue";
import { mapEmploymentType, mapWorkArrangement } from "../mapFields";
import type { AdapterFields, SiteAdapter } from "../types";

function hostMatches(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return host === "wellfound.com" || host.endsWith(".wellfound.com");
}

function isListing(url: URL): boolean {
  return /\/jobs\/\d+(?:-[^/]+)?$/.test(url.pathname.replace(/\/+$/, ""));
}

function blockValue(root: ParentNode, label: RegExp): string {
  for (const node of root.querySelectorAll("span, h3, dt, strong, p")) {
    const text = ownText(node);
    if (!text || text.length > 40 || !label.test(text)) continue;
    const parent = node.parentElement;
    if (!parent) continue;
    const full = visibleText(parent).replace(/\s+/g, " ").trim();
    const value = full
      .replace(new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "")
      .trim();
    if (value && value.length <= 180) return value;
  }
  return "";
}

export const wellfoundAdapter: SiteAdapter = {
  id: "wellfound",
  name: "Wellfound",
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
    const title = heading ? visibleText(heading).replace(/\s+/g, " ") : "";
    if (title) fields.title = title;

    const companyLink = [...doc.querySelectorAll('a[href^="/company/"]')].find((link) => {
      const href = link.getAttribute("href") ?? "";
      if (!/^\/company\/[^/]+$/.test(href)) return false;
      const name = visibleText(link).replace(/\s+/g, " ").trim();
      return (
        name.length > 1 && name.length < 80 && !/^(learn more|view|more jobs|founders)/i.test(name)
      );
    });
    const company = companyLink ? visibleText(companyLink).replace(/\s+/g, " ").trim() : "";
    if (company) fields.company = company;

    const metaRoot = heading?.nextElementSibling ?? heading?.parentElement ?? doc.body;
    const meta = visibleText(metaRoot).replace(/\s+/g, " ");
    const experience = meta.match(
      /\d+\s*(?:–|-|to)\s*\d+\s+years?(?:\s+of\s+exp(?:erience)?)?|\d+\s+years?\s+of\s+exp(?:erience)?/i,
    )?.[0];
    if (experience) fields.experienceRaw = experience;
    const employment = mapEmploymentType(meta);
    if (employment) fields.employmentType = employment;

    const policy = blockValue(doc, /^remote work policy$/i);
    const hires = blockValue(doc, /^hires remotely/i).replace(/\s+[-•]\s+/g, ", ");
    const arrangement = mapWorkArrangement(`${policy} ${meta}`);
    if (arrangement) fields.workArrangement = arrangement;
    if (/work from home/i.test(`${policy} ${meta} ${doc.title}`)) fields.workFromHome = true;
    if (hires) fields.locationRaw = hires;
    else if (policy) fields.locationRaw = policy;

    const places = parseLocation(hires || policy);
    if (places.inIndia && !places.outsideIndia) fields.eligibleCountries = ["India"];
    else if (places.country && places.outsideIndia) fields.eligibleCountries = [places.country];

    const deadline = findLabelledValue(
      doc.body,
      /^(apply by|apply before|application deadline|registration deadline|last date to apply|deadline)$/i,
    );
    if (deadline) {
      const date = parseExplicitDate(deadline.value);
      if (date) fields.deadline = { date, evidence: `${deadline.label} ${deadline.value}` };
    }

    const skillsRoot = [...doc.querySelectorAll("span, h3, strong")].find(
      (node) => ownText(node).toLowerCase() === "skills",
    )?.parentElement;
    if (skillsRoot) {
      const skills = [...skillsRoot.querySelectorAll("div")]
        .filter((node) => node.querySelector("div") === null)
        .map((node) => visibleText(node).replace(/\s+/g, " ").trim())
        .filter((skill) => skill && skill.length < 40 && !/^skills$/i.test(skill));
      if (skills.length > 0) fields.skills = [...new Set(skills)];
    }

    const descriptionEl = doc.querySelector("#job-description");
    let description = descriptionEl ? visibleText(descriptionEl) : "";
    const visa = blockValue(doc, /^visa sponsorship$/i);
    if (visa) description = [description, `Visa Sponsorship ${visa}`].filter(Boolean).join("\n");
    if (description) fields.description = description;
    return fields;
  },
};
