function has(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

export function mentionsWorldwide(text: string): boolean {
  return has(
    text,
    /\b(anywhere in the world|worldwide|work from anywhere|anywhere worldwide|global remote)\b/i,
  );
}

export function mentionsIndiaRemote(text: string): boolean {
  return has(
    text,
    /\bremote\s*[-–(,]\s*india\b|\bremote\s+india\b|\banywhere in india\b|\bwithin india\b|\bacross india\b|\bopen to (?:candidates|applicants) (?:in|from) india\b|\bbased in india\b|\bindia[- ]based\b|\bapplicants? (?:from|in) india\b/i,
  );
}

export function mentionsWorkFromHome(text: string): boolean {
  return has(text, /\bwork from home\b|\bwfh\b/i);
}

export function mentionsRestriction(text: string): boolean {
  return has(
    text,
    /\b(us|usa|u\.s\.) only\b|\bunited states only\b|\bmust reside in\b|\b(?:eu|eea|uk)(?:\/eea)?(?:\/uk)? only\b|\beurope only\b|\bamericas only\b|\bauthorized to work in the united states\b|\bus citizens only\b|\bus citizen\/visa only\b|\bcitizens only\b|\bnot available in india\b/i,
  );
}

export function mentionsVisaYes(text: string): boolean {
  return has(
    text,
    /\bvisa sponsorship (?:is )?available\b|\bwill sponsor\b|\bsponsorship available\b/i,
  );
}

export function mentionsVisaNo(text: string): boolean {
  return has(
    text,
    /\bno (?:visa )?sponsorship\b|\bcannot sponsor\b|\bwill not sponsor\b|\bnot able to sponsor\b|\bus citizens only\b|\bus citizen\/visa only\b|\bcitizens only\b|\bvisa sponsorship(?: is)? not available\b|\bdo not provide visa assistance\b|\bno visa assistance\b/i,
  );
}

export function mentionsTimeZoneOverlap(text: string): boolean {
  return has(text, /\btime ?zones?\b|\boverlap with\b.{0,40}\bhours?\b/i);
}

const GRAD_PATTERNS = [
  /\b(20\d{2})\s*\/\s*(20\d{2})\s*batch\b/gi,
  /\b(20\d{2})\s*(?:and|&|,)\s*(20\d{2})\s*batch\b/gi,
  /\bgraduat(?:ing|ion)(?:\s+in|\s+year)?\s+(20\d{2})\b/gi,
  /\bclass of\s+(20\d{2})\b/gi,
  /\b(20\d{2})\s*batch\b/gi,
];

export function graduationYearsIn(text: string): number[] {
  const years = new Set<number>();
  for (const pattern of GRAD_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      for (const group of match.slice(1)) {
        if (group && /^20\d{2}$/.test(group)) years.add(Number(group));
      }
    }
  }
  return [...years].sort();
}

export type StudentSignal = "students" | "graduates" | "both" | "unknown";

export function studentSignalIn(text: string): StudentSignal {
  const students = /\bcurrently pursuing\b|\bfinal[- ]year\b|\bstudents only\b/i.test(text);
  const graduates = /\bfresh graduates?\b|\bgraduates only\b|\brecent graduates?\b/i.test(text);
  if (students && graduates) return "both";
  if (students) return "students";
  if (graduates) return "graduates";
  return "unknown";
}
