import { CalendarDays } from "lucide-react";
import type { JobApplication } from "../../core/model/types";
import { buttonClasses } from "../../ui/components/Button";
import { EmptyState } from "../../ui/components/EmptyState";
import { routeHref } from "../router";
import { PageHeader } from "../PageHeader";

export function CalendarPage({ jobs }: { jobs: JobApplication[] }) {
  const withDeadline = jobs.filter((job) => job.deadline).length;

  return (
    <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
      <PageHeader eyebrow="Schedule" title={<>Calendar</>}>
        Deadlines and interviews on a month view.
      </PageHeader>

      <div className="panel-surface px-6">
        <EmptyState
          icon={<CalendarDays size={18} />}
          title="The calendar arrives in Phase 5"
          actions={
            <a href={routeHref("overview")} className={buttonClasses({ variant: "ghost" })}>
              See upcoming deadlines
            </a>
          }
        >
          {jobs.length === 0
            ? "When you save applications with deadlines, they'll appear on this calendar."
            : `${withDeadline} of your ${jobs.length} saved ${jobs.length === 1 ? "application has" : "applications have"} a deadline. Upcoming ones are shown on the Overview for now.`}
        </EmptyState>
      </div>
    </div>
  );
}
