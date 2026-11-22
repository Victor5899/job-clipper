import { LineChart } from "lucide-react";
import { JOB_STATUSES, STATUS_LABELS } from "../../core/model/enums";
import type { OverviewStats } from "../../core/stats/overview";
import { EmptyState } from "../../ui/components/EmptyState";
import { Panel } from "../../ui/components/Panel";
import { WeeklyChart } from "./WeeklyChart";

const SEGMENT_STYLES = {
  saved: "bg-text-muted",
  applied: "bg-olive",
  interview: "bg-accent",
  result: "bg-info",
} as const;

export function ProgressPanel({ stats, className }: { stats: OverviewStats; className?: string }) {
  return (
    <Panel
      title="Application overview"
      titleId="panel-overview"
      glow
      className={className}
      aside={
        stats.tracked > 0 && (
          <span className="rounded-full border border-accent/50 px-2.5 py-0.5 text-[11.5px] font-medium text-accent">
            {stats.savedThisWeek} saved this week
          </span>
        )
      }
    >
      {stats.tracked === 0 ? (
        <EmptyState compact icon={<LineChart size={17} />} title="Your overview starts here">
          Totals, weekly activity and pipeline progress are calculated from the applications you
          save.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-5">
          <p className="flex items-baseline gap-3">
            <span className="font-serif text-[64px] leading-none tabular-nums text-text">
              {stats.tracked}
            </span>
            <span className="text-sm text-text-muted">
              {stats.tracked === 1 ? "application" : "applications"} · {stats.active} active
            </span>
          </p>

          <WeeklyChart weeks={stats.weeklySaves} />

          <div>
            <p className="micro-label mb-2 text-text-subtle">Pipeline</p>
            <div className="flex h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
              {JOB_STATUSES.map((status) =>
                stats.byStatus[status] > 0 ? (
                  <span
                    key={status}
                    className={SEGMENT_STYLES[status]}
                    style={{ width: `${(stats.byStatus[status] / stats.tracked) * 100}%` }}
                  />
                ) : null,
              )}
            </div>
            <dl className="mt-3 grid grid-cols-4 gap-2">
              {JOB_STATUSES.map((status) => (
                <div key={status} className="flex flex-col gap-0.5">
                  <dt className="flex items-center gap-1.5 text-[11.5px] text-text-muted">
                    <span
                      className={`size-1.5 rounded-full ${SEGMENT_STYLES[status]}`}
                      aria-hidden="true"
                    />
                    {STATUS_LABELS[status]}
                  </dt>
                  <dd className="font-mono text-sm text-text tabular-nums">
                    {stats.byStatus[status]}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </Panel>
  );
}
