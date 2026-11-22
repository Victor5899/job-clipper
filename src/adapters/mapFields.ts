import type { EmploymentType, WorkArrangement } from "../core/model/enums";

export function mapEmploymentType(value: string | undefined): EmploymentType | undefined {
  const text = value?.toLowerCase() ?? "";
  if (!text.trim()) return undefined;
  if (text.includes("intern")) return "internship";
  if (text.includes("part")) return "part_time";
  if (text.includes("contract") || text.includes("temporary") || text.includes("freelance")) {
    return "contract";
  }
  if (text.includes("full")) return "full_time";
  return undefined;
}

export function mapWorkArrangement(value: string | undefined): WorkArrangement | undefined {
  const text = value?.toLowerCase() ?? "";
  if (!text.trim()) return undefined;
  if (/\bwork from home\b|\bwfh\b|\bremote\b|\btelecommute\b/.test(text)) return "remote";
  if (/\bhybrid\b/.test(text)) return "hybrid";
  if (/\bon-?site\b|\bin[- ]office\b|\bwork from office\b/.test(text)) return "onsite";
  return undefined;
}
