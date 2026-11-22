import { Columns3, Plus } from "lucide-react";
import { formatDeadline } from "../../core/deadline";
import { JOB_STATUSES, STATUS_LABELS } from "../../core/model/enums";
import type { JobApplication } from "../../core/model/types";
import { Button, buttonClasses } from "../../ui/components/Button";
import { CompanyAvatar } from "../../ui/components/CompanyAvatar";
import { EmptyState } from "../../ui/components/EmptyState";
import { SourceTag } from "../../ui/components/SourceTag";
import { StatusPill } from "../../ui/components/StatusPill";
import { PageHeader } from "../PageHeader";
import { routeHref } from "../router";

interface ApplicationsPageProps {
  jobs: JobApplication[];
  onAddApplication: () => void;
  onOpenJob: (id: string) => void;
}

export function ApplicationsPage({ jobs, onAddApplication, onOpenJob }: ApplicationsPageProps) {
  return (
    <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
      <PageHeader eyebrow="Pipeline" title={<>Applications</>}>
        Every application moves through four stages:{" "}
        {JOB_STATUSES.map((s) => STATUS_LABELS[s]).join(", ")}. Open an application to view, edit or
        delete it. Columns arrive in Phase 3.
      </PageHeader>

      {jobs.length === 0 ? (
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
            You haven't saved any applications yet. Once the Kanban board is built, they'll be
            organised here by stage.
          </EmptyState>
        </div>
      ) : (
        <ol className="panel-surface divide-y divide-border px-3 sm:px-4">
          {jobs.map((job) => (
            <li key={job.id}>
              <button
                type="button"
                onClick={() => onOpenJob(job.id)}
                className="flex w-full items-center gap-3 rounded-[10px] px-2 py-3 text-left hover:bg-surface-2/50"
              >
                <CompanyAvatar company={job.company} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-text">{job.title}</span>
                  <span className="mt-0.5 flex items-center gap-2 truncate text-[12.5px] text-text-muted">
                    <span className="truncate">{job.company}</span>
                    <span aria-hidden="true">·</span>
                    <SourceTag source={job.source} />
                  </span>
                </span>
                <span className="hidden shrink-0 text-right sm:block">
                  <span className="block text-[12.5px] text-text-muted">
                    {formatDeadline(job.deadline)}
                  </span>
                </span>
                <StatusPill status={job.status} />
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
