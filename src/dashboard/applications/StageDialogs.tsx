import { useId, useState } from "react";
import { RESULT_LABELS, RESULT_OUTCOMES, type ResultOutcome } from "../../core/model/enums";
import { Button } from "../../ui/components/Button";
import { Dialog } from "../../ui/components/Dialog";
import { TextField } from "../../ui/components/TextField";

export function OutcomePicker({
  open,
  jobTitle,
  onChoose,
  onClose,
}: {
  open: boolean;
  jobTitle: string;
  onChoose: (result: ResultOutcome) => void;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      title="Record an outcome"
      titleId="outcome-title"
      description={`How did “${jobTitle}” turn out? You can leave this unset and choose later.`}
      onClose={onClose}
      footer={
        <>
          {RESULT_OUTCOMES.map((outcome) => (
            <Button
              key={outcome}
              variant={outcome === "selected" ? "primary" : "ghost"}
              onClick={() => onChoose(outcome)}
            >
              {RESULT_LABELS[outcome]}
            </Button>
          ))}
          <Button variant="quiet" onClick={onClose}>
            Leave unset
          </Button>
        </>
      }
    >
      <p className="text-sm text-text-muted">
        Selected, Rejected, Withdrawn or No response. The card stays in Result either way.
      </p>
    </Dialog>
  );
}

export function InterviewDateDialog({
  open,
  jobTitle,
  onSave,
  onClose,
}: {
  open: boolean;
  jobTitle: string;
  onSave: (date: string) => Promise<void>;
  onClose: () => void;
}) {
  const fieldId = useId();
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    setDate("");
    setError(undefined);
    setSaving(false);
  }

  const save = async () => {
    if (!date) {
      setError("Enter a date, or skip.");
      return;
    }
    setSaving(true);
    try {
      await onSave(date);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't save that date.");
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      title="Add an interview date"
      titleId="interview-date-title"
      description={`Optional for “${jobTitle}”. Skip this if you don't have a date yet.`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Skip
          </Button>
          <Button variant="primary" onClick={() => void save()} disabled={saving}>
            Save date
          </Button>
        </>
      }
    >
      <TextField
        id={fieldId}
        label="Interview date"
        type="date"
        optional
        value={date}
        error={error}
        onChange={(event) => {
          setDate(event.target.value);
          setError(undefined);
        }}
      />
    </Dialog>
  );
}
