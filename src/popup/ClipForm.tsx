import { Info } from "lucide-react";
import type { ManualEntryErrors, ManualEntryValues } from "../core/model/manualEntry";
import { Button } from "../ui/components/Button";
import { ManualEntryForm } from "../ui/components/ManualEntryForm";

export const CLIP_FORM_ID = "clip-form";
export const CLIP_FIELD_PREFIX = "clip";

interface ClipFormProps {
  values: ManualEntryValues;
  errors: ManualEntryErrors;
  restricted: boolean;
  draftRestored: boolean;
  saving: boolean;
  saveError: string | null;
  onChange: (field: keyof ManualEntryValues, value: string) => void;
  onSubmit: () => void;
  onOpenDashboard: () => void;
}

export function ClipForm({
  values,
  errors,
  restricted,
  draftRestored,
  saving,
  saveError,
  onChange,
  onSubmit,
  onOpenDashboard,
}: ClipFormProps) {
  return (
    <>
      <main className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-6">
        <h1 className="font-serif text-[30px] leading-[1.05] text-text">
          Clip this <em className="text-accent">job</em>
        </h1>
        <p className="mt-1.5 text-[13px] text-text-muted">
          Enter the details below. Everything stays on this device.
        </p>

        {(restricted || draftRestored) && (
          <div className="mt-4 flex flex-col gap-2">
            {restricted && (
              <p className="flex gap-2 rounded-[10px] border border-border-strong bg-surface-2 px-3 py-2.5 text-[12.5px] text-text-muted">
                <Info size={15} className="mt-px shrink-0 text-info" aria-hidden="true" />
                This tab isn't a regular web page, so nothing was prefilled. Paste the job link
                yourself.
              </p>
            )}
            {draftRestored && (
              <p
                role="status"
                className="flex gap-2 rounded-[10px] border border-olive/60 bg-olive-surface px-3 py-2.5 text-[12.5px] text-text"
              >
                <Info size={15} className="mt-px shrink-0 text-accent" aria-hidden="true" />
                Restored your unsaved entry.
              </p>
            )}
          </div>
        )}

        <div className="mt-5">
          <ManualEntryForm
            formId={CLIP_FORM_ID}
            idPrefix={CLIP_FIELD_PREFIX}
            values={values}
            errors={errors}
            disabled={saving}
            onChange={onChange}
            onSubmit={onSubmit}
          />
        </div>
      </main>

      <footer className="sticky bottom-0 flex flex-col gap-2 border-t border-border bg-surface-1/95 px-5 py-4 backdrop-blur">
        {saveError && (
          <p role="alert" className="text-[12.5px] text-danger">
            {saveError}
          </p>
        )}
        <div className="flex gap-2">
          <Button
            type="submit"
            form={CLIP_FORM_ID}
            variant="primary"
            className="flex-1"
            disabled={saving}
          >
            {saving ? "Saving…" : "Save to Job Clipper"}
          </Button>
          <Button variant="ghost" onClick={onOpenDashboard}>
            Open dashboard
          </Button>
        </div>
      </footer>
    </>
  );
}
