import { format, isSameMonth } from "date-fns";
import { dayKey, type CalendarEntry } from "../../core/reminders/calendar";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const KIND_DOT = {
  deadline: "bg-warn",
  interview: "bg-accent",
  reminder: "bg-info",
} as const;

export function MonthGrid({
  month,
  days,
  byDay,
  selected,
  today,
  onSelect,
}: {
  month: Date;
  days: Date[];
  byDay: Map<string, CalendarEntry[]>;
  selected: string;
  today: string;
  onSelect: (day: string) => void;
}) {
  const weeks: Date[][] = [];
  for (let index = 0; index < days.length; index += 7) weeks.push(days.slice(index, index + 7));

  return (
    <div className="panel-surface hidden p-4 md:block">
      <div className="grid grid-cols-7 gap-1" role="grid" aria-label={format(month, "MMMM yyyy")}>
        <div role="row" className="contents">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              role="columnheader"
              className="px-1 pb-2 text-center font-mono text-[10.5px] tracking-wide text-text-subtle uppercase"
            >
              {day}
            </div>
          ))}
        </div>
        {weeks.map((week) => (
          <div role="row" className="contents" key={dayKey(week[0] ?? month)}>
            {week.map((day) => {
              const key = dayKey(day);
              const entries = byDay.get(key) ?? [];
              const inMonth = isSameMonth(day, month);
              const kinds = [...new Set(entries.map((entry) => entry.kind))];
              return (
                <button
                  key={key}
                  type="button"
                  role="gridcell"
                  aria-selected={key === selected}
                  aria-current={key === today ? "date" : undefined}
                  aria-label={
                    entries.length === 0
                      ? format(day, "d MMMM yyyy")
                      : `${format(day, "d MMMM yyyy")}, ${entries.length} scheduled`
                  }
                  onClick={() => onSelect(key)}
                  className={[
                    "flex min-h-16 flex-col gap-1 rounded-[10px] border p-1.5 text-left",
                    "hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                    inMonth ? "bg-surface-1" : "bg-transparent opacity-45",
                    key === today ? "border-accent" : "border-border",
                    key === selected ? "ring-2 ring-accent/40" : "",
                  ].join(" ")}
                >
                  <span className="font-mono text-[11px] text-text-muted">{format(day, "d")}</span>
                  {kinds.length > 0 && (
                    <span className="flex gap-1" aria-hidden="true">
                      {kinds.map((kind) => (
                        <span key={kind} className={`size-1.5 rounded-full ${KIND_DOT[kind]}`} />
                      ))}
                    </span>
                  )}
                  {entries.slice(0, 2).map((entry) => (
                    <span
                      key={`${entry.kind}-${entry.jobId}`}
                      className="truncate text-[11px] text-text"
                    >
                      {entry.title}
                    </span>
                  ))}
                  {entries.length > 2 && (
                    <span className="font-mono text-[10px] text-text-subtle">
                      +{entries.length - 2}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
