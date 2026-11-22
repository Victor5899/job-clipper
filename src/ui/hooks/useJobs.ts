import { useEffect, useState } from "react";
import type { JobApplication } from "../../core/model/types";
import { subscribeJobs } from "../../storage/jobRepository";

export type JobsState =
  | { status: "loading"; jobs: JobApplication[] }
  | { status: "ready"; jobs: JobApplication[] }
  | { status: "error"; jobs: JobApplication[] };

/** Live list of saved jobs; updates when any extension page (e.g. the popup) saves a job. */
export function useJobs(): JobsState {
  const [state, setState] = useState<JobsState>({ status: "loading", jobs: [] });

  useEffect(
    () =>
      subscribeJobs(
        (jobs) => setState({ status: "ready", jobs }),
        () => setState((previous) => ({ status: "error", jobs: previous.jobs })),
      ),
    [],
  );

  return state;
}
