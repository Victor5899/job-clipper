import { useMemo, useState } from "react";
import { addMonths, format, startOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  calendarEntries,
  dayKey,
  entriesByDay,
  jobsWithoutDeadline,
  monthMatrix,
} from "../../core/reminders/calendar";
import type { JobApplication } from "../../core/model/types";
import { useNow } from "../../ui/hooks/useNow";
import { PageHeader } from "../PageHeader";
import { AgendaList } from "./AgendaList";
import { MonthGrid } from "./MonthGrid";

export function CalendarPage({
  jobs,
  onOpenJob,
  now: nowProp,
}: {
  jobs: JobApplication[];
  onOpenJob: (id: string) => void;
  now?: Date;
}) {
  const ticking = useNow();
  const now = nowProp ?? ticking;
  const [month, setMonth] = useState(() => startOfMonth(now));
  const [selected, setSelected] = useState(() => dayKey(now));

  const days = useMemo(() => monthMatrix(month), [month]);
  const byDay = useMemo(() => entriesByDay(calendarEntries(jobs)), [jobs]);
  const undated = useMemo(() => jobsWithoutDeadline(jobs), [jobs]);
  const monthKey = format(month, "yyyy-MM");
  const monthDays = days
    .filter((day) => dayKey(day).startsWith(monthKey))
    .map((day) => dayKey(day));

  return (
    <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
      <PageHeader eyebrow="Schedule" title={<>Calendar</>}>
        Deadlines, interviews and reminders. A job with no deadline stays off the grid and is listed
        as "No deadline provided".
      </PageHeader>

      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-serif text-3xl text-text">{format(month, "MMMM yyyy")}</h2>
        <div className="flex gap-2">
          <button
            type="button"
            className="grid size-9 place-items-center rounded-full border border-border-strong text-text hover:bg-surface-2"
            aria-label="Previous month"
            onClick={() => setMonth((current) => addMonths(current, -1))}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className="grid size-9 place-items-center rounded-full border border-border-strong text-text hover:bg-surface-2"
            aria-label="Next month"
            onClick={() => setMonth((current) => addMonths(current, 1))}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <MonthGrid
        month={month}
        days={days}
        byDay={byDay}
        selected={selected}
        today={dayKey(now)}
        onSelect={setSelected}
      />

      <div className="mt-5 hidden md:block">
        <AgendaList
          days={[selected]}
          byDay={byDay}
          onOpenJob={onOpenJob}
          heading={format(parseDay(selected), "EEEE d MMMM")}
        />
      </div>

      <div className="md:hidden">
        <AgendaList days={monthDays} byDay={byDay} onOpenJob={onOpenJob} heading="This month" />
      </div>

      <div className="mt-5">
        <AgendaList
          days={[]}
          byDay={byDay}
          undated={undated}
          onOpenJob={onOpenJob}
          heading="No deadline provided"
          undatedOnly
        />
      </div>
    </div>
  );
}

function parseDay(day: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year ?? 2026, (month ?? 1) - 1, date ?? 1);
}
