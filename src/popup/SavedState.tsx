import { Check } from "lucide-react";
import { useEffect, useRef } from "react";
import { formatDeadline } from "../core/deadline";
import type { JobApplication } from "../core/model/types";
import { Button } from "../ui/components/Button";
import { SourceTag } from "../ui/components/SourceTag";

interface SavedStateProps {
  job: JobApplication;
  onOpenDashboard: () => void;
  onClipAnother: () => void;
}

export function SavedState({ job, onOpenDashboard, onClipAnother }: SavedStateProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);

  return (
    <div className="flex flex-1 flex-col">
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 text-center">
        <div
          aria-hidden="true"
          className="hero-glow pointer-events-none absolute inset-0 opacity-80"
        />
        <span
          aria-hidden="true"
          className="relative mb-5 grid size-14 place-items-center rounded-full bg-accent text-accent-ink shadow-[0_0_48px_-6px_rgb(198_241_53/0.7)] motion-safe:animate-[pop_240ms_ease-out]"
        >
          <Check size={26} strokeWidth={2.5} />
        </span>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="relative font-serif text-[34px] leading-tight focus:outline-none"
        >
          Saved to <em className="text-accent">Job Clipper</em>
        </h1>
        <div className="panel-surface relative mt-6 w-full p-4 text-left">
          <p className="text-[15px] font-semibold text-text">{job.title}</p>
          <p className="mt-0.5 text-sm text-text-muted">{job.company}</p>
          <dl className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3 text-[13px]">
            <div>
              <dt className="sr-only">Deadline</dt>
              <dd className={job.deadline ? "text-text" : "text-text-muted"}>
                {job.deadline ? `Due ${formatDeadline(job.deadline)}` : formatDeadline(null)}
              </dd>
            </div>
            <div>
              <dt className="sr-only">Source</dt>
              <dd>
                <SourceTag source={job.source} />
              </dd>
            </div>
          </dl>
        </div>
      </div>
      <footer className="flex gap-2 border-t border-border bg-surface-1/90 px-5 py-4">
        <Button variant="primary" className="flex-1" onClick={onOpenDashboard}>
          Open dashboard
        </Button>
        <Button variant="ghost" onClick={onClipAnother}>
          Clip another
        </Button>
      </footer>
    </div>
  );
}
