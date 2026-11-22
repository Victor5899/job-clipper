import { Columns3, Plus } from "lucide-react";
import { JOB_STATUSES, STATUS_LABELS } from "../../core/model/enums";
import { Button, buttonClasses } from "../../ui/components/Button";
import { EmptyState } from "../../ui/components/EmptyState";
import { routeHref } from "../router";
import { PageHeader } from "../PageHeader";

interface ApplicationsPageProps {
  jobCount: number;
  onAddApplication: () => void;
}

export function ApplicationsPage({ jobCount, onAddApplication }: ApplicationsPageProps) {
  return (
    <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
      <PageHeader eyebrow="Pipeline" title={<>Applications</>}>
        Every application moves through four stages:{" "}
        {JOB_STATUSES.map((s) => STATUS_LABELS[s]).join(", ")}.
      </PageHeader>

      <div className="panel-surface px-6">
        <EmptyState
          icon={<Columns3 size={18} />}
          title="The board arrives in Phase 3"
          actions={
            <>
              <Button variant="primary" onClick={onAddApplication}>
                <Plus size={16} aria-hidden="true" />
                Add an application
              </Button>
              <a href={routeHref("overview")} className={buttonClasses({ variant: "ghost" })}>
                Back to Overview
              </a>
            </>
          }
        >
          {jobCount === 0
            ? "You haven't saved any applications yet. Once the Kanban board is built, they'll be organised here by stage."
            : `You have ${jobCount} saved ${jobCount === 1 ? "application" : "applications"}. The most recent are listed on the Overview until the Kanban board is built.`}
        </EmptyState>
      </div>
    </div>
  );
}
