import { isValidDateString } from "../deadline";

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

function calendarDate(year: number, month: number, day: number): string | null {
  let fullYear = year;
  if (fullYear < 100) fullYear += fullYear < 70 ? 2000 : 1900;
  const value = `${fullYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return isValidDateString(value) ? value : null;
}

/**
 * Parses one isolated date value, such as the text beside an "Apply By" label.
 * The value must be the date itself. A sentence that merely contains a date returns null.
 */
export function parseExplicitDate(value: string): string | null {
  const text = value.trim().replace(/['’]/g, "").replace(/\s+/g, " ");
  if (!text || text.length > 40) return null;

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:\b|T|\s|$)/);
  if (iso?.[1] && iso[2] && iso[3]) {
    return calendarDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  const named = text.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\.?\s+(\d{2,4})$/);
  if (!named?.[1] || !named[2] || !named[3]) return null;
  const month = MONTHS[named[2].toLowerCase()];
  if (!month) return null;
  return calendarDate(Number(named[3]), month, Number(named[1]));
}
