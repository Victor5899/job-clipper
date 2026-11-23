/**
 * Recognises a country or region token from a structured list.
 * "NA" is not a country here: Cutshort uses it as an empty value.
 * An unrecognised token stays unknown so a city name is not treated as a restriction.
 */
export type CountrySignal = "india" | "worldwide" | "restricted" | "unknown";

const INDIA = new Set(["in", "india", "republic of india"]);
const WORLDWIDE = new Set(["worldwide", "anywhere", "anywhere in the world", "world"]);
const RESTRICTED = new Set([
  "us",
  "usa",
  "united states",
  "united states of america",
  "gb",
  "uk",
  "united kingdom",
  "great britain",
  "britain",
  "ca",
  "canada",
  "de",
  "germany",
  "dk",
  "denmark",
  "gr",
  "greece",
  "ch",
  "switzerland",
  "fr",
  "france",
  "au",
  "australia",
  "sg",
  "singapore",
  "nl",
  "netherlands",
  "ie",
  "ireland",
  "ae",
  "uae",
  "united arab emirates",
  "es",
  "spain",
  "it",
  "italy",
  "pt",
  "portugal",
  "se",
  "sweden",
  "no",
  "norway",
  "br",
  "brazil",
  "mx",
  "mexico",
  "jp",
  "japan",
  "kr",
  "south korea",
  "korea",
  "republic of korea",
  "nz",
  "new zealand",
  "il",
  "israel",
  "za",
  "south africa",
  "at",
  "austria",
  "be",
  "belgium",
  "pl",
  "poland",
  "fi",
  "finland",
  "eu",
  "europe",
  "eea",
]);

export function countrySignal(value: string): CountrySignal {
  const text = value
    .replace(/[^\p{L}\p{N}\s.'-]+/gu, " ")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (!text || text === "na" || text === "n a" || text === "not disclosed" || text === "unknown") {
    return "unknown";
  }
  if (INDIA.has(text)) return "india";
  if (WORLDWIDE.has(text)) return "worldwide";
  if (RESTRICTED.has(text)) return "restricted";
  return "unknown";
}
