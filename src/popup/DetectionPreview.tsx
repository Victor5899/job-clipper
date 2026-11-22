import type { ClipReview } from "../core/extraction/review";
import {
  ELIGIBILITY_LABELS,
  EMPLOYMENT_LABELS,
  INDIA_ELIGIBILITY,
  WORK_ARRANGEMENT_LABELS,
  WORK_ARRANGEMENTS,
} from "../core/model/enums";
import type { ManualEntryErrors } from "../core/model/manualEntry";
import { ManualEntryForm } from "../ui/components/ManualEntryForm";
import { SelectField } from "../ui/components/SelectField";
import { TextAreaField } from "../ui/components/TextAreaField";
import { TextField } from "../ui/components/TextField";

const ARRANGEMENT_OPTIONS = WORK_ARRANGEMENTS.map((value) => ({
  value,
  label: WORK_ARRANGEMENT_LABELS[value],
}));
const EMPLOYMENT_OPTIONS = (
  ["internship", "full_time", "contract", "part_time", "unknown"] as const
).map((value) => ({ value, label: EMPLOYMENT_LABELS[value] }));
const ELIGIBILITY_OPTIONS = INDIA_ELIGIBILITY.map((value) => ({
  value,
  label: value === "unknown" ? "Unknown — verify manually" : ELIGIBILITY_LABELS[value],
}));

interface DetectionPreviewProps {
  formId: string;
  idPrefix: string;
  review: ClipReview;
  errors: ManualEntryErrors;
  disabled?: boolean;
  onChange: (review: ClipReview, field: "eligibility" | "other") => void;
  onSubmit: () => void;
}

export function DetectionPreview({
  formId,
  idPrefix,
  review,
  errors,
  disabled,
  onChange,
  onSubmit,
}: DetectionPreviewProps) {
  const set = (patch: Partial<ClipReview>, field: "eligibility" | "other" = "other") => {
    onChange({ ...review, ...patch }, field);
  };
  const missing = new Set(review.missing);

  return (
    <form
      id={formId}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-4"
    >
      <p className="text-[13px] text-text-muted">
        Detected {review.detectedCount} of {review.trackedCount} fields. Check them, then save.
        Nothing is stored until you do.
      </p>
      {review.missing.length > 0 && (
        <p className="rounded-[10px] border border-border-strong bg-surface-2 px-3 py-2.5 text-[12.5px] text-text-muted">
          <span className="text-text">Missing: </span>
          {review.missing.join(", ")}
        </p>
      )}

      <ManualEntryForm
        formId={`${formId}-fields`}
        idPrefix={idPrefix}
        values={{
          title: review.title,
          company: review.company,
          url: review.url,
          deadlineDate: review.deadlineDate,
          deadlineTime: review.deadlineTime,
        }}
        errors={errors}
        disabled={disabled}
        onChange={(field, value) => set({ [field]: value })}
        onSubmit={onSubmit}
        embedded
      />
      {review.deadlineEvidence && review.deadlineDate === review.detectedDeadlineDate && (
        <p className="-mt-2 text-[12.5px] text-text-muted">
          From page: "{review.deadlineEvidence}"
        </p>
      )}

      <SelectField
        id={`${idPrefix}-eligibility`}
        label="India eligibility"
        value={review.eligibility}
        options={ELIGIBILITY_OPTIONS}
        disabled={disabled}
        hint={
          missing.has("Work arrangement") && review.eligibility === "unknown"
            ? "Verify manually. A Remote label alone is not treated as India-eligible."
            : review.eligibilityReasons[0]
        }
        onChange={(event) =>
          set({ eligibility: event.target.value as ClipReview["eligibility"] }, "eligibility")
        }
      />
      {review.eligibilityReasons.length > 1 && (
        <ul className="-mt-2 list-disc pl-4 text-[12.5px] text-text-muted">
          {review.eligibilityReasons.slice(1).map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}

      <details className="rounded-[10px] border border-border bg-surface-1 px-3 py-2">
        <summary className="cursor-pointer text-[13px] font-medium text-text">More details</summary>
        <div className="mt-3 flex flex-col gap-4 pb-2">
          <TextField
            id={`${idPrefix}-location`}
            label="Location"
            optional
            value={review.location}
            disabled={disabled}
            hint={missing.has("Location") ? "Missing" : undefined}
            onChange={(event) => set({ location: event.target.value })}
          />
          <SelectField
            id={`${idPrefix}-arrangement`}
            label="Work arrangement"
            value={review.workArrangement}
            options={ARRANGEMENT_OPTIONS}
            disabled={disabled}
            hint={missing.has("Work arrangement") ? "Missing" : undefined}
            onChange={(event) =>
              set({ workArrangement: event.target.value as ClipReview["workArrangement"] })
            }
          />
          <SelectField
            id={`${idPrefix}-employment`}
            label="Employment type"
            value={review.employmentType}
            options={EMPLOYMENT_OPTIONS}
            disabled={disabled}
            hint={missing.has("Employment type") ? "Missing" : undefined}
            onChange={(event) =>
              set({ employmentType: event.target.value as ClipReview["employmentType"] })
            }
          />
          <TextField
            id={`${idPrefix}-experience`}
            label="Experience"
            optional
            value={review.experience}
            disabled={disabled}
            hint={missing.has("Experience") ? "Missing" : undefined}
            onChange={(event) => set({ experience: event.target.value })}
          />
          <TextField
            id={`${idPrefix}-compensation`}
            label="Salary or stipend"
            optional
            value={review.compensation}
            disabled={disabled}
            hint={missing.has("Salary") ? "Missing" : undefined}
            onChange={(event) => set({ compensation: event.target.value })}
          />
          <TextField
            id={`${idPrefix}-skills`}
            label="Skills"
            optional
            value={review.skills}
            disabled={disabled}
            hint={missing.has("Skills") ? "Missing" : undefined}
            onChange={(event) => set({ skills: event.target.value })}
          />
          <TextAreaField
            id={`${idPrefix}-description`}
            label="Description"
            optional
            rows={5}
            value={review.description}
            disabled={disabled}
            onChange={(event) => set({ description: event.target.value })}
          />
          {missing.has("Description") && (
            <p className="-mt-2 text-[12.5px] text-text-muted">Missing</p>
          )}
        </div>
      </details>
    </form>
  );
}
