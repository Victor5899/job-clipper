export const JOB_STATUSES = ["saved", "applied", "interview", "result"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const STATUS_LABELS: Record<JobStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  interview: "Interview",
  result: "Result",
};

export const RESULT_OUTCOMES = ["selected", "rejected", "withdrawn", "no_response"] as const;
export type ResultOutcome = (typeof RESULT_OUTCOMES)[number];

export const RESULT_LABELS: Record<ResultOutcome, string> = {
  selected: "Selected",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  no_response: "No response",
};

export const INDIA_ELIGIBILITY = [
  "india_onsite",
  "india_hybrid",
  "remote_india",
  "remote_worldwide",
  "remote_restricted",
  "international_relocation",
  "unknown",
] as const;
export type IndiaEligibility = (typeof INDIA_ELIGIBILITY)[number];

export const ELIGIBILITY_LABELS: Record<IndiaEligibility, string> = {
  india_onsite: "India — on-site",
  india_hybrid: "India — hybrid",
  remote_india: "Remote — India eligible",
  remote_worldwide: "Remote — worldwide",
  remote_restricted: "Remote — restricted region",
  international_relocation: "International — relocation required",
  unknown: "Unknown",
};

export const WORK_ARRANGEMENTS = ["onsite", "hybrid", "remote", "unknown"] as const;
export type WorkArrangement = (typeof WORK_ARRANGEMENTS)[number];

export const WORK_ARRANGEMENT_LABELS: Record<WorkArrangement, string> = {
  onsite: "On-site",
  hybrid: "Hybrid",
  remote: "Remote",
  unknown: "Unknown",
};

export const EMPLOYMENT_TYPES = [
  "internship",
  "full_time",
  "contract",
  "part_time",
  "unknown",
] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  internship: "Internship",
  full_time: "Full-time",
  contract: "Contract",
  part_time: "Part-time",
  unknown: "Unknown",
};

export const JOB_CATEGORIES = [
  "data_engineering",
  "data_analyst",
  "business_intelligence",
  "python_developer",
  "sql_developer",
  "software_engineering",
  "graduate_trainee",
  "other",
] as const;
export type JobCategory = (typeof JOB_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<JobCategory, string> = {
  data_engineering: "Data engineering",
  data_analyst: "Data analyst",
  business_intelligence: "Business intelligence",
  python_developer: "Python developer",
  sql_developer: "SQL developer",
  software_engineering: "Software engineering",
  graduate_trainee: "Graduate trainee",
  other: "Other",
};

export const EXPERIENCE_LEVELS = [
  "internship",
  "fresher",
  "entry",
  "mid",
  "senior",
  "unknown",
] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  internship: "Internship",
  fresher: "Fresher",
  entry: "Entry-level",
  mid: "Mid-level",
  senior: "Senior",
  unknown: "Unknown",
};

export const VISA_SPONSORSHIP = ["yes", "no", "unknown"] as const;
export type VisaSponsorship = (typeof VISA_SPONSORSHIP)[number];
export const VISA_LABELS: Record<VisaSponsorship, string> = {
  yes: "Yes",
  no: "No",
  unknown: "Unknown",
};

export const STUDENT_ELIGIBILITY = ["students", "graduates", "both", "unknown"] as const;
export type StudentEligibility = (typeof STUDENT_ELIGIBILITY)[number];
export const STUDENT_LABELS: Record<StudentEligibility, string> = {
  students: "Students",
  graduates: "Graduates",
  both: "Students and graduates",
  unknown: "Unknown",
};

export const COMPENSATION_PERIODS = ["month", "year", "hour", "lumpsum", "unknown"] as const;
export type CompensationPeriod = (typeof COMPENSATION_PERIODS)[number];
export const PERIOD_LABELS: Record<CompensationPeriod, string> = {
  month: "Per month",
  year: "Per year",
  hour: "Per hour",
  lumpsum: "Lump sum",
  unknown: "Unknown",
};

export const COMPENSATION_KINDS = ["salary", "stipend", "unknown"] as const;
export type CompensationKind = (typeof COMPENSATION_KINDS)[number];
export const KIND_LABELS: Record<CompensationKind, string> = {
  salary: "Salary",
  stipend: "Stipend",
  unknown: "Unknown",
};

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
