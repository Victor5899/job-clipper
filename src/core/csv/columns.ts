import { format } from "date-fns";
import {
  CATEGORY_LABELS,
  ELIGIBILITY_LABELS,
  EMPLOYMENT_LABELS,
  EXPERIENCE_LABELS,
  KIND_LABELS,
  PERIOD_LABELS,
  RESULT_LABELS,
  SOURCE_LABELS,
  STATUS_LABELS,
  STUDENT_LABELS,
  VISA_LABELS,
  WORK_ARRANGEMENT_LABELS,
} from "../model/enums";
import type { JobApplication } from "../model/types";

export interface CsvColumn {
  header: string;
  cell: (job: JobApplication) => string;
}

const DESCRIPTION_HEADER = "Description";

function text(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return "";
  return String(value);
}

function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

function joinList(values: readonly (string | number)[] | undefined): string {
  if (!values || values.length === 0) return "";
  return values.join("; ");
}

/** Local minute stamp for the human reminder column. Raw ISO stays in its own column. */
function localStamp(iso: string | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return format(date, "yyyy-MM-dd HH:mm");
}

function deadlineCell(job: JobApplication): string {
  if (!job.deadline) return "";
  return job.deadline.time ? `${job.deadline.date} ${job.deadline.time}` : job.deadline.date;
}

function deadlineSource(job: JobApplication): string {
  if (!job.deadline) return "";
  return job.deadline.origin === "page_label" ? "Page label" : "Entered by user";
}

function reminderCell(job: JobApplication): string {
  const reminder = job.reminder;
  if (!reminder.enabled) return "Off";
  const stamp = localStamp(reminder.remindAt ?? reminder.customAt);
  if (stamp) return `On – ${stamp}`;
  if (reminder.mode === "default" && reminder.leadDays !== undefined && reminder.atTime) {
    const days = reminder.leadDays;
    const when = days === 0 ? "same day" : days === 1 ? "1 day before" : `${days} days before`;
    return `On – ${when} ${reminder.atTime}`;
  }
  return "On";
}

function statusHistory(job: JobApplication): string {
  return job.statusHistory
    .map((entry) => {
      const result = entry.result ? ` (${RESULT_LABELS[entry.result]})` : "";
      return `${STATUS_LABELS[entry.status]}${result} ${entry.at}`;
    })
    .join("; ");
}

function fieldSources(job: JobApplication): string {
  const sources = job.extraction?.fieldSources;
  if (!sources) return "";
  return Object.entries(sources)
    .map(([field, source]) => `${field}=${source}`)
    .join("; ");
}

/**
 * Spec order first (section 17), then every other stored field.
 * Enum columns use the labels from the app. Timestamps that are stored as ISO
 * are written as that ISO string so the spreadsheet cell still has the original value.
 */
