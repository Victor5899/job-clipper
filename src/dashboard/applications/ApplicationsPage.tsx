import { Download, Plus } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import type { JobApplication } from "../../core/model/types";
import {
  applyQuery,
  applicationsHash,
  emptyQuery,
  queryFromParams,
  queryNarrows,
} from "../../core/search/query";
import { compareJobs } from "../../core/search/sort";
import { getSettings } from "../../storage/settingsRepository";
import { Button } from "../../ui/components/Button";
import { useNow } from "../../ui/hooks/useNow";
import { downloadJobsCsv } from "../exportCsv";
import { PageHeader } from "../PageHeader";
import { replaceHash, useRoute } from "../router";
import { FilterBar } from "./FilterBar";
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
  const route = useRoute();
  const query = useMemo(() => queryFromParams(route.params), [route.params]);
  const deferredQueryText = useDeferredValue(query.q);
  const [exporting, setExporting] = useState(false);
  const displayedQuery = useMemo(
    () => ({ ...query, q: deferredQueryText }),
    [query, deferredQueryText],
  );
  const visible = useMemo(() => applyQuery(jobs, displayedQuery, now), [jobs, displayedQuery, now]);
  const narrowed = queryNarrows(displayedQuery);
  const compare = useMemo(
    () => (a: JobApplication, b: JobApplication) => compareJobs(displayedQuery.sort, a, b),
    [displayedQuery.sort],
  );

  const write = (next: typeof query) => {
    replaceHash(applicationsHash(route.params, next));
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const settings = await getSettings();
      onNotice(
        downloadJobsCsv(
          visible,
          settings.csv.includeDescription,
          new Date(),
          narrowed ? "filtered" : "all",
        ),
      );
    } catch {
      onNotice("Couldn't export a CSV.");
    } finally {
      setExporting(false);
    }
  };

  const countText = narrowed
    ? `${visible.length} of ${jobs.length} ${jobs.length === 1 ? "application" : "applications"}`
    : jobs.length === 0
      ? "No applications yet. New ones start in Saved."
      : `${jobs.length} ${jobs.length === 1 ? "application" : "applications"}`;

  return (
    <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
      <PageHeader eyebrow="Pipeline" title={<>Applications</>}>
        Drag a card between stages, or choose a stage with Move to. Open a card to view, edit or
        delete it.
      </PageHeader>

      <div role="region" aria-label="Application filters" className="mb-6 flex flex-col gap-4">
        <FilterBar
          query={query}
          onSearch={(value) => write({ ...query, q: value })}
          onChange={write}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-text-muted" role="status">
            {countText}
            {narrowed && visible.length === 0 ? ". Nothing matches." : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            {(narrowed || query.sort !== "deadline") && (
              <Button variant="quiet" size="sm" onClick={() => write(emptyQuery())}>
                Clear all
              </Button>
            )}
            <Button variant="ghost" size="sm" disabled={exporting} onClick={() => void exportCsv()}>
              <Download size={15} aria-hidden="true" />
              {narrowed ? "Export filtered" : "Export CSV"}
            </Button>
            {jobs.length === 0 && (
              <Button variant="primary" onClick={onAddApplication}>
                <Plus size={16} aria-hidden="true" />
                Add an application
              </Button>
            )}
          </div>
        </div>
      </div>

      <KanbanBoard
        jobs={visible}
        now={now}
        compare={compare}
        onOpen={onOpenJob}
        onNotice={onNotice}
      />
    </div>
  );
}
