import { addDays, format } from "date-fns";
import { CalendarClock } from "lucide-react";
import { describeDaysLeft } from "../../core/deadline";
import { TIMELINE_DAYS, type OverviewStats } from "../../core/stats/overview";
import { EmptyState } from "../../ui/components/EmptyState";
import { Panel } from "../../ui/components/Panel";

const LIST_LIMIT = 5;
const URGENT_DAYS = 3;

export function DeadlinesPanel({
  stats,
  now,
  className,
  onOpenJob,
}: {
  stats: OverviewStats;
  now: Date;
  className?: string;
  onOpenJob?: (id: string) => void;
}) {
  const upcoming = stats.upcomingDeadlines;
  const perDay = new Map<number, number>();

  return (
    <Panel title="Upcoming deadlines" titleId="panel-deadlines" className={className}>
      <div aria-hidden="true" className="relative mb-5 h-20">
        <div className="absolute inset-x-0 top-5 bottom-5 flex">
          {Array.from({ length: TIMELINE_DAYS }, (_, day) => (
            <span key={day} className="flex-1 border-l border-border first:border-l-0" />
          ))}
        </div>
        <span className="absolute top-3 bottom-4 left-0 w-px bg-accent shadow-[0_0_12px_rgb(198_241_53/0.8)]">
          <span className="absolute -top-1 -left-[3px] size-[7px] rounded-full bg-accent" />
        </span>
        {upcoming.map(({ job, daysLeft }) => {
          const stack = perDay.get(daysLeft) ?? 0;
          perDay.set(daysLeft, stack + 1);
          return (
            <span
              key={job.id}
              className={`absolute h-2 rounded-full ${
                daysLeft <= URGENT_DAYS ? "bg-warn" : "bg-accent/80"
              }`}
              style={{
                width: `calc(${100 / TIMELINE_DAYS}% - 6px)`,
                left: `calc(${(daysLeft / TIMELINE_DAYS) * 100}% + 3px)`,
                top: `${24 + (stack % 3) * 12}px`,
              }}
            />
          );
        })}
        <div className="absolute inset-x-0 bottom-0 flex justify-between font-mono text-[10.5px] text-text-subtle">
          <span>Today</span>
          <span>+7d</span>
          <span>{format(addDays(now, TIMELINE_DAYS - 1), "d MMM")}</span>
        </div>
      </div>

      {upcoming.length === 0 ? (
        <EmptyState compact icon={<CalendarClock size={17} />} title="No upcoming deadlines">
          {stats.tracked === 0
            ? "Deadlines you add to saved jobs will line up here."
            : `Nothing is due in the next ${TIMELINE_DAYS} days.`}
        </EmptyState>
      ) : (
        <ol className="flex flex-col divide-y divide-border">
          {upcoming.slice(0, LIST_LIMIT).map(({ job, due, daysLeft }) => (
            <li key={job.id} className="py-1 first:pt-0">
              <button
                type="button"
                onClick={() => onOpenJob?.(job.id)}
                className="flex w-full items-center justify-between gap-3 rounded-[10px] px-1 py-1.5 text-left hover:bg-surface-2/70"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-text" title={job.title}>
                    {job.title}
                  </span>
                  <span className="block truncate text-[12.5px] text-text-muted">
                    {job.company}
                  </span>
                </span>
                <time
                  dateTime={due.toISOString()}
                  className={`shrink-0 font-mono text-[11.5px] ${daysLeft <= URGENT_DAYS ? "text-warn" : "text-text-muted"}`}
                >
                  Due {format(due, "d MMM")} · {describeDaysLeft(daysLeft)}
                </time>
              </button>
            </li>
          ))}
        </ol>
      )}

      {stats.noDeadlineCount > 0 && (
        <div className="mt-auto pt-4">
          <p className="border-t border-border pt-3 text-[12.5px] text-text-subtle">
            <a href="#/calendar" className="hover:text-text hover:underline">
              {stats.noDeadlineCount} saved {stats.noDeadlineCount === 1 ? "job has" : "jobs have"}{" "}
              no deadline provided
            </a>
          </p>
        </div>
      )}
    </Panel>
  );
}
