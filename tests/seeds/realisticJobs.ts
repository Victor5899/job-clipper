import { createJobFromManualEntry } from "../../src/core/model/defaults";
import type {
  IndiaEligibility,
  JobCategory,
  JobStatus,
  WorkArrangement,
} from "../../src/core/model/enums";
import type { JobApplication } from "../../src/core/model/types";

const COMPANIES = [
  "Acme Analytics",
  "Kalpana Systems",
  "Northwind",
  "Razorpay",
  "Zephyr Labs",
] as const;

const TITLES = [
  "Data Analyst Intern",
  "Python Developer Intern",
  "Business Intelligence Intern",
  "Graduate Trainee",
  "SQL Developer Intern",
] as const;

const CITIES = ["Bengaluru", "Chennai", "Hyderabad", "Pune", "Mumbai"] as const;

const STATUSES: JobStatus[] = ["saved", "applied", "interview", "result"];

const ARRANGEMENTS: WorkArrangement[] = ["hybrid", "onsite", "remote", "hybrid"];

const ELIGIBILITY: IndiaEligibility[] = ["india_hybrid", "india_onsite", "remote_india", "unknown"];

const CATEGORIES: JobCategory[] = [
  "data_analyst",
  "software_engineering",
  "data_engineering",
  "business_intelligence",
];

function deadlineDate(index: number): string | null {
  if (index % 7 === 0) return null;
  const day = new Date(Date.UTC(2026, 10, 23));
  day.setUTCDate(day.getUTCDate() + ((index % 45) - 10));
  return day.toISOString().slice(0, 10);
}

/** Realistic saved applications for the performance benchmark. Index 1500 is the unique search hit. */
export function realisticJobs(
  count: number,
  now = new Date("2026-11-23T09:00:00"),
): JobApplication[] {
  return Array.from({ length: count }, (_, index) => {
    const deadline = deadlineDate(index);
    const status = STATUSES[index % STATUSES.length] ?? "saved";
    const city = CITIES[index % CITIES.length] ?? "Bengaluru";
    const unique = index === 1500;
    const job = createJobFromManualEntry(
      {
        title: unique ? "Unique Zephyr Role" : `${TITLES[index % TITLES.length]} ${index}`,
        company: unique ? "Zephyr Labs" : (COMPANIES[index % COMPANIES.length] ?? "Acme Analytics"),
        url: `https://example.com/jobs/${index}`,
        deadline: deadline ? { date: deadline } : null,
      },
      { id: `bulk-${index}`, now: new Date(now.getTime() - index * 60_000) },
    );
    const category = CATEGORIES[index % CATEGORIES.length] ?? "other";
    return {
      ...job,
      status,
      statusHistory: [{ status, at: job.savedAt }],
      location: { city, country: "India", countryCode: "IN", raw: `${city}, India` },
      workArrangement: ARRANGEMENTS[index % ARRANGEMENTS.length] ?? "unknown",
      employmentType: "internship",
      category,
      skills: index % 3 === 0 ? ["SQL", "Python"] : ["Excel"],
      description: "Entry-level role for a 2027 graduate based in India.",
      notes: unique ? "warehouse pipeline" : "Follow up after the career fair.",
      eligibility: {
        ...job.eligibility,
        value: ELIGIBILITY[index % ELIGIBILITY.length] ?? "unknown",
      },
    };
  });
}
