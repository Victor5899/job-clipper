import { existsSync } from "node:fs";
import path from "node:path";
import { test as base, chromium, expect, type BrowserContext, type Page } from "@playwright/test";

const extensionPath = path.resolve("dist");

if (!existsSync(path.join(extensionPath, "manifest.json"))) {
  throw new Error("dist/manifest.json is missing. Run npm run build before the end-to-end tests.");
}
if (!existsSync(path.join(extensionPath, "extractor.js"))) {
  throw new Error("dist/extractor.js is missing. Run npm run build before the end-to-end tests.");
}

async function extensionPage(context: BrowserContext, extensionId: string): Promise<Page> {
  const prefix = `chrome-extension://${extensionId}/dashboard.html`;
  const started = Date.now();
  let page = context.pages().find((item) => item.url().startsWith(prefix));
  while (!page && Date.now() - started < 10_000) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    page = context.pages().find((item) => item.url().startsWith(prefix));
  }
  if (!page) {
    page = await context.newPage();
    await page.goto(prefix);
  }
  return page;
}

export const test = base.extend<
  { dashboard: Page; consoleErrors: string[] },
  { extensionContext: BrowserContext; extensionId: string }
>({
  extensionContext: [
    // Playwright's fixture signature passes an empty options object when a fixture has no dependencies.
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const context = await chromium.launchPersistentContext("", {
        channel: "chromium",
        headless: true,
        viewport: { width: 1280, height: 800 },
        args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
      });
      await use(context);
      await context.close();
    },
    { scope: "worker" },
  ],
  extensionId: [
    async ({ extensionContext }, use) => {
      let [worker] = extensionContext.serviceWorkers();
      if (!worker) worker = await extensionContext.waitForEvent("serviceworker");
      await use(new URL(worker.url()).host);
    },
    { scope: "worker" },
  ],
  consoleErrors: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const errors: string[] = [];
      await use(errors);
    },
    { scope: "test" },
  ],
  dashboard: async ({ extensionContext, extensionId, consoleErrors }, use) => {
    const page = await extensionPage(extensionContext, extensionId);
    const onPageError = (error: Error) => consoleErrors.push(error.message);
    const onConsole = (message: { type: () => string; text: () => string }) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    };
    page.on("pageerror", onPageError);
    page.on("console", onConsole);
    await page.evaluate(async () => {
      const all = await chrome.storage.local.get(null);
      const keys = Object.keys(all).filter((key) => key.startsWith("job:"));
      if (keys.length > 0) await chrome.storage.local.remove(keys);
    });
    await page.goto(`chrome-extension://${extensionId}/dashboard.html#/overview`);
    await page.getByRole("heading", { level: 1, name: /opportunity/i }).waitFor();
    await use(page);
    page.off("pageerror", onPageError);
    page.off("console", onConsole);
  },
});

export { expect };

export async function addApplication(
  page: Page,
  job: { title: string; company: string; url: string; deadline?: string },
): Promise<void> {
  await page.getByRole("button", { name: "Add application", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add an application" });
  await dialog.getByLabel("Job title").fill(job.title);
  await dialog.getByLabel("Company").fill(job.company);
  await dialog.getByLabel("Job URL").fill(job.url);
  if (job.deadline) await dialog.getByLabel(/^Deadline/).fill(job.deadline);
  await dialog.getByRole("button", { name: "Save application" }).click();
  await expect(dialog).toBeHidden();
}
