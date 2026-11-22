import { cleanText } from "./text";
import { indianCitiesIn } from "../eligibility/places";

const COUNTRIES: Record<string, { name: string; code: string }> = {
  india: { name: "India", code: "IN" },
  in: { name: "India", code: "IN" },
  "united states": { name: "United States", code: "US" },
  "united states of america": { name: "United States", code: "US" },
  usa: { name: "United States", code: "US" },
  us: { name: "United States", code: "US" },
  "united kingdom": { name: "United Kingdom", code: "GB" },
  uk: { name: "United Kingdom", code: "GB" },
  britain: { name: "United Kingdom", code: "GB" },
  canada: { name: "Canada", code: "CA" },
  germany: { name: "Germany", code: "DE" },
  france: { name: "France", code: "FR" },
  australia: { name: "Australia", code: "AU" },
  singapore: { name: "Singapore", code: "SG" },
  netherlands: { name: "Netherlands", code: "NL" },
  ireland: { name: "Ireland", code: "IE" },
  "united arab emirates": { name: "United Arab Emirates", code: "AE" },
  uae: { name: "United Arab Emirates", code: "AE" },
  dubai: { name: "United Arab Emirates", code: "AE" },
};

export interface ParsedLocation {
  raw?: string;
  city?: string;
  country?: string;
  countryCode?: string;
  /** True when an Indian city or the country India was found, and no other country was. */
  inIndia: boolean;
  /** True when a non-India country was found and no Indian city was. */
  outsideIndia: boolean;
}

function countryFrom(part: string): { name: string; code: string } | undefined {
  return COUNTRIES[part.trim().toLowerCase().replace(/\./g, "")];
}

/** Splits a location label into a city and country. "Work from home" has no city. */
export function parseLocation(value: string | undefined): ParsedLocation {
  const raw = value ? cleanText(value, 200) : "";
  if (!raw || /^(remote|hybrid|on-?site|work from home|wfh)$/i.test(raw)) {
    return { ...(raw ? { raw } : {}), inIndia: false, outsideIndia: false };
  }

  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const cities = indianCitiesIn(raw);
  let country: { name: string; code: string } | undefined;
  for (const part of [...parts].reverse()) {
    const found = countryFrom(part.replace(/\([^)]*\)/g, ""));
    if (found) {
      country = found;
      break;
    }
  }
  if (!country && /\bindia\b/i.test(raw)) country = COUNTRIES.india;

  const foreign = country && country.code !== "IN";
  const inIndia = (cities.length > 0 || country?.code === "IN") && !foreign;
  const outsideIndia = Boolean(foreign) && cities.length === 0;

  return {
    raw,
    ...(cities[0] ? { city: cities[0] } : {}),
    ...(country ? { country: country.name, countryCode: country.code } : {}),
    ...(inIndia && !country ? { country: "India", countryCode: "IN" } : {}),
    inIndia,
    outsideIndia,
  };
}
