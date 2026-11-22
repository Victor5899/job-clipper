import { useEffect, useState } from "react";
import type { JobFormErrors, JobFormValues } from "../../core/model/jobForm";
import { jobToForm } from "../../core/model/jobForm";
import { deadlineEnd, SOON_DELAY_MS } from "../../core/reminders/computeRemindAt";
import type { JobApplication } from "../../core/model/types";
import {
  DuplicateJobError,
  JobConflictError,
  JobValidationError,
  ReminderNotAvailableError,
  deleteJob,
  scheduleReminderSoon,
  updateJob,
} from "../../storage/jobRepository";
import { useNow } from "../../ui/hooks/useNow";
import { Button } from "../../ui/components/Button";
import { ConfirmDialog } from "../../ui/components/ConfirmDialog";
import { Drawer } from "../../ui/components/Drawer";
import { JobDetails } from "./JobDetails";
import { JobForm, focusFirstJobError } from "./JobForm";

const FORM_ID = "edit-application-form";

function RemindSoon({ job }: { job: JobApplication }) {
  const now = useNow();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const end = deadlineEnd(job.deadline);
  const available = Boolean(end && end.getTime() - now.getTime() > SOON_DELAY_MS);
  if (!available && !message) return null;

  const schedule = () => {
    setPending(true);
    setError(null);
    scheduleReminderSoon(job.id, new Date(), { expectedUpdatedAt: job.updatedAt })
      .then(() => setMessage("Reminder set for about one minute from now."))
      .catch((caught: unknown) => {
        if (caught instanceof ReminderNotAvailableError) {
          setError("Add a deadline that is still ahead before setting a reminder.");
        } else if (caught instanceof JobConflictError) {
          setError(
            "This application was updated somewhere else. Close the sheet and open it again.",
          );
        } else {
          setError("Couldn't set the reminder. Please try again.");
        }
      })
      .finally(() => setPending(false));
  };

  return (
    <div className="mt-4 flex flex-col items-start gap-2">
      {available && (
        <Button variant="ghost" size="sm" disabled={pending} onClick={schedule}>
          {pending ? "Setting reminder…" : "Remind me in 1 minute"}
        </Button>
      )}
      {message && <p className="text-[12.5px] text-text-muted">{message}</p>}
      {error && (
        <p role="alert" className="text-[12.5px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

interface JobDrawerProps {
  job: JobApplication | null;
  editing: boolean;
  onClose: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdated: (job: JobApplication) => void;
  onDeleted: (job: JobApplication) => void;
}

function JobEditor({
  job,
  onCancel,
  onUpdated,
}: {
  job: JobApplication;
  onCancel: () => void;
  onUpdated: (job: JobApplication) => void;
}) {
  const [values, setValues] = useState<JobFormValues>(() => jobToForm(job));
  const [errors, setErrors] = useState<JobFormErrors>({});
  const [baseUpdatedAt, setBaseUpdatedAt] = useState(job.updatedAt);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);

  useEffect(() => {
    document.getElementById("edit-title")?.focus();
  }, []);

  const save = async (allowDuplicate = false) => {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateJob(job.id, values, new Date(), {
        allowDuplicate,
        expectedUpdatedAt: baseUpdatedAt,
      });
      onUpdated(updated);
    } catch (error) {
      if (error instanceof JobValidationError) {
        setErrors(error.errors);
        focusFirstJobError(error.errors);
      } else if (error instanceof DuplicateJobError) {
        setSaveError(
          `Already saved: ${error.matches[0]?.job.title ?? "another application"} uses this link. Save anyway only if you want both.`,
        );
      } else if (error instanceof JobConflictError) {
        setConflict(true);
        setSaveError(
          "This application was updated somewhere else. Your latest edits were not saved.",
        );
      } else {
        setSaveError("Couldn't save these changes. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <JobForm
        formId={FORM_ID}
        values={values}
        errors={errors}
        disabled={saving}
        onChange={(field, value) => {
          setValues((current) => ({ ...current, [field]: value }));
          setErrors((current) => {
            if (!(field in current)) return current;
            const next = { ...current };
            delete next[field];
            return next;
          });
          setSaveError(null);
        }}
        onSubmit={() => void save(false)}
      />
      {saveError && (
        <p role="alert" className="mt-4 text-[12.5px] text-danger">
          {saveError}
        </p>
      )}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {conflict ? (
          <Button
            variant="primary"
            onClick={() => {
              setValues(jobToForm(job));
              setBaseUpdatedAt(job.updatedAt);
              setErrors({});
              setConflict(false);
              setSaveError(null);
            }}
          >
            Show the latest version
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            {saveError?.startsWith("Already saved") && (
              <Button variant="ghost" onClick={() => void save(true)} disabled={saving}>
                Save anyway
              </Button>
            )}
            <Button type="submit" form={FORM_ID} variant="primary" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </>
        )}
      </div>
    </>
  );
}

export function JobDrawer({
  job,
  editing,
  onClose,
  onEdit,
  onCancelEdit,
  onUpdated,
  onDeleted,
}: JobDrawerProps) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const remove = async () => {
    if (!job) return;
    setDeleting(true);
    try {
      await deleteJob(job.id);
      setConfirming(false);
      onDeleted(job);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Drawer
        open={job !== null}
        title={job?.title ?? "Application"}
        titleId="job-drawer-title"
        description={editing ? job?.company : undefined}
        onClose={onClose}
        footer={
          job && !editing ? (
            <>
              <Button variant="danger" onClick={() => setConfirming(true)}>
                Delete
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  chrome.tabs.create({ url: job.url }).catch(() => {});
                }}
              >
                Open listing
              </Button>
              <Button variant="primary" onClick={onEdit}>
                Edit
              </Button>
            </>
          ) : undefined
        }
      >
        {job && !editing && (
          <>
            <JobDetails job={job} />
            <RemindSoon key={job.id} job={job} />
          </>
        )}
        {job && editing && (
          <JobEditor key={job.id} job={job} onCancel={onCancelEdit} onUpdated={onUpdated} />
        )}
      </Drawer>
      <ConfirmDialog
        open={confirming && job !== null}
        title="Delete this application?"
        titleId="delete-application-title"
        description={
          job ? (
            <>
              <span className="text-text">{job.title}</span> at {job.company} will be removed from
              this device. This can't be undone.
            </>
          ) : null
        }
        confirmLabel={deleting ? "Deleting…" : "Delete application"}
        busy={deleting}
        onConfirm={() => void remove()}
        onClose={() => setConfirming(false)}
      />
    </>
  );
}
