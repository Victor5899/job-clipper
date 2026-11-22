import { formatDeadline } from "../../core/deadline";
import { describeReminder } from "../../core/reminders/describeReminder";
import { useNow } from "../../ui/hooks/useNow";
import {
  CATEGORY_LABELS,
  ELIGIBILITY_LABELS,
  EMPLOYMENT_LABELS,
  RESULT_LABELS,
  STATUS_LABELS,
  WORK_ARRANGEMENT_LABELS,
} from "../../core/model/enums";
import type { JobApplication } from "../../core/model/types";
import { SourceTag } from "../../ui/components/SourceTag";
import { StatusPill } from "../../ui/components/StatusPill";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-2.5">
      <dt className="micro-label text-text-subtle">{label}</dt>
      <dd className="text-sm break-words text-text">{value}</dd>
    </div>
  );
}

export function JobDetails({ job }: { job: JobApplication }) {
  const now = useNow();
  const place = [job.location.city, job.location.country, job.location.raw]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="flex flex-col">
      <div className="mb-4 flex items-center gap-2">
        <StatusPill status={job.status} />
        <SourceTag source={job.source} />
      </div>
      <p className="text-sm text-text-muted">{job.company}</p>
      <dl className="mt-4">
        <Row label="Job URL" value={job.url} />
        <Row label="Deadline" value={formatDeadline(job.deadline)} />
        <Row label="Reminder" value={describeReminder(job, now)} />
        <Row label="Status" value={STATUS_LABELS[job.status]} />
        {job.result && <Row label="Result" value={RESULT_LABELS[job.result]} />}
        {place && <Row label="Location" value={place} />}
        {job.workArrangement !== "unknown" && (
          <Row label="Work arrangement" value={WORK_ARRANGEMENT_LABELS[job.workArrangement]} />
        )}
        <Row label="India eligibility" value={ELIGIBILITY_LABELS[job.eligibility.value]} />
        {job.employmentType !== "unknown" && (
          <Row label="Employment" value={EMPLOYMENT_LABELS[job.employmentType]} />
        )}
        {job.category !== "other" && <Row label="Category" value={CATEGORY_LABELS[job.category]} />}
        {job.description && <Row label="Description" value={job.description} />}
        <Row label="Notes" value={job.notes.trim() ? job.notes : "No notes"} />
      </dl>
    </div>
  );
}
