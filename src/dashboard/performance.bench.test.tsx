import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { realisticJobs } from "../../tests/seeds/realisticJobs";
import { chromeFake } from "../../tests/fakes/chrome";
import { applyQuery, emptyQuery } from "../core/search/query";
import { groupByStage } from "../core/model/stage";

interface Sample {
  name: string;
  ms: number;
  min?: number;
  max?: number;
  detail?: string;
}

const NOW = new Date("2026-11-23T12:00:00");

/** Five runs. `ms` is the median so one slow sample under load does not hide the typical time. */
function time(name: string, run: () => void, samples: Sample[], detail?: string): void {
  const taken: number[] = [];
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const started = performance.now();
    run();
    taken.push(performance.now() - started);
  }
  const ordered = [...taken].sort((a, b) => a - b);
  samples.push({
    name,
    ms: ordered[2] ?? 0,
    min: ordered[0],
    max: ordered[4],
    ...(detail ? { detail } : {}),
  });
}

describe("performance benchmark, 2000 jobs", () => {
  it("measures search, filters, sorting and dashboard rendering", async () => {
    const samples: Sample[] = [];
    const buildStarted = performance.now();
    const jobs = realisticJobs(2000, NOW);
    samples.push({
      name: "build 2000 realistic records",
      ms: performance.now() - buildStarted,
      detail: `${jobs.length} jobs`,
    });

    const stored: Record<string, unknown> = {};
    for (const job of jobs) stored[`job:${job.id}`] = job;
    const seedStarted = performance.now();
    await chromeFake().storage.local.set(stored);
    samples.push({
      name: "write 2000 jobs to in-memory storage",
      ms: performance.now() - seedStarted,
    });

    time(
      "search (zephyr warehouse)",
      () => {
        const found = applyQuery(jobs, { ...emptyQuery(), q: "zephyr warehouse" }, NOW);
        expect(found).toHaveLength(1);
        expect(found[0]?.id).toBe("bulk-1500");
      },
      samples,
      "1 match",
    );
    time(
      "search again, haystack cache warm",
      () => {
        expect(applyQuery(jobs, { ...emptyQuery(), q: "zephyr warehouse" }, NOW)).toHaveLength(1);
      },
      samples,
      "1 match",
    );
    time(
      "filter status = saved",
      () => {
        const found = applyQuery(jobs, { ...emptyQuery(), status: ["saved"] }, NOW);
        expect(found).toHaveLength(500);
      },
      samples,
      "500 matches",
    );
    time(
      "filter deadline = none",
      () => {
        const found = applyQuery(jobs, { ...emptyQuery(), deadline: ["none"] }, NOW);
        expect(found.length).toBeGreaterThan(0);
        expect(found.every((job) => job.deadline === null)).toBe(true);
      },
      samples,
    );
    time(
      "sort company A–Z",
      () => {
        const sorted = applyQuery(jobs, { ...emptyQuery(), sort: "company" }, NOW);
        expect(sorted[0]?.company).toBe("Acme Analytics");
        expect(sorted).toHaveLength(2000);
      },
      samples,
    );
    time(
      "group into Kanban columns",
      () => {
        const groups = groupByStage(jobs);
        expect(groups.saved).toHaveLength(500);
        expect(groups.applied).toHaveLength(500);
        expect(groups.interview).toHaveLength(500);
        expect(groups.result).toHaveLength(500);
      },
      samples,
    );

    for (const sample of samples) {
      if (
        sample.name.startsWith("search") ||
        sample.name.startsWith("filter") ||
        sample.name.startsWith("sort")
      ) {
        expect(sample.ms, sample.name).toBeLessThan(50);
      }
    }

    const report = {
      measuredAt: new Date().toISOString(),
      environment: `vitest, ${process.version}`,
      note: "Pure search, filter, sort and column grouping for 2,000 jobs. ms is the median of 5 runs. A jsdom render of 2,000 draggable cards did not finish within 3 minutes, so dashboard rendering and Kanban interaction are measured in the Playwright benchmark.",
      samples,
    };
    mkdirSync("reports", { recursive: true });
    writeFileSync("reports/performance.json", `${JSON.stringify(report, null, 2)}\n`);
    for (const sample of samples) {
      console.log(
        `${sample.ms.toFixed(2).padStart(8)} ms median  ${sample.name}` +
          (sample.min !== undefined && sample.max !== undefined
            ? `  (min ${sample.min.toFixed(2)}, max ${sample.max.toFixed(2)})`
            : ""),
      );
    }
  });
});
