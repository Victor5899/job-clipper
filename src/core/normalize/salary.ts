import type { CompensationKind, CompensationPeriod } from "../model/enums";

export interface ParsedCompensation {
  raw?: string;
  currency?: string;
  min?: number;
  max?: number;
  period: CompensationPeriod;
  kind: CompensationKind;
}

const UNDISCLOSED = /^(not disclosed|not available|unpaid|n\/a|na|-|—)$/i;

function periodOf(text: string): CompensationPeriod {
  if (/\/\s*month|\bper month\b|\bpm\b|\ba month\b/i.test(text)) return "month";
  if (/\/\s*year|\bper annum\b|\bp\.?a\.?\b|\ba year\b|\bannual\b|\blpa\b/i.test(text))
    return "year";
  if (/\/\s*hour|\bper hour\b|\ban hour\b/i.test(text)) return "hour";
  if (/\blump\s*sum\b|\bone[\s-]?time\b/i.test(text)) return "lumpsum";
  return "unknown";
}

function currencyOf(text: string): string | undefined {
  if (/₹|\binr\b|₹|rs\.?|lacs?|lakhs?|\blpa\b/i.test(text)) return "INR";
  if (/\$|\busd\b/i.test(text)) return "USD";
  if (/€|\beur\b/i.test(text)) return "EUR";
  if (/£|\bgbp\b/i.test(text)) return "GBP";
  return undefined;
}

/** Indian and Western grouped numbers: "5,00,000" and "20,000" both become 500000 / 20000. */
function parseAmount(token: string): number | undefined {
  const cleaned = token.replace(/,/g, "").replace(/[^\d.]/g, "");
  if (!cleaned || !/^\d+(\.\d+)?$/.test(cleaned)) return undefined;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : undefined;
}

export function parseCompensation(
  value: string | undefined,
  hint?: { kind?: CompensationKind },
): ParsedCompensation {
  const raw = value?.trim();
  if (!raw) return { period: "unknown", kind: hint?.kind ?? "unknown" };
  if (UNDISCLOSED.test(raw)) {
    return { raw, period: "unknown", kind: raw.toLowerCase() === "unpaid" ? "stipend" : "unknown" };
  }

  const period = periodOf(raw);
  const currency = currencyOf(raw);
  let kind: CompensationKind = hint?.kind ?? "unknown";
  if (/\bstipend\b/i.test(raw)) kind = "stipend";
  else if (/\bsalary\b|\bctc\b|\blpa\b|\blacs?\b/i.test(raw)) kind = "salary";
  else if (kind === "unknown" && period === "month") kind = "stipend";
  else if (kind === "unknown" && (period === "year" || period === "hour")) kind = "salary";

  const lac = raw.match(/(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*lacs?\b/i);
  if (lac?.[1] && lac[2]) {
    return {
      raw,
      ...(currency ? { currency } : {}),
      min: Math.round(Number(lac[1]) * 100_000),
      max: Math.round(Number(lac[2]) * 100_000),
      period: period === "unknown" ? "year" : period,
      kind: kind === "unknown" ? "salary" : kind,
    };
  }

  const singleLac = raw.match(/(\d+(?:\.\d+)?)\s*lacs?\b/i);
  const range = raw.match(
    /(?:₹|rs\.?|inr|\$|€|£)?\s*(\d[\d,]*(?:\.\d+)?)\s*(?:-|–|to)\s*(?:₹|rs\.?|inr|\$|€|£)?\s*(\d[\d,]*(?:\.\d+)?)/i,
  );
  if (range?.[1] && range[2]) {
    const min = parseAmount(range[1]);
    const max = parseAmount(range[2]);
    return {
      raw,
      ...(currency ? { currency } : {}),
      ...(min !== undefined ? { min } : {}),
      ...(max !== undefined ? { max } : {}),
      period,
      kind,
    };
  }

  if (singleLac?.[1]) {
    const amount = Math.round(Number(singleLac[1]) * 100_000);
    return {
      raw,
      ...(currency ? { currency } : {}),
      min: amount,
      max: amount,
      period: period === "unknown" ? "year" : period,
      kind: kind === "unknown" ? "salary" : kind,
    };
  }

  const single = raw.match(/(?:₹|rs\.?|inr|\$|€|£)\s*(\d[\d,]*(?:\.\d+)?)/i);
  const amount = single?.[1] ? parseAmount(single[1]) : undefined;
  return {
    raw,
    ...(currency ? { currency } : {}),
    ...(amount !== undefined ? { min: amount, max: amount } : {}),
    period,
    kind,
  };
}
