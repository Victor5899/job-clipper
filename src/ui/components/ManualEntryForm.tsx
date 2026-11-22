import type { FormEvent } from "react";
import type { ManualEntryErrors, ManualEntryValues } from "../../core/model/manualEntry";
import { MAX_COMPANY_LENGTH, MAX_TITLE_LENGTH } from "../../core/model/manualEntry";
import { MAX_URL_LENGTH } from "../../core/normalize/url";
import { TextField } from "./TextField";

export const MANUAL_ENTRY_FIELDS: (keyof ManualEntryValues)[] = [
  "title",
  "company",
  "url",
  "deadlineDate",
  "deadlineTime",
];

export function fieldId(idPrefix: string, field: keyof ManualEntryValues): string {
  return `${idPrefix}-${field}`;
}

/** Moves focus to the first invalid field so keyboard and screen-reader users land on the problem. */
export function focusFirstError(idPrefix: string, errors: ManualEntryErrors): void {
  const first = MANUAL_ENTRY_FIELDS.find((field) => errors[field]);
  if (first) document.getElementById(fieldId(idPrefix, first))?.focus();
}

interface ManualEntryFormProps {
  formId: string;
  idPrefix: string;
  values: ManualEntryValues;
  errors: ManualEntryErrors;
  disabled?: boolean;
  onChange: (field: keyof ManualEntryValues, value: string) => void;
  onSubmit: () => void;
}

/** The manual job entry fields shared by the popup and the dashboard "Add application" dialog. */
export function ManualEntryForm({
  formId,
  idPrefix,
  values,
  errors,
  disabled,
  onChange,
  onSubmit,
}: ManualEntryFormProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };
  const bind = (field: keyof ManualEntryValues) => ({
    id: fieldId(idPrefix, field),
    name: field,
    value: values[field],
    error: errors[field],
    disabled,
    onChange: (event: { target: { value: string } }) => onChange(field, event.target.value),
  });

  return (
    <form id={formId} noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <TextField
        {...bind("title")}
        label="Job title"
        required
        maxLength={MAX_TITLE_LENGTH}
        autoComplete="off"
        placeholder="e.g. Data Engineering Intern"
      />
      <TextField
        {...bind("company")}
        label="Company"
        required
        maxLength={MAX_COMPANY_LENGTH}
        autoComplete="organization"
        placeholder="e.g. Zomato"
      />
      <TextField
        {...bind("url")}
        label="Job URL"
        type="url"
        inputMode="url"
        required
        maxLength={MAX_URL_LENGTH}
        autoComplete="url"
        placeholder="https://"
      />
      <fieldset className="flex flex-col gap-1.5">
        <legend className="sr-only">Application deadline</legend>
        <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-3">
          <TextField {...bind("deadlineDate")} label="Deadline" type="date" optional />
          <TextField {...bind("deadlineTime")} label="Time" type="time" optional />
        </div>
        {!values.deadlineDate && !errors.deadlineDate && (
          <p className="text-[12.5px] text-text-muted">No deadline provided</p>
        )}
      </fieldset>
    </form>
  );
}
