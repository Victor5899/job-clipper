import type {
  EmploymentType,
  IndiaEligibility,
  JobCategory,
  JobStatus,
  ResultOutcome,
  SourceId,
  WorkArrangement,
} from "./enums";

/** null means "No deadline provided". Deadlines are never inferred (PROJECT_SPEC section 7). */
export type Deadline = {
  /** YYYY-MM-DD in the browser's local time zone. */
  date: string;
  /** HH:mm; when absent the deadline is 23:59 that day. */
  time?: string;
  origin: "page_label" | "user";
  /** page_label only: the quoted label text the date was read from. */
  evidence?: string;
} | null;

export interface JobApplication {
  id: string;
  schemaVersion: number;

  title: string;
  company: string;
  url: string;
  canonicalUrl: string;
  source: SourceId;
  sourceJobId?: string;
  description?: string;
  companyWebsite?: string;

  location: { raw?: string; city?: string; country?: string; countryCode?: string };
  workArrangement: WorkArrangement;
  eligibleCountries: string[];
  eligibility: {
    value: IndiaEligibility;
    confidence: "high" | "medium" | "low";
    reasons: string[];
    overridden: boolean;
    classifierVersion: number;
  };
  workAuthorization?: string;
  visaSponsorship: "yes" | "no" | "unknown";
  studentEligibility: "students" | "graduates" | "both" | "unknown";
  graduationYears: number[];

  employmentType: EmploymentType;
  experience: {
    raw?: string;
    minYears?: number;
    maxYears?: number;
    level: "internship" | "fresher" | "entry" | "mid" | "senior" | "unknown";
  };
  compensation: {
    raw?: string;
    currency?: string;
    min?: number;
    max?: number;
    period: "month" | "year" | "hour" | "lumpsum" | "unknown";
    kind: "salary" | "stipend" | "unknown";
  };
  skills: string[];
  category: JobCategory;

  status: JobStatus;
  result?: ResultOutcome;
  statusHistory: { status: JobStatus; result?: ResultOutcome; at: string }[];
  savedAt: string;
  updatedAt: string;
  appliedAt?: string;
  interviewAt?: string;
  deadline: Deadline;
  notes: string;
  contact?: { name?: string; email?: string; phone?: string; profileUrl?: string };

  reminder: {
    enabled: boolean;
    mode: "default" | "custom";
    leadDays?: number;
    atTime?: string;
    customAt?: string;
    /**
     * One-shot "Remind me in 1 minute" instant. It is cleared after that notification
     * is delivered. The mode and time above are the schedule that comes back.
     */
    soonAt?: string;
    remindAt?: string;
    status: "none" | "scheduled" | "fired" | "missed" | "expired";
    firedAt?: string;
  };

  extraction?: {
    adapter: string;
    adapterVersion: number;
    extractedAt: string;
    fieldSources: Record<string, "jsonld" | "adapter" | "meta" | "heuristic" | "user">;
  };
}

export interface Settings {
  reminders: { enabledByDefault: boolean; leadDays: number; atTime: string };
  profile: { graduationYear: number; countryCode: string };
  csv: {
    /** When true, the CSV includes the job description column. */
    includeDescription: boolean;
    /**
     * True after the user saves this checkbox, or after the spec default
     * (leave descriptions out) is recorded. Absent on settings saved before that.
     */
    chosen?: boolean;
  };
}
