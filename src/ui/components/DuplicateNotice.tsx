import { format } from "date-fns";
import type { DuplicateMatch } from "../../core/duplicates";
import { STATUS_LABELS } from "../../core/model/enums";
import type { JobApplication } from "../../core/model/types";
import { Button } from "./Button";

interface DuplicateNoticeProps {
  matches: DuplicateMatch[];
  onOpen: (job: JobApplication) => void;
  onUpdate: (job: JobApplication) => void;
  onSaveAnyway: () => void;
  onBack: () => void;
}

/** Warns before a second save. Nothing is overwritten unless the user edits that application. */
export function DuplicateNotice({
  matches,
  onOpen,
  onUpdate,
  onSaveAnyway,
  onBack,
}: DuplicateNoticeProps) {
  const primary = matches[0];
  if (!primary) return null;
  const when = format(new Date(primary.job.savedAt), "d MMM");
  const status = STATUS_LABELS[primary.job.status];
  const exact = primary.kind === "exact";

  return (
    <div className="flex flex-col gap-4">
      <p role="status" className="text-sm leading-relaxed text-text">
        {exact
          ? `Already saved on ${when} (${status}).`
          : `A similar application was saved on ${when} (${status}).`}
      </p>
      <p className="text-sm leading-relaxed text-text-muted">
        {primary.job.title} at {primary.job.company}. Saving again keeps that application as it is
        and adds a separate one.
      </p>
      {matches.length > 1 && (
        <p className="text-[12.5px] text-text-subtle">
          {matches.length - 1} more saved{" "}
          {matches.length === 2 ? "application matches" : "applications match"} too.
        </p>
      )}
      <div className="flex flex-col gap-2">
        <Button variant="primary" onClick={() => onOpen(primary.job)}>
          Open existing
        </Button>
        <Button variant="ghost" onClick={() => onUpdate(primary.job)}>
          Update existing
        </Button>
        <Button variant="ghost" onClick={onSaveAnyway}>
          Save anyway
        </Button>
        <Button variant="quiet" onClick={onBack}>
          Back
        </Button>
      </div>
    </div>
  );
}
