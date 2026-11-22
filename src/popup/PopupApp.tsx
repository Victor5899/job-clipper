import { LayoutDashboard } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CLASSIFIER_VERSION } from "../core/eligibility/classify";
import {
  buildClipReview,
  refreshEligibility,
  reviewToJobForm,
  type ClipReview,
} from "../core/extraction/review";
import type { FieldSource } from "../core/extraction/types";
import { SOURCE_LABELS } from "../core/model/enums";
import type { JobFormErrors } from "../core/model/jobForm";
import { validateJobForm } from "../core/model/jobForm";
import {
  clearFieldError,
  validateManualEntry,
  type ManualEntryErrors,
  type ManualEntryValues,
} from "../core/model/manualEntry";
import type { JobApplication } from "../core/model/types";
import type { DuplicateMatch } from "../core/duplicates";
import { requestExtraction } from "../messaging/client";
import {
  createJob,
  createReviewedJob,
  DuplicateJobError,
  findManualDuplicates,
  JobValidationError,
  ManualEntryValidationError,
} from "../storage/jobRepository";
import { clearDraft, loadDraft, saveDraft } from "../storage/popupDraft";
import { getSettings } from "../storage/settingsRepository";
import { BrandLockup } from "../ui/components/BrandMark";
import { DuplicateNotice } from "../ui/components/DuplicateNotice";
import { focusFirstError } from "../ui/components/ManualEntryForm";
import { CLIP_FIELD_PREFIX, ClipForm } from "./ClipForm";
import { openDashboard } from "./openDashboard";
import { SavedState } from "./SavedState";
import { getActiveTab, tabContextFrom, type TabContext } from "./tabContext";

type Phase = { kind: "loading" } | { kind: "editing" } | { kind: "saved"; job: JobApplication };

function manualFrom(review: ClipReview): ManualEntryValues {
  return {
    title: review.title,
    company: review.company,
    url: review.url,
    deadlineDate: review.deadlineDate,
    deadlineTime: review.deadlineTime,
  };
}

function noticeFor(payload: Awaited<ReturnType<typeof requestExtraction>>): string | null {
  if (!payload.ok) {
    if (payload.reason === "unavailable") return null;
    return "Couldn't read this page. Enter the details yourself.";
  }
  if (payload.mode === "detected") return null;
  if (payload.reason === "not-job-page" || payload.reason === "empty") {
    return "This doesn't look like a job listing. You can still enter it yourself.";
  }
  return null;
}

function manualErrors(errors: JobFormErrors): ManualEntryErrors {
  const next: ManualEntryErrors = {};
  if (errors.title) next.title = errors.title;
  if (errors.company) next.company = errors.company;
  if (errors.url) next.url = errors.url;
  if (errors.deadlineDate) next.deadlineDate = errors.deadlineDate;
  if (errors.deadlineTime) next.deadlineTime = errors.deadlineTime;
  return next;
}

function sourcesAfterEdit(
  current: ClipReview,
  initial: ClipReview | null,
): Record<string, FieldSource> {
  const sources: Record<string, FieldSource> = { ...current.fieldSources };
  if (!initial) return sources;
  const pairs: [string, string, string][] = [
    ["title", current.title, initial.title],
    ["company", current.company, initial.company],
    ["locationRaw", current.location, initial.location],
    ["experienceRaw", current.experience, initial.experience],
    ["compensationRaw", current.compensation, initial.compensation],
    ["description", current.description, initial.description],
    ["skills", current.skills, initial.skills],
  ];
  for (const [key, value, original] of pairs) {
    if (value !== original) sources[key] = "user";
  }
  if (current.workArrangement !== initial.workArrangement) sources.workArrangement = "user";
  if (current.employmentType !== initial.employmentType) sources.employmentType = "user";
  if (current.deadlineDate !== initial.deadlineDate) sources.deadline = "user";
  return sources;
}

