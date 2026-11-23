import { mkdirSync, writeFileSync } from "node:fs";
import { realisticJobs } from "../tests/seeds/realisticJobs";
import { expect, test } from "./extension";

test("measures the extension dashboard with 2000 stored jobs", async ({
  dashboard,
  extensionId,
}) => {
  test.setTimeout(120_000);
  const jobs = realisticJobs(2000);
  const seedStarted = Date.now();
  const stored = await dashboard.evaluate(async (batch) => {
    const size = 200;
    for (let index = 0; index < batch.length; index += size) {
      const items: Record<string, unknown> = {};
      for (const job of batch.slice(index, index + size)) items[`job:${job.id}`] = job;
      await chrome.storage.local.set(items);
    }
    const all = await chrome.storage.local.get(null);
    return Object.keys(all).filter((key) => key.startsWith("job:")).length;
  }, jobs);
  const seedMs = Date.now() - seedStarted;
  expect(stored).toBe(2000);

  const settleStarted = Date.now();
  await dashboard.evaluate(
    () =>
      new Promise<void>((resolve) => {
        let timer = window.setTimeout(finish, 500);
        function finish(): void {
          chrome.storage.onChanged.removeListener(bump);
          resolve();
        }
        function bump(): void {
          window.clearTimeout(timer);
          timer = window.setTimeout(finish, 500);
        }
        chrome.storage.onChanged.addListener(bump);
      }),
  );
  const settleMs = Date.now() - settleStarted;

  const renderStarted = Date.now();
  await dashboard.goto(`chrome-extension://${extensionId}/dashboard.html#/applications`);
  await expect(dashboard.getByText("2000 applications")).toBeVisible({ timeout: 45_000 });
  const renderMs = Date.now() - renderStarted;

  const searchStarted = Date.now();
  await dashboard.getByLabel("Search applications").fill("zephyr warehouse");
  await expect(dashboard.getByText("1 of 2000 applications")).toBeVisible();
  const searchMs = Date.now() - searchStarted;

  await dashboard.getByLabel("Search applications").fill("");
  await expect(dashboard.getByText("2000 applications")).toBeVisible();

  const filterStarted = Date.now();
  await dashboard.getByRole("button", { name: "Status", exact: true }).click();
  await dashboard.getByRole("checkbox", { name: "Saved" }).check();
  await expect(dashboard.getByText("500 of 2000 applications")).toBeVisible();
  const filterMs = Date.now() - filterStarted;

  const sortStarted = Date.now();
  await dashboard.getByLabel("Sort").selectOption("company");
  await expect(dashboard.getByLabel("Sort")).toHaveValue("company");
  await expect(dashboard.getByText("500 of 2000 applications")).toBeVisible();
  const sortMs = Date.now() - sortStarted;

  await dashboard.getByRole("checkbox", { name: "Saved" }).uncheck();
  await dashboard.getByLabel("Search applications").fill("unique zephyr");
  await expect(dashboard.getByText("1 of 2000 applications")).toBeVisible();
  const move = dashboard.getByRole("combobox", {
    name: "Move to Unique Zephyr Role at Zephyr Labs",
  });
  const moveStarted = Date.now();
  await move.selectOption("applied");
  await expect(move).toHaveValue("applied");
  const moveMs = Date.now() - moveStarted;

  const report = {
    measuredAt: new Date().toISOString(),
    environment: "Playwright Chromium, unpacked extension dashboard",
    note: "Times include rendering in Chrome. They are not the pure 50 ms search budget.",
    samples: [
      { name: "seed 2000 jobs into chrome.storage.local", ms: seedMs },
      { name: "wait until reminder writes go quiet", ms: settleMs },
      { name: "open Applications with 2000 jobs", ms: renderMs },
      { name: "search to 1 match", ms: searchMs },
      { name: "filter status Saved", ms: filterMs },
      { name: "sort company A–Z while filtered", ms: sortMs },
      { name: "move the matching card to Applied", ms: moveMs },
    ],
  };
  mkdirSync("reports", { recursive: true });
  writeFileSync("reports/performance-browser.json", `${JSON.stringify(report, null, 2)}\n`);
  for (const sample of report.samples) {
    console.log(`${String(sample.ms).padStart(8)} ms  ${sample.name}`);
  }
});
