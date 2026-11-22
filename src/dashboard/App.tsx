import { useEffect, useState } from "react";
import type { JobApplication } from "../core/model/types";
import { useJobs } from "../ui/hooks/useJobs";
import { AddApplicationDialog } from "./AddApplicationDialog";
import { ApplicationsPage } from "./applications/ApplicationsPage";
import { CalendarPage } from "./calendar/CalendarPage";
import { AppShell } from "./layout/AppShell";
import { OverviewPage } from "./overview/OverviewPage";
import { ROUTE_LABELS, useRoute } from "./router";
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

  const openAdd = () => setAdding(true);
  const handleSaved = (job: JobApplication) => {
    setAdding(false);
    setToast(`Saved “${job.title}” at ${job.company}`);
  };

  return (
    <AppShell route={route.name} onAddApplication={openAdd}>
      {route.name === "overview" && (
        <OverviewPage jobsState={jobsState} onAddApplication={openAdd} />
      )}
      {route.name === "applications" && (
        <ApplicationsPage jobCount={jobsState.jobs.length} onAddApplication={openAdd} />
      )}
      {route.name === "calendar" && <CalendarPage jobs={jobsState.jobs} />}
      {route.name === "settings" && <SettingsPage jobCount={jobsState.jobs.length} />}

      <AddApplicationDialog open={adding} onClose={() => setAdding(false)} onSaved={handleSaved} />

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
