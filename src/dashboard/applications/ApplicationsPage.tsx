import { Plus } from "lucide-react";
import type { JobApplication } from "../../core/model/types";
import { Button } from "../../ui/components/Button";
import { useNow } from "../../ui/hooks/useNow";
import { PageHeader } from "../PageHeader";
import { KanbanBoard } from "./KanbanBoard";

interface ApplicationsPageProps {
  jobs: JobApplication[];
  onAddApplication: () => void;
  onOpenJob: (id: string) => void;
  onNotice: (message: string) => void;
}

export function ApplicationsPage({
  jobs,
  onAddApplication,
  onOpenJob,
  onNotice,
}: ApplicationsPageProps) {
  const now = useNow();

  return (
    <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
      <PageHeader eyebrow="Pipeline" title={<>Applications</>}>
        Drag a card between stages, or choose a stage with Move to. Open a card to view, edit or
        delete it.
      </PageHeader>

      {jobs.length === 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-text-muted">No applications yet. New ones start in Saved.</p>
          <Button variant="primary" onClick={onAddApplication}>
            <Plus size={16} aria-hidden="true" />
            Add an application
          </Button>
        </div>
      )}

      <KanbanBoard jobs={jobs} now={now} onOpen={onOpenJob} onNotice={onNotice} />
    </div>
  );
}
