import type { FormEvent, ReactNode } from "react";
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
} from "../../core/model/enums";
import {
  JOB_FORM_FIELDS,
  MAX_DESCRIPTION_LENGTH,
  MAX_NOTES_LENGTH,
  type JobFormErrors,
  type JobFormValues,
} from "../../core/model/jobForm";
import { MAX_COMPANY_LENGTH, MAX_TITLE_LENGTH } from "../../core/model/manualEntry";
import { SelectField } from "../../ui/components/SelectField";
import { TextAreaField } from "../../ui/components/TextAreaField";
import { TextField } from "../../ui/components/TextField";

const PREFIX = "edit";

function choices(labels: Record<string, string>) {
  return Object.entries(labels).map(([value, label]) => ({ value, label }));
}

export function focusFirstJobError(errors: JobFormErrors): void {
  const first = JOB_FORM_FIELDS.find((field) => errors[field]);
  if (first) document.getElementById(`${PREFIX}-${first}`)?.focus();
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-border pt-5 first:border-t-0 first:pt-0">
      <h3 className="micro-label text-text-subtle">{title}</h3>
      {children}
    </section>
  );
}

interface JobFormProps {
  formId: string;
  values: JobFormValues;
  errors: JobFormErrors;
  disabled?: boolean;
  onChange: (field: keyof JobFormValues, value: string) => void;
  onSubmit: () => void;
}

export function JobForm({ formId, values, errors, disabled, onChange, onSubmit }: JobFormProps) {
  const field = (name: keyof JobFormValues) => ({
    id: `${PREFIX}-${name}`,
    value: values[name],
    error: errors[name],
    disabled,
    onChange: (event: { target: { value: string } }) => onChange(name, event.target.value),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-5">
      <Section title="Basics">
        <TextField
          label="Job title"
          required
          maxLength={MAX_TITLE_LENGTH}
          autoComplete="off"
          {...field("title")}
        />
        <TextField
          label="Company"
          required
          maxLength={MAX_COMPANY_LENGTH}
          autoComplete="organization"
          {...field("company")}
        />
        <TextField
          label="Job URL"
          required
          type="url"
          inputMode="url"
          maxLength={2048}
          {...field("url")}
        />
        <SelectField label="Source" options={choices(SOURCE_LABELS)} {...field("source")} />
        <TextAreaField
          label="Description"
          optional
          maxLength={MAX_DESCRIPTION_LENGTH}
          {...field("description")}
        />
        <TextField label="Company website" optional type="url" {...field("companyWebsite")} />
      </Section>

      <Section title="Location and eligibility">
        <TextField label="Location" optional {...field("locationRaw")} />
        <TextField label="City" optional {...field("city")} />
        <TextField label="Country" optional {...field("country")} />
        <TextField label="Country code" optional maxLength={2} {...field("countryCode")} />
        <SelectField
          label="Work arrangement"
          options={choices(WORK_ARRANGEMENT_LABELS)}
          {...field("workArrangement")}
        />
        <TextField
          label="Eligible countries"
          optional
          hint="Comma-separated, for example IN, Worldwide"
          {...field("eligibleCountries")}
        />
        <SelectField
          label="India eligibility"
          options={choices(ELIGIBILITY_LABELS)}
          hint="Set by you. Nothing is classified automatically."
          {...field("eligibility")}
        />
        <TextField label="Work authorisation" optional {...field("workAuthorization")} />
        <SelectField
          label="Visa sponsorship"
          options={choices(VISA_LABELS)}
          {...field("visaSponsorship")}
        />
        <SelectField
          label="Who can apply"
          options={choices(STUDENT_LABELS)}
          {...field("studentEligibility")}
        />
        <TextField
          label="Graduation years"
          optional
          hint="Comma-separated, for example 2026, 2027"
          {...field("graduationYears")}
        />
      </Section>

      <Section title="Employment">
        <SelectField
          label="Employment type"
          options={choices(EMPLOYMENT_LABELS)}
          {...field("employmentType")}
        />
        <SelectField label="Category" options={choices(CATEGORY_LABELS)} {...field("category")} />
        <TextField label="Experience" optional {...field("experienceRaw")} />
        <SelectField
          label="Experience level"
          options={choices(EXPERIENCE_LABELS)}
          {...field("experienceLevel")}
        />
        <TextField label="Minimum years" optional inputMode="decimal" {...field("minYears")} />
        <TextField label="Maximum years" optional inputMode="decimal" {...field("maxYears")} />
        <TextField label="Pay" optional {...field("compensationRaw")} />
        <TextField label="Currency" optional maxLength={8} {...field("currency")} />
        <TextField label="Minimum pay" optional inputMode="decimal" {...field("compensationMin")} />
        <TextField label="Maximum pay" optional inputMode="decimal" {...field("compensationMax")} />
        <SelectField
          label="Pay period"
          options={choices(PERIOD_LABELS)}
          {...field("compensationPeriod")}
        />
        <SelectField
          label="Pay type"
          options={choices(KIND_LABELS)}
          {...field("compensationKind")}
        />
        <TextField label="Skills" optional hint="Comma-separated" {...field("skills")} />
      </Section>

      <Section title="Tracking">
        <SelectField label="Status" options={choices(STATUS_LABELS)} {...field("status")} />
        {values.status === "result" && (
          <SelectField
            label="Result"
            options={[{ value: "", label: "Choose a result" }, ...choices(RESULT_LABELS)]}
            {...field("result")}
          />
        )}
        <TextField label="Applied on" optional type="date" {...field("appliedDate")} />
        <TextField label="Interview on" optional type="date" {...field("interviewDate")} />
        <TextField label="Deadline" optional type="date" {...field("deadlineDate")} />
        <TextField label="Deadline time" optional type="time" {...field("deadlineTime")} />
        {!values.deadlineDate && (
          <p className="text-[12.5px] text-text-muted">No deadline provided</p>
        )}
        <TextAreaField label="Notes" optional maxLength={MAX_NOTES_LENGTH} {...field("notes")} />
      </Section>

      <Section title="Contact">
        <TextField label="Name" optional {...field("contactName")} />
        <TextField label="Email" optional type="email" {...field("contactEmail")} />
        <TextField label="Phone" optional type="tel" {...field("contactPhone")} />
        <TextField label="Profile URL" optional type="url" {...field("contactProfileUrl")} />
      </Section>
    </form>
  );
}
