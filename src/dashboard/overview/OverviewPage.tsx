import { useMemo } from "react";
import { computeOverviewStats } from "../../core/stats/overview";
import { GlowBackdrop } from "../../ui/components/GlowBackdrop";
import type { JobsState } from "../../ui/hooks/useJobs";
import { useNow } from "../../ui/hooks/useNow";
import { ActivityPanel } from "./ActivityPanel";
import { DeadlinesPanel } from "./DeadlinesPanel";
import { Hero } from "./Hero";
import { ProgressPanel } from "./ProgressPanel";

const PANELS_ID = "overview-panels";

function scrollToPanels() {
  const panels = document.getElementById(PANELS_ID);
  if (!panels) return;
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  panels.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  panels.focus({ preventScroll: true });
}

interface OverviewPageProps {
  jobsState: JobsState;
  onAddApplication: () => void;
  onOpenJob: (id: string) => void;
}

export function OverviewPage({ jobsState, onAddApplication, onOpenJob }: OverviewPageProps) {
  const now = useNow();
  const stats = useMemo(() => computeOverviewStats(jobsState.jobs, now), [jobsState.jobs, now]);
  const ready = jobsState.status !== "loading";

  return (
    <div className="relative isolate overflow-hidden">
      <GlowBackdrop />
      <Hero
        stats={ready ? stats : null}
        onAddApplication={onAddApplication}
        onExplore={scrollToPanels}
      />

      {jobsState.status === "error" && (
        <p role="alert" className="mx-auto mt-8 max-w-xl px-5 text-center text-sm text-danger">
          Saved applications couldn't be read from browser storage. Reload the page to try again.
        </p>
      )}

      <section
        id={PANELS_ID}
        tabIndex={-1}
        aria-label="Your applications at a glance"
        className="mx-auto max-w-7xl scroll-mt-24 px-5 pt-16 pb-20 focus:outline-none sm:px-8"
      >
        <div className="grid items-start gap-5 lg:grid-cols-3 lg:items-stretch">
          <ActivityPanel
            recent={stats.recent}
            now={now}
            onAddApplication={onAddApplication}
            onOpenJob={onOpenJob}
            className="origin-right xl:motion-safe:[transform:perspective(1600px)_rotateY(5deg)]"
          />
          <ProgressPanel stats={stats} className="max-lg:order-first" />
          <DeadlinesPanel
            stats={stats}
            now={now}
            onOpenJob={onOpenJob}
            className="origin-left xl:motion-safe:[transform:perspective(1600px)_rotateY(-5deg)]"
          />
        </div>
      </section>
    </div>
  );
}
