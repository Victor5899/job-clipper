import type { ExperienceLevel } from "../model/enums";

export interface ParsedExperience {
  raw?: string;
  minYears?: number;
  maxYears?: number;
  level: ExperienceLevel;
}

function levelFor(text: string, min?: number, max?: number): ExperienceLevel {
  if (/\bintern(ship)?\b/i.test(text)) return "internship";
  if (/\bfresher\b|\bno experience\b|\bfresh graduates?\b/i.test(text)) return "fresher";
  if (max === undefined && min === undefined) return "unknown";
  const low = min ?? max ?? 0;
  const high = max ?? min ?? 0;
  if (high <= 1) return "fresher";
  if (low >= 6) return "senior";
  if (low >= 3) return "mid";
  if (high <= 2) return "entry";
  if (high <= 5 && low <= 1) return "entry";
  return "mid";
}

/** Best-effort parse of an experience label such as "0-2 Yrs" or "No experience required". */
export function parseExperience(value: string | undefined): ParsedExperience {
  const raw = value?.trim();
  if (!raw) return { level: "unknown" };

  const range = raw.match(
    /(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*(?:\+?\s*)?(?:years?|yrs?)?/i,
  );
  if (range?.[1] && range[2]) {
    const minYears = Number(range[1]);
    const maxYears = Number(range[2]);
    return { raw, minYears, maxYears, level: levelFor(raw, minYears, maxYears) };
  }

  const plus = raw.match(/(\d+(?:\.\d+)?)\s*\+\s*(?:years?|yrs?)?/i);
  if (plus?.[1] && /\d/.test(plus[1])) {
    const minYears = Number(plus[1]);
    return { raw, minYears, level: levelFor(raw, minYears, undefined) };
  }

  const single = raw.match(/(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\b/i);
  if (single?.[1]) {
    const years = Number(single[1]);
    return { raw, minYears: years, maxYears: years, level: levelFor(raw, years, years) };
  }

  return { raw, level: levelFor(raw) };
}
