import type { JobCategory } from "../model/enums";

const TITLE_RULES: [JobCategory, RegExp][] = [
  ["data_engineering", /\bdata\s+engineers?\b|\bdata\s+engineering\b|\betl\b/i],
  ["data_analyst", /\bdata\s+analysts?\b|\banalytics?\s+intern\b|\bbusiness\s+analysts?\b/i],
  [
    "business_intelligence",
    /\bbusiness\s+intelligence\b|\bpower\s*bi\b|\bbi\s+(developer|analyst|intern)\b/i,
  ],
  ["python_developer", /\bpython\s+(developer|engineer|intern)\b/i],
  ["sql_developer", /\bsql\s+(developer|engineer|intern)\b/i],
  ["graduate_trainee", /\bgraduate\s+trainees?\b|\bcampus\s+hire\b/i],
  [
    "software_engineering",
    /\bsoftware\s+engineers?\b|\bsoftware\s+developer\b|\bfull[\s-]?stack\b|\bfrontend\b|\bbackend\b|\bsde\b|\bweb\s+developer\b/i,
  ],
];

/** Classifies a role from its title. Description text is used only when the title has no match. */
export function categorize(title: string, description = ""): JobCategory {
  for (const [category, pattern] of TITLE_RULES) {
    if (pattern.test(title)) return category;
  }
  for (const [category, pattern] of TITLE_RULES) {
    if (pattern.test(description)) return category;
  }
  return "other";
}
