import { ArrowDown, Plus } from "lucide-react";
import type { OverviewStats } from "../../core/stats/overview";
import { Button } from "../../ui/components/Button";
import { StatNumber } from "../../ui/components/StatNumber";

interface HeroProps {
  stats: OverviewStats | null;
  onAddApplication: () => void;
  onExplore: () => void;
}

function statList(stats: OverviewStats | null) {
  return [
    { label: "Tracked", value: stats?.tracked ?? null },
    { label: "Applied this week", value: stats?.appliedThisWeek ?? null },
    { label: "Interviews", value: stats?.interviews ?? null },
    { label: "Due in 7 days", value: stats?.dueIn7Days ?? null },
  ];
}

export function Hero({ stats, onAddApplication, onExplore }: HeroProps) {
  const items = statList(stats);
  const left = items.slice(0, 2);
  const right = items.slice(2);

  return (
    <section aria-labelledby="hero-title" className="mx-auto max-w-7xl px-5 pt-14 sm:px-8 sm:pt-20">
      <div className="grid items-center gap-10 xl:grid-cols-[11rem_minmax(0,1fr)_11rem]">
        <dl className="hidden flex-col gap-10 xl:flex" aria-label="Application statistics">
          {left.map((item) => (
            <StatNumber key={item.label} {...item} />
          ))}
        </dl>

        <div className="text-center motion-safe:animate-[rise_700ms_ease-out_both]">
          <p className="micro-label mb-6 text-text-subtle">
            Internships · Graduate roles · Entry-level
          </p>
          <h1
            id="hero-title"
            className="font-serif text-[clamp(48px,7vw,88px)] leading-[0.95] tracking-[-0.01em] text-text"
          >
            Your next <em className="text-accent">opportunity</em> <br />
            <em>starts here.</em>
          </h1>
          <p className="mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-text-muted">
            Discover, organise and track every opportunity. One clear view of your career journey.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button variant="primary" size="lg" onClick={onAddApplication}>
              <Plus size={17} aria-hidden="true" />
              Add an application
            </Button>
            <Button variant="ghost" size="lg" onClick={onExplore}>
              Explore opportunities
              <ArrowDown size={16} aria-hidden="true" />
            </Button>
          </div>
        </div>

        <dl
          className="hidden flex-col items-end gap-10 xl:flex"
          aria-label="Application statistics"
        >
          {right.map((item) => (
            <StatNumber key={item.label} {...item} align="right" />
          ))}
        </dl>
      </div>

      <dl
        className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4 xl:hidden"
        aria-label="Application statistics"
      >
        {items.map((item) => (
          <StatNumber key={item.label} {...item} align="center" />
        ))}
      </dl>
    </section>
  );
}