export function PopupApp() {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [context, setContext] = useState<TabContext>(() => tabContextFrom(undefined));
  const [values, setValues] = useState<ManualEntryValues>(context.prefill);
  const [review, setReview] = useState<ClipReview | null>(null);
  const [eligibilityDirty, setEligibilityDirty] = useState(false);
  const [errors, setErrors] = useState<ManualEntryErrors>({});
  const [draftRestored, setDraftRestored] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[] | null>(null);
  const [graduationYear, setGraduationYear] = useState(2027);
  const initialReview = useRef<ClipReview | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const tab = await getActiveTab();
      const tabContext = tabContextFrom(tab);
      const [draft, settings] = await Promise.all([
        loadDraft(tabContext.tabId).catch(() => undefined),
        getSettings().catch(() => undefined),
      ]);
      if (cancelled) return;
      const year = settings?.profile.graduationYear ?? 2027;
      setGraduationYear(year);
      setContext(tabContext);

      if (draft?.review) {
        initialReview.current = draft.review;
        setReview(draft.review);
        setValues(draft.values);
        setDraftRestored(true);
        setPhase({ kind: "editing" });
        return;
      }
      if (draft) {
        setValues(draft.values);
        setDraftRestored(true);
        setPhase({ kind: "editing" });
        return;
      }

      setValues(tabContext.prefill);
      if (!tabContext.restricted && tabContext.tabId !== undefined) {
        const payload = await requestExtraction(tabContext.tabId);
        if (cancelled) return;
        if (payload.ok && payload.mode === "detected") {
          const next = buildClipReview(payload, year);
          initialReview.current = next;
          setReview(next);
          setValues(manualFrom(next));
        } else {
          setNotice(noticeFor(payload));
        }
      }
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
    saveDraft(context.tabId, next).catch(() => {});
  };

  const handleReviewChange = (next: ClipReview, field: "eligibility" | "other") => {
    const dirty = eligibilityDirty || field === "eligibility";
    if (field === "eligibility") setEligibilityDirty(true);
    const refreshed = refreshEligibility(
      { ...next, category: next.category },
      graduationYear,
      dirty,
    );
    setReview(refreshed);
    setValues(manualFrom(refreshed));
    setErrors({});
    setSaveError(null);
    saveDraft(context.tabId, manualFrom(refreshed), new Date(), refreshed).catch(() => {});
  };

  const handleSubmit = async (allowDuplicate = false) => {
    setSaving(true);
    setSaveError(null);
    try {
      if (review) {
        const form = reviewToJobForm(review);
        const validated = validateJobForm(form);
        if (!validated.ok) {
          setErrors(manualErrors(validated.errors));
          const extra = Object.values(validated.errors).find(Boolean);
          if (extra && !manualErrors(validated.errors).title) setSaveError(extra);
          focusFirstError(CLIP_FIELD_PREFIX, manualErrors(validated.errors));
          return;
        }
        const entry = manualFrom(review);
        if (!allowDuplicate) {
          const matches = await findManualDuplicates(entry);
          if (matches.length > 0) {
            setDuplicates(matches);
            return;
          }
        }
        const now = new Date();
        const unchangedDeadline =
          review.deadlineDate.length > 0 &&
          review.deadlineDate === review.detectedDeadlineDate &&
          review.deadlineTime.length === 0;
        const overridden = review.eligibility !== review.suggestedEligibility;
        const job = await createReviewedJob(
          form,
          {
            now,
            deadlineOrigin: unchangedDeadline ? "page_label" : "user",
            ...(unchangedDeadline && review.deadlineEvidence
              ? { deadlineEvidence: review.deadlineEvidence }
              : {}),
            eligibility: {
              value: review.eligibility,
              confidence: overridden ? "high" : review.eligibilityConfidence,
              reasons: overridden
                ? ["You corrected this before saving."]
                : review.eligibilityReasons,
              overridden,
              classifierVersion: CLASSIFIER_VERSION,
            },
            extraction: {
              adapter: review.adapter,
              adapterVersion: review.adapterVersion,
              extractedAt: now.toISOString(),
              fieldSources: sourcesAfterEdit(review, initialReview.current),
            },
          },
          { allowDuplicate },
        );
        await clearDraft(context.tabId).catch(() => {});
        setDuplicates(null);
        setPhase({ kind: "saved", job });
        return;
      }

      const result = validateManualEntry(values);
      if (!result.ok) {
        setErrors(result.errors);
        focusFirstError(CLIP_FIELD_PREFIX, result.errors);
        return;
      }
      if (!allowDuplicate) {
        const matches = await findManualDuplicates(values);
        if (matches.length > 0) {
          setDuplicates(matches);
          return;
        }
      }
      const job = await createJob(values, new Date(), { allowDuplicate });
      await clearDraft(context.tabId).catch(() => {});
      setDuplicates(null);
      setPhase({ kind: "saved", job });
    } catch (error) {
      if (error instanceof ManualEntryValidationError) setErrors(error.errors);
      else if (error instanceof JobValidationError) setErrors(manualErrors(error.errors));
      else if (error instanceof DuplicateJobError) setDuplicates(error.matches);
      else setSaveError("Couldn't save this job. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleClipAnother = () => {
    setValues(context.prefill);
    setReview(null);
    setEligibilityDirty(false);
    initialReview.current = null;
    setErrors({});
    setDraftRestored(false);
    setDuplicates(null);
    setPhase({ kind: "editing" });
  };

  const handleOpenDashboard = () => {
    openDashboard().catch(() => setSaveError("Couldn't open the dashboard."));
  };

  const badge = review ? (SOURCE_LABELS[review.source] ?? "Detected") : "Manual entry";

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
            {badge}
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
          Reading this page…
        </p>
      )}
      {phase.kind === "editing" && duplicates && (
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <DuplicateNotice
            matches={duplicates}
            onOpen={(job) => {
              openDashboard({ jobId: job.id }).catch(() =>
                setSaveError("Couldn't open the dashboard."),
              );
            }}
            onUpdate={(job) => {
              openDashboard({ jobId: job.id, edit: true }).catch(() =>
                setSaveError("Couldn't open the dashboard."),
              );
            }}
            onSaveAnyway={() => void handleSubmit(true)}
            onBack={() => setDuplicates(null)}
          />
        </div>
      )}
      {phase.kind === "editing" && !duplicates && (
        <ClipForm
          values={values}
          errors={errors}
          restricted={context.restricted}
          draftRestored={draftRestored}
          notice={notice}
          review={review}
          saving={saving}
          saveError={saveError}
          onChange={handleChange}
          onReviewChange={handleReviewChange}
          onSubmit={() => void handleSubmit(false)}
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
