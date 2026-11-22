import { formatDistanceStrict } from "date-fns";
import { Bookmark, Plus } from "lucide-react";
import type { JobApplication } from "../../core/model/types";
import { Button } from "../../ui/components/Button";
import { CompanyAvatar } from "../../ui/components/CompanyAvatar";
import { EmptyState } from "../../ui/components/EmptyState";
import { Panel } from "../../ui/components/Panel";
import { SourceTag } from "../../ui/components/SourceTag";
import { StatusPill } from "../../ui/components/StatusPill";

function savedAgo(savedAt: string, now: Date): string {
  const saved = new Date(savedAt);
  if (now.getTime() - saved.getTime() < 60_000) return "Just now";
  return formatDistanceStrict(saved, now, { addSuffix: true });
}

interface ActivityPanelProps {
  recent: JobApplication[];
  now: Date;
  onAddApplication: () => void;
  className?: string;
}

export function ActivityPanel({ recent, now, onAddApplication, className }: ActivityPanelProps) {
  return (
    <Panel title="Recently saved" titleId="panel-recent" className={className}>
      {recent.length === 0 ? (
        <EmptyState
          compact
          icon={<Bookmark size={17} />}
          title="Nothing saved yet"
          actions={
            <Button variant="ghost" size="sm" onClick={onAddApplication}>
              <Plus size={14} aria-hidden="true" />
              Add an application
            </Button>
          }
        >
          Save a job from the toolbar popup or add one here. It will appear in this list.
        </EmptyState>
      ) : (
        <ol className="flex flex-col divide-y divide-border">
          {recent.map((job) => (
            <li key={job.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <CompanyAvatar company={job.company} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text" title={job.title}>
                  {job.title}
                </p>
                <p className="mt-0.5 flex items-center gap-2 truncate text-[12.5px] text-text-muted">
                  <span className="truncate">{job.company}</span>
                  <span aria-hidden="true">·</span>
                  <SourceTag source={job.source} />
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <StatusPill status={job.status} />
                <time dateTime={job.savedAt} className="font-mono text-[10.5px] text-text-subtle">
                  {savedAgo(job.savedAt, now)}
                </time>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
