import { parseExplicitDate } from "../../core/normalize/dates";
import { visibleText } from "../domText";
import { findLabelledValue } from "../labelValue";
import { type AdapterFields, type SiteAdapter } from "../types";

function hostMatches(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return host === "internshala.com" || host.endsWith(".internshala.com");
}

function detailPath(url: URL): "internship" | "job" | undefined {
  const match = url.pathname.replace(/\/+$/, "").match(/^\/(internship|job)\/detail\/[^/]+$/);
  if (match?.[1] === "internship" || match?.[1] === "job") return match[1];
  return undefined;
}

function labelled(root: ParentNode, label: RegExp): { label: string; value: string } | undefined {
  return findLabelledValue(root, label);
}

export const internshalaAdapter: SiteAdapter = {
  id: "internshala",
  name: "Internshala",
  version: 1,
  enabled: true,
  verified: false,
  matches: hostMatches,
  isJobPage(doc, url) {
    if (!detailPath(url)) return false;
    return Boolean(doc.querySelector(".detail_view, .profile, h1"));
  },
  extract({ doc, url }) {
    const kind = detailPath(url);
    const header = doc.querySelector(".detail_view") ?? doc.body;
    const about = doc.querySelector(".internship_details") ?? doc.body;
    const fields: AdapterFields = {};

    const profile = header.querySelector(".profile");
    const title = profile ? visibleText(profile).replace(/\s+/g, " ") : "";
    if (title) fields.title = title;

    const companyEl = header.querySelector(".company_name a, .company_name");
    const company = companyEl ? visibleText(companyEl).replace(/\s+/g, " ") : "";
    if (company) fields.company = company;

    const locationEl = header.querySelector("#location_names");
    const location = locationEl ? visibleText(locationEl).replace(/\s+/g, " ") : "";
    if (location) fields.locationRaw = location;
    if (/work from home|\bwfh\b/i.test(location)) {
      fields.workArrangement = "remote";
      fields.workFromHome = true;
    } else if (/\bhybrid\b/i.test(location)) {
      fields.workArrangement = "hybrid";
    } else if (location) {
      fields.workArrangement = "onsite";
    }

    const deadline = labelled(
      header,
      /^(apply by|application deadline|last date to apply|deadline)$/i,
    );
    if (deadline) {
      const date = parseExplicitDate(deadline.value);
      if (date) fields.deadline = { date, evidence: `${deadline.label} ${deadline.value}` };
    }

    const pay = labelled(header, /^(stipend|salary|ctc(?:\s*\(annual\))?)$/i);
    if (pay) fields.compensationRaw = pay.value;
    const experience = labelled(header, /^experience$/i);
    if (experience) fields.experienceRaw = experience.value;

    const descriptionEl = about.querySelector(".about_heading")?.nextElementSibling;
    if (descriptionEl?.classList.contains("text-container")) {
      const description = visibleText(descriptionEl);
      if (description) fields.description = description;
    }

    const skillsRoot = about.querySelector(".skills_heading")?.nextElementSibling;
    if (skillsRoot?.classList.contains("round_tabs_container")) {
      const skills = [...skillsRoot.querySelectorAll(".round_tabs")]
        .map((node) => visibleText(node).replace(/\s+/g, " "))
        .filter(Boolean);
      if (skills.length > 0) fields.skills = skills;
    }

    const chips = [...header.querySelectorAll(".status-inactive")].map((node) =>
      visibleText(node).toLowerCase(),
    );
    if (kind === "internship") fields.employmentType = "internship";
    else if (chips.some((chip) => chip.includes("part time") || chip.includes("part-time"))) {
      fields.employmentType = "part_time";
    } else if (kind === "job") fields.employmentType = "full_time";

    return fields;
  },
};
