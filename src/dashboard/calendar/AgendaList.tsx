import { format, parse } from "date-fns";
import type { CalendarEntry } from "../../core/reminders/calendar";
import type { JobApplication } from "../../core/model/types";

const KIND_LABEL = {
  deadline: "Deadline",
  interview: "Interview",
  reminder: "Reminder",
} as const;

function EntryButton({
  entry,
  onOpenJob,
}: {
  entry: CalendarEntry;
  onOpenJob: (id: string) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpenJob(entry.jobId)}
        className="flex w-full items-baseline justify-between gap-3 rounded-[10px] px-2 py-2 text-left hover:bg-surface-2/70"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-text">{entry.title}</span>
          <span className="block truncate text-[12.5px] text-text-muted">
            {entry.company} · {KIND_LABEL[entry.kind]}
          </span>
        </span>
        <time
          dateTime={entry.at.toISOString()}
          className="shrink-0 font-mono text-[11.5px] text-text-muted"
        >
          {format(entry.at, "d MMM, HH:mm")}
        </time>
      </button>
    </li>
  );
}

export function AgendaList({
  days,
  byDay,
  undated = [],
  onOpenJob,
  heading,
  undatedOnly = false,
}: {
  days: string[];
  byDay: Map<string, CalendarEntry[]>;
  undated?: JobApplication[];
  onOpenJob: (id: string) => void;
  heading: string;
  undatedOnly?: boolean;
}) {
  const dated = days.filter((day) => (byDay.get(day)?.length ?? 0) > 0);

  return (
    <div className="flex flex-col gap-6">
      {!undatedOnly && (
        <section aria-label={heading} className="panel-surface p-5">
          <h2 className="micro-label mb-3 text-text-subtle">{heading}</h2>
          {dated.length === 0 ? (
            <p className="text-sm text-text-muted">Nothing with a date is scheduled here.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {dated.map((day) => {
                const date = parse(day, "yyyy-MM-dd", new Date());
                return (
                  <div key={day}>
                    <h3 className="font-mono text-[11.5px] text-text-muted">
                      {format(date, "EEEE d MMM")}
                    </h3>
                    <ul>
                      {(byDay.get(day) ?? []).map((entry) => (
                        <EntryButton
                          key={`${entry.kind}-${entry.jobId}-${entry.day}`}
                          entry={entry}
                          onOpenJob={onOpenJob}
                        />
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {undatedOnly && (
        <section aria-label="No deadline provided" className="panel-surface p-5">
          <h2 className="micro-label mb-3 text-text-subtle">No deadline provided</h2>
          {undated.length === 0 ? (
            <p className="text-sm text-text-muted">Every saved application has a deadline.</p>
          ) : (
            <ul>
              {undated.map((job) => (
                <li key={job.id}>
                  <button
                    type="button"
                    onClick={() => onOpenJob(job.id)}
                    className="flex w-full flex-col rounded-[10px] px-2 py-2 text-left hover:bg-surface-2/70"
                  >
                    <span className="truncate text-sm font-medium text-text">{job.title}</span>
                    <span className="truncate text-[12.5px] text-text-muted">
                      {job.company} · No deadline provided
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
