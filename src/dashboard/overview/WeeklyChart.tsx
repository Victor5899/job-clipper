import { format } from "date-fns";
import { useId } from "react";

const WIDTH = 320;
const HEIGHT = 110;
const PAD_X = 6;
const PAD_TOP = 12;
const PAD_BOTTOM = 6;

/** Hand-rolled SVG area chart of jobs saved per week (no chart library, PROJECT_SPEC section 10). */
export function WeeklyChart({ weeks }: { weeks: { weekStart: Date; count: number }[] }) {
  const gradientId = useId();
  const titleId = useId();
  const max = Math.max(1, ...weeks.map((week) => week.count));
  const step = (WIDTH - PAD_X * 2) / Math.max(1, weeks.length - 1);
  const points = weeks.map((week, index) => ({
    x: PAD_X + index * step,
    y: HEIGHT - PAD_BOTTOM - (week.count / max) * (HEIGHT - PAD_TOP - PAD_BOTTOM),
  }));
  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const first = points[0];
  const last = points[points.length - 1];
  const area =
    first && last
      ? `${line} L${last.x.toFixed(1)} ${HEIGHT} L${first.x.toFixed(1)} ${HEIGHT} Z`
      : "";
  const summary = weeks
    .map((week) => `week of ${format(week.weekStart, "d MMM")}: ${week.count}`)
    .join(", ");

  return (
    <figure className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-28 w-full overflow-visible"
        role="img"
        aria-labelledby={titleId}
        preserveAspectRatio="none"
      >
        <title id={titleId}>{`Jobs saved per week, last ${weeks.length} weeks: ${summary}`}</title>
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((fraction) => (
          <line
            key={fraction}
            x1="0"
            x2={WIDTH}
            y1={HEIGHT * fraction}
            y2={HEIGHT * fraction}
            stroke="var(--color-border)"
            strokeDasharray="2 4"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <figcaption
        className="flex justify-between font-mono text-[10.5px] text-text-subtle"
        aria-hidden="true"
      >
        <span>{weeks[0] ? format(weeks[0].weekStart, "d MMM") : ""}</span>
        <span>Saves per week</span>
        <span>This week</span>
      </figcaption>
    </figure>
  );
}
