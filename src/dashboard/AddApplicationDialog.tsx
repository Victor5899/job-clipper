import { useState } from "react";
import {
  clearFieldError,
  EMPTY_MANUAL_ENTRY,
  validateManualEntry,
  type ManualEntryErrors,
  type ManualEntryValues,
} from "../core/model/manualEntry";
import type { JobApplication } from "../core/model/types";
import { createJob, ManualEntryValidationError } from "../storage/jobRepository";
import { Button } from "../ui/components/Button";
import { Dialog } from "../ui/components/Dialog";
import { focusFirstError, ManualEntryForm } from "../ui/components/ManualEntryForm";

const FORM_ID = "add-application-form";
const FIELD_PREFIX = "add";

interface AddApplicationDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: (job: JobApplication) => void;
}

/** Manual entry without any job page: the dashboard counterpart of the popup form. */
export function AddApplicationDialog({ open, onClose, onSaved }: AddApplicationDialogProps) {
  const [values, setValues] = useState<ManualEntryValues>(EMPTY_MANUAL_ENTRY);
  const [errors, setErrors] = useState<ManualEntryErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const reset = () => {
    setValues(EMPTY_MANUAL_ENTRY);
    setErrors({});
    setSaveError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    const result = validateManualEntry(values);
    if (!result.ok) {
      setErrors(result.errors);
      focusFirstError(FIELD_PREFIX, result.errors);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const job = await createJob(values);
      reset();
      onSaved(job);
    } catch (error) {
      if (error instanceof ManualEntryValidationError) setErrors(error.errors);
      else setSaveError("Couldn't save this application. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Add an application"
      titleId="add-application-title"
      description="Job title, company and link are required. The deadline is optional."
      footer={
        <>
          {saveError && (
            <p role="alert" className="mr-auto self-center text-[12.5px] text-danger">
              {saveError}
            </p>
          )}
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} variant="primary" disabled={saving}>
            {saving ? "Saving…" : "Save application"}
          </Button>
        </>
      }
    >
      <ManualEntryForm
        formId={FORM_ID}
        idPrefix={FIELD_PREFIX}
        values={values}
        errors={errors}
        disabled={saving}
        onChange={(field, value) => {
          setValues((previous) => ({ ...previous, [field]: value }));
          setErrors((previous) => clearFieldError(previous, field));
        }}
        onSubmit={handleSubmit}
      />
    </Dialog>
  );
}