const COLUMNS: CsvColumn[] = [
  { header: "ID", cell: (job) => job.id },
  { header: "Job Title", cell: (job) => job.title },
  { header: "Company", cell: (job) => job.company },
  { header: "Job URL", cell: (job) => job.url },
  { header: "Source", cell: (job) => SOURCE_LABELS[job.source] },
  { header: "Location", cell: (job) => text(job.location.raw) },
  { header: "City", cell: (job) => text(job.location.city) },
  { header: "Country", cell: (job) => text(job.location.country) },
  { header: "Work Arrangement", cell: (job) => WORK_ARRANGEMENT_LABELS[job.workArrangement] },
  { header: "Employment Type", cell: (job) => EMPLOYMENT_LABELS[job.employmentType] },
  { header: "Category", cell: (job) => CATEGORY_LABELS[job.category] },
  { header: "India Eligibility", cell: (job) => ELIGIBILITY_LABELS[job.eligibility.value] },
  { header: "Eligibility Overridden", cell: (job) => yesNo(job.eligibility.overridden) },
  { header: "Visa Sponsorship", cell: (job) => VISA_LABELS[job.visaSponsorship] },
  { header: "Experience Requirement", cell: (job) => text(job.experience.raw) },
  { header: "Salary/Stipend (raw)", cell: (job) => text(job.compensation.raw) },
  { header: "Skills", cell: (job) => joinList(job.skills) },
  { header: "Deadline", cell: deadlineCell },
  { header: "Deadline Source", cell: deadlineSource },
  { header: "Status", cell: (job) => STATUS_LABELS[job.status] },
  { header: "Result", cell: (job) => (job.result ? RESULT_LABELS[job.result] : "") },
  { header: "Date Saved", cell: (job) => job.savedAt },
  { header: "Date Applied", cell: (job) => text(job.appliedAt) },
  { header: "Interview Date", cell: (job) => text(job.interviewAt) },
  { header: "Reminder", cell: reminderCell },
  { header: "Contact Name", cell: (job) => text(job.contact?.name) },
  { header: "Contact Email", cell: (job) => text(job.contact?.email) },
  { header: "Notes", cell: (job) => job.notes },
  { header: DESCRIPTION_HEADER, cell: (job) => text(job.description) },
  { header: "Canonical URL", cell: (job) => job.canonicalUrl },
  { header: "Source Job ID", cell: (job) => text(job.sourceJobId) },
  { header: "Company Website", cell: (job) => text(job.companyWebsite) },
  { header: "Country Code", cell: (job) => text(job.location.countryCode) },
  { header: "Eligible Countries", cell: (job) => joinList(job.eligibleCountries) },
  {
    header: "Eligibility Confidence",
    cell: (job) => job.eligibility.confidence,
  },
  { header: "Eligibility Reasons", cell: (job) => joinList(job.eligibility.reasons) },
  { header: "Classifier Version", cell: (job) => String(job.eligibility.classifierVersion) },
  { header: "Work Authorization", cell: (job) => text(job.workAuthorization) },
  { header: "Student Eligibility", cell: (job) => STUDENT_LABELS[job.studentEligibility] },
  { header: "Graduation Years", cell: (job) => joinList(job.graduationYears) },
  { header: "Experience Level", cell: (job) => EXPERIENCE_LABELS[job.experience.level] },
  { header: "Minimum Years", cell: (job) => text(job.experience.minYears) },
  { header: "Maximum Years", cell: (job) => text(job.experience.maxYears) },
  { header: "Compensation Currency", cell: (job) => text(job.compensation.currency) },
  { header: "Compensation Minimum", cell: (job) => text(job.compensation.min) },
  { header: "Compensation Maximum", cell: (job) => text(job.compensation.max) },
  { header: "Compensation Period", cell: (job) => PERIOD_LABELS[job.compensation.period] },
  { header: "Compensation Kind", cell: (job) => KIND_LABELS[job.compensation.kind] },
  { header: "Status History", cell: statusHistory },
  { header: "Date Updated", cell: (job) => job.updatedAt },
  { header: "Contact Phone", cell: (job) => text(job.contact?.phone) },
  { header: "Contact Profile URL", cell: (job) => text(job.contact?.profileUrl) },
  { header: "Reminder Enabled", cell: (job) => yesNo(job.reminder.enabled) },
  {
    header: "Reminder Mode",
    cell: (job) => (job.reminder.mode === "custom" ? "Custom" : "Default"),
  },
  { header: "Reminder Lead Days", cell: (job) => text(job.reminder.leadDays) },
  { header: "Reminder Time", cell: (job) => text(job.reminder.atTime) },
  { header: "Custom Reminder At", cell: (job) => text(job.reminder.customAt) },
  { header: "Remind Soon At", cell: (job) => text(job.reminder.soonAt) },
  { header: "Reminder Status", cell: (job) => job.reminder.status },
  { header: "Reminder Fired At", cell: (job) => text(job.reminder.firedAt) },
  { header: "Remind At", cell: (job) => text(job.reminder.remindAt) },
  { header: "Deadline Evidence", cell: (job) => text(job.deadline?.evidence) },
  { header: "Extraction Adapter", cell: (job) => text(job.extraction?.adapter) },
  { header: "Extraction Version", cell: (job) => text(job.extraction?.adapterVersion) },
  { header: "Extracted At", cell: (job) => text(job.extraction?.extractedAt) },
  { header: "Field Sources", cell: fieldSources },
  { header: "Schema Version", cell: (job) => String(job.schemaVersion) },
];

export function columnsFor(includeDescription: boolean): CsvColumn[] {
  if (includeDescription) return COLUMNS;
  return COLUMNS.filter((column) => column.header !== DESCRIPTION_HEADER);
}
