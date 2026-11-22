import { LayoutDashboard } from "lucide-react";
import { useEffect, useState } from "react";
import {
  clearFieldError,
  validateManualEntry,
  type ManualEntryErrors,
  type ManualEntryValues,
} from "../core/model/manualEntry";
import type { JobApplication } from "../core/model/types";
import { createJob, ManualEntryValidationError } from "../storage/jobRepository";
import { clearDraft, loadDraft, saveDraft } from "../storage/popupDraft";
import { BrandLockup } from "../ui/components/BrandMark";
import { focusFirstError } from "../ui/components/ManualEntryForm";
import { CLIP_FIELD_PREFIX, ClipForm } from "./ClipForm";
import { openDashboard } from "./openDashboard";
import { SavedState } from "./SavedState";
import { getActiveTab, tabContextFrom, type TabContext } from "./tabContext";

type Phase = { kind: "loading" } | { kind: "editing" } | { kind: "saved"; job: JobApplication };

export function PopupApp() {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [context, setContext] = useState<TabContext>(() => tabContextFrom(undefined));
  const [values, setValues] = useState<ManualEntryValues>(context.prefill);
  const [errors, setErrors] = useState<ManualEntryErrors>({});
  const [draftRestored, setDraftRestored] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const tabContext = tabContextFrom(await getActiveTab());
      const draft = await loadDraft(tabContext.tabId).catch(() => undefined);
      if (cancelled) return;
      setContext(tabContext);
      setValues(draft?.values ?? tabContext.prefill);
      setDraftRestored(Boolean(draft));
      setPhase({ kind: "editing" });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (field: keyof ManualEntryValues, value: string) => {
    const next = { ...values, [field]: value };
    setValues(next);
    setErrors((previous) => clearFieldError(previous, field));
    setSaveError(null);
    // Written on every change because Chrome closes the popup as soon as it loses focus.
    saveDraft(context.tabId, next).catch(() => {});
  };

  const handleSubmit = async () => {
    const result = validateManualEntry(values);
    if (!result.ok) {
      setErrors(result.errors);
      focusFirstError(CLIP_FIELD_PREFIX, result.errors);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const job = await createJob(values);
      await clearDraft(context.tabId).catch(() => {});
      setPhase({ kind: "saved", job });
    } catch (error) {
      if (error instanceof ManualEntryValidationError) setErrors(error.errors);
      else setSaveError("Couldn't save this job. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleClipAnother = () => {
    setValues(context.prefill);
    setErrors({});
    setDraftRestored(false);
    setPhase({ kind: "editing" });
  };

  const handleOpenDashboard = () => {
    openDashboard().catch(() => setSaveError("Couldn't open the dashboard."));
  };

  return (
    <div className="relative flex h-[560px] w-[380px] flex-col overflow-hidden bg-bg">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-[radial-gradient(ellipse_at_center,rgb(198_241_53/0.14),transparent_70%)]"
      />
      <header className="relative flex items-center justify-between border-b border-border px-5 py-3.5">
        <BrandLockup />
        <div className="flex items-center gap-2">
          <span className="micro-label rounded-full border border-border-strong px-2 py-0.5 text-text-subtle">
            Manual entry
          </span>
          <button
            type="button"
            onClick={handleOpenDashboard}
            aria-label="Open dashboard"
            title="Open dashboard"
            className="grid size-8 cursor-pointer place-items-center rounded-full text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            <LayoutDashboard size={16} aria-hidden="true" />
          </button>
        </div>
      </header>

      {phase.kind === "loading" && (
        <p
          role="status"
          className="flex flex-1 items-center justify-center text-sm text-text-muted"
        >
          Loading…
        </p>
      )}
      {phase.kind === "editing" && (
        <ClipForm
          values={values}
          errors={errors}
          restricted={context.restricted}
          draftRestored={draftRestored}
          saving={saving}
          saveError={saveError}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onOpenDashboard={handleOpenDashboard}
        />
      )}
      {phase.kind === "saved" && (
        <SavedState
          job={phase.job}
          onOpenDashboard={handleOpenDashboard}
          onClipAnother={handleClipAnother}
        />
      )}
    </div>
  );
}
