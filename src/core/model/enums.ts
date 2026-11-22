export const JOB_STATUSES = ["saved", "applied", "interview", "result"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const STATUS_LABELS: Record<JobStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  interview: "Interview",
  result: "Result",
};

export type ResultOutcome = "selected" | "rejected" | "withdrawn" | "no_response";

export type IndiaEligibility =
  | "india_onsite"
  | "india_hybrid"
  | "remote_india"
  | "remote_worldwide"
  | "remote_restricted"
  | "international_relocation"
  | "unknown";

export type WorkArrangement = "onsite" | "hybrid" | "remote" | "unknown";

export type EmploymentType = "internship" | "full_time" | "contract" | "part_time" | "unknown";

export type JobCategory =
  | "data_engineering"
  | "data_analyst"
  | "business_intelligence"
  | "python_developer"
  | "sql_developer"
  | "software_engineering"
  | "graduate_trainee"
  | "other";

export type SourceId =
  | "linkedin"
  | "internshala"
  | "naukri"
  | "wellfound"
  | "indeed"
  | "ycombinator"
  | "himalayas"
  | "weworkremotely"
  | "unstop"
  | "cutshort"
  | "hiringcafe"
  | "glassdoor"
  | "ziprecruiter"
  | "other";

export const SOURCE_LABELS: Record<SourceId, string> = {
  linkedin: "LinkedIn",
  internshala: "Internshala",
  naukri: "Naukri",
  wellfound: "Wellfound",
  indeed: "Indeed",
  ycombinator: "YC Jobs",
  himalayas: "Himalayas",
  weworkremotely: "We Work Remotely",
  unstop: "Unstop",
  cutshort: "Cutshort",
  hiringcafe: "HiringCafe",
  glassdoor: "Glassdoor",
  ziprecruiter: "ZipRecruiter",
  other: "Other",
};
