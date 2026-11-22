/** Canonical city name plus the spellings a listing might use. */
const CITIES: { name: string; aliases: string[] }[] = [
  { name: "Mumbai", aliases: ["mumbai", "bombay", "navi mumbai"] },
  { name: "Delhi", aliases: ["delhi", "new delhi", "delhi ncr", "ncr", "delhi ncr region"] },
  { name: "Bengaluru", aliases: ["bengaluru", "bangalore", "bengaluru urban"] },
  { name: "Hyderabad", aliases: ["hyderabad", "secunderabad"] },
  { name: "Chennai", aliases: ["chennai", "madras"] },
  { name: "Kolkata", aliases: ["kolkata", "calcutta"] },
  { name: "Pune", aliases: ["pune", "pune division"] },
  { name: "Ahmedabad", aliases: ["ahmedabad", "amdavad"] },
  { name: "Jaipur", aliases: ["jaipur"] },
  { name: "Surat", aliases: ["surat"] },
  { name: "Lucknow", aliases: ["lucknow"] },
  { name: "Kanpur", aliases: ["kanpur"] },
  { name: "Nagpur", aliases: ["nagpur"] },
  { name: "Indore", aliases: ["indore"] },
  { name: "Thane", aliases: ["thane"] },
  { name: "Bhopal", aliases: ["bhopal"] },
  { name: "Visakhapatnam", aliases: ["visakhapatnam", "vizag"] },
  { name: "Patna", aliases: ["patna"] },
  { name: "Vadodara", aliases: ["vadodara", "baroda"] },
  { name: "Ghaziabad", aliases: ["ghaziabad"] },
  { name: "Ludhiana", aliases: ["ludhiana"] },
  { name: "Agra", aliases: ["agra"] },
  { name: "Nashik", aliases: ["nashik", "nasik"] },
  { name: "Faridabad", aliases: ["faridabad"] },
  { name: "Meerut", aliases: ["meerut"] },
  { name: "Rajkot", aliases: ["rajkot"] },
  { name: "Varanasi", aliases: ["varanasi", "banaras", "benares"] },
  { name: "Srinagar", aliases: ["srinagar"] },
  { name: "Aurangabad", aliases: ["aurangabad", "chhatrapati sambhajinagar"] },
  { name: "Dhanbad", aliases: ["dhanbad"] },
  { name: "Amritsar", aliases: ["amritsar"] },
  { name: "Prayagraj", aliases: ["prayagraj", "allahabad"] },
  { name: "Ranchi", aliases: ["ranchi"] },
  { name: "Howrah", aliases: ["howrah"] },
  { name: "Coimbatore", aliases: ["coimbatore"] },
  { name: "Jabalpur", aliases: ["jabalpur"] },
  { name: "Gwalior", aliases: ["gwalior"] },
  { name: "Vijayawada", aliases: ["vijayawada"] },
  { name: "Jodhpur", aliases: ["jodhpur"] },
  { name: "Madurai", aliases: ["madurai"] },
  { name: "Raipur", aliases: ["raipur"] },
  { name: "Kota", aliases: ["kota"] },
  { name: "Chandigarh", aliases: ["chandigarh"] },
  { name: "Guwahati", aliases: ["guwahati"] },
  { name: "Solapur", aliases: ["solapur", "sholapur"] },
  { name: "Hubballi", aliases: ["hubballi", "hubli"] },
  { name: "Mysuru", aliases: ["mysuru", "mysore"] },
  { name: "Tiruchirappalli", aliases: ["tiruchirappalli", "trichy"] },
  { name: "Gurugram", aliases: ["gurugram", "gurgaon"] },
  { name: "Noida", aliases: ["noida", "greater noida"] },
  { name: "Thiruvananthapuram", aliases: ["thiruvananthapuram", "trivandrum"] },
  { name: "Kochi", aliases: ["kochi", "cochin", "ernakulam"] },
  { name: "Dombivli", aliases: ["dombivli", "dombivali"] },
  { name: "Mohali", aliases: ["mohali", "sahibzada ajit singh nagar"] },
  { name: "Mangaluru", aliases: ["mangaluru", "mangalore"] },
  { name: "Dehradun", aliases: ["dehradun"] },
  { name: "Bhubaneswar", aliases: ["bhubaneswar"] },
  { name: "Udaipur", aliases: ["udaipur"] },
];

const ALIASES = CITIES.flatMap((city) =>
  city.aliases.map((alias) => ({ alias, name: city.name })),
).sort((a, b) => b.alias.length - a.alias.length);

export function normalizePlace(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** First Indian city found in a location string, using the canonical name. */
export function matchIndianCity(value: string): string | undefined {
  const text = normalizePlace(value);
  if (!text) return undefined;
  for (const { alias, name } of ALIASES) {
    const pattern = new RegExp(`(?:^| )${alias}(?: |$)`);
    if (pattern.test(text)) return name;
  }
  return undefined;
}

export function indianCitiesIn(value: string): string[] {
  const parts = value.split(/,|\/|\band\b/i);
  const found = new Set<string>();
  for (const part of parts) {
    const city = matchIndianCity(part);
    if (city) found.add(city);
  }
  if (found.size === 0) {
    const whole = matchIndianCity(value);
    if (whole) found.add(whole);
  }
  return [...found];
}
