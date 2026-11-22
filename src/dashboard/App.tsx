import { useEffect, useState } from "react";
import { Dialog } from "../ui/components/Dialog";
import type { JobApplication } from "../core/model/types";
import { useJobs } from "../ui/hooks/useJobs";
import { AddApplicationDialog } from "./AddApplicationDialog";
import { ApplicationsPage } from "./applications/ApplicationsPage";
import { CalendarPage } from "./calendar/CalendarPage";
import { JobDrawer } from "./job/JobDrawer";
import { AppShell } from "./layout/AppShell";
import { OverviewPage } from "./overview/OverviewPage";
import { hashForJob, replaceHash, ROUTE_LABELS, useRoute } from "./router";
import { SettingsPage } from "./settings/SettingsPage";

const TOAST_MS = 4000;

export function App() {
  const route = useRoute();
  const jobsState = useJobs();
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    document.title = `${ROUTE_LABELS[route.name]} · Job Clipper`;
  }, [route.name]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const openJobId = route.params.get("job");
  const editing = route.params.get("edit") === "1";
  const selected = jobsState.jobs.find((job) => job.id === openJobId) ?? null;
  const missingJob = Boolean(openJobId && jobsState.status === "ready" && !selected);

  const openAdd = () => setAdding(true);
  const openJob = (id: string, edit = false) => {
    setAdding(false);
    replaceHash(hashForJob(route.name, id, edit));
  };
  const closeJob = () => {
    const params = new URLSearchParams(route.params);
    params.delete("job");
    params.delete("edit");
    const query = params.toString();
    replaceHash(`#/${route.name}${query ? `?${query}` : ""}`);
  };
  const handleSaved = (job: JobApplication) => {
    setAdding(false);
    setToast(`Saved “${job.title}” at ${job.company}`);
  };

  return (
    <AppShell route={route.name} onAddApplication={openAdd}>
      {route.name === "overview" && (
        <OverviewPage jobsState={jobsState} onAddApplication={openAdd} onOpenJob={openJob} />
      )}
      {route.name === "applications" && (
        <ApplicationsPage
          jobs={jobsState.jobs}
          onAddApplication={openAdd}
          onOpenJob={openJob}
          onNotice={setToast}
        />
      )}
      {route.name === "calendar" && <CalendarPage jobs={jobsState.jobs} onOpenJob={openJob} />}
      {route.name === "settings" && <SettingsPage jobCount={jobsState.jobs.length} />}

      <AddApplicationDialog
        open={adding}
        onClose={() => setAdding(false)}
        onSaved={handleSaved}
        onOpenExisting={openJob}
      />
      <Dialog
        open={missingJob}
        title="Application not found"
        titleId="missing-job-title"
        onClose={closeJob}
      >
        <p>That application isn't saved on this device.</p>
      </Dialog>
      <JobDrawer
        job={selected}
        editing={editing}
        onClose={closeJob}
        onEdit={() => selected && openJob(selected.id, true)}
        onCancelEdit={() => selected && openJob(selected.id, false)}
        onUpdated={(job) => {
          setToast(`Updated “${job.title}”`);
          openJob(job.id, false);
        }}
        onDeleted={(job) => {
          setToast(`Deleted “${job.title}”`);
          closeJob();
        }}
      />

      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4"
      >
        {toast && (
          <p className="panel-surface pointer-events-auto bg-surface-2 px-4 py-2.5 text-sm text-text motion-safe:animate-[rise_200ms_ease-out]">
            <span
              className="mr-2 inline-block size-1.5 rounded-full bg-accent align-middle"
              aria-hidden="true"
            />
            {toast}
          </p>
        )}
      </div>
    </AppShell>
  );
}
