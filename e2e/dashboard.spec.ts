import { readFileSync } from "node:fs";
import { expect, test, addApplication } from "./extension";

test.afterEach(async ({ consoleErrors }) => {
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

test("navigates the dashboard and keeps the hash after reload", async ({ dashboard }) => {
  await dashboard.getByRole("link", { name: "Applications", exact: true }).click();
  await expect(dashboard.getByRole("heading", { level: 1, name: "Applications" })).toBeVisible();
  await expect(dashboard).toHaveURL(/#\/applications$/);

  await dashboard.getByRole("link", { name: "Calendar", exact: true }).click();
  await expect(dashboard.getByRole("heading", { level: 1, name: "Calendar" })).toBeVisible();
  await expect(dashboard).toHaveURL(/#\/calendar$/);

  await dashboard.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(dashboard.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  await expect(dashboard.getByText("1.0.0")).toBeVisible();

  await dashboard.reload();
  await expect(dashboard).toHaveURL(/#\/settings$/);
  await expect(dashboard.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();

  await dashboard.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(dashboard.getByRole("heading", { level: 1, name: /opportunity/i })).toBeVisible();
});

test("rejects a non-http link and saves jobs with and without a deadline", async ({
  dashboard,
  extensionContext,
}) => {
  await dashboard.getByRole("button", { name: "Add application", exact: true }).click();
  const dialog = dashboard.getByRole("dialog", { name: "Add an application" });
  await dialog.getByLabel("Job title").fill("Blocked scheme");
  await dialog.getByLabel("Company").fill("Example");
  await dialog.getByLabel("Job URL").fill("javascript:alert(1)");
  await dialog.getByRole("button", { name: "Save application" }).click();
  await expect(dialog.getByText(/http:\/\/ or https:\/\//)).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();

  await addApplication(dashboard, {
    title: "No Deadline Intern",
    company: "Northwind",
    url: "https://example.com/jobs/no-deadline",
  });
  await dashboard.getByRole("link", { name: "Applications", exact: true }).click();
  await expect(
    dashboard.getByRole("button", { name: "No Deadline Intern", exact: true }),
  ).toBeVisible();
  await expect(dashboard.getByText("No deadline provided").first()).toBeVisible();

  const reminderNames = async () => {
    const worker = extensionContext.serviceWorkers()[0];
    if (!worker) return [];
    const names = await worker.evaluate(async () =>
      (await chrome.alarms.getAll()).map((alarm) => alarm.name),
    );
    return names.filter((name) => name.startsWith("jc:reminder:"));
  };
  await expect.poll(reminderNames).toEqual([]);

  await addApplication(dashboard, {
    title: "Deadline Intern",
    company: "Razorpay",
    url: "https://example.com/jobs/with-deadline",
    deadline: "2026-12-31",
  });
  await expect(
    dashboard.getByRole("button", { name: "Deadline Intern", exact: true }),
  ).toBeVisible();
  await expect(dashboard.getByText(/Due /).first()).toBeVisible();
  await expect.poll(reminderNames).toHaveLength(1);
});

test("edits, moves, searches, filters, exports and deletes an application", async ({
  dashboard,
}) => {
  await addApplication(dashboard, {
    title: "Data Analyst Intern",
    company: '=HYPERLINK("https://evil.example","click")',
    url: "https://example.com/jobs/analyst",
    deadline: "2026-12-20",
  });
  await addApplication(dashboard, {
    title: "Python Developer Intern",
    company: "Kalpana Systems",
    url: "https://example.com/jobs/python",
  });

  await dashboard.getByRole("link", { name: "Applications", exact: true }).click();
  await dashboard.getByRole("button", { name: "Data Analyst Intern", exact: true }).click();
  const sheet = dashboard.getByRole("dialog");
  await sheet.getByRole("button", { name: "Edit" }).click();
  await sheet.getByLabel("Job title").fill("Data Analyst Intern, edited");
  await sheet.getByRole("button", { name: "Save changes" }).click();
  await expect(
    dashboard.getByRole("button", { name: "Data Analyst Intern, edited", exact: true }),
  ).toBeVisible();
  await dashboard.keyboard.press("Escape");

  await dashboard
    .getByRole("combobox", { name: "Move to Data Analyst Intern, edited at" })
    .selectOption("applied");
  await expect(dashboard.getByRole("region", { name: /applied, 1 application/i })).toContainText(
    "Data Analyst Intern, edited",
  );

  await dashboard.getByLabel("Search applications").fill("python");
  await expect(dashboard.getByText("1 of 2 applications")).toBeVisible();
  await expect(
    dashboard.getByRole("button", { name: "Python Developer Intern", exact: true }),
  ).toBeVisible();
  await expect(
    dashboard.getByRole("button", { name: "Data Analyst Intern, edited", exact: true }),
  ).toHaveCount(0);

  await dashboard.getByLabel("Search applications").fill("");
  await dashboard.getByRole("button", { name: "Status", exact: true }).click();
  await dashboard.getByRole("checkbox", { name: "Applied" }).check();
  await expect(dashboard.getByText("1 of 2 applications")).toBeVisible();
  await expect(
    dashboard.getByRole("button", { name: "Data Analyst Intern, edited", exact: true }),
  ).toBeVisible();

  const filteredDownload = dashboard.waitForEvent("download");
  await dashboard.getByRole("main").getByRole("button", { name: "Export filtered" }).click();
  const filtered = await filteredDownload;
  expect(filtered.suggestedFilename()).toMatch(/^job-clipper-filtered-\d{4}-\d{2}-\d{2}\.csv$/);
  const filteredText = readFileSync(await filtered.path(), "utf8");
  expect(filteredText.charCodeAt(0)).toBe(0xfeff);
  expect(filteredText).toContain("Data Analyst Intern, edited");
  expect(filteredText).not.toContain("Python Developer Intern");

  await dashboard.getByRole("button", { name: "Clear all" }).click();
  await expect(dashboard.getByText("2 applications")).toBeVisible();

  const allDownload = dashboard.waitForEvent("download");
  await dashboard.getByRole("main").getByRole("button", { name: "Export CSV" }).click();
  const all = await allDownload;
  expect(all.suggestedFilename()).toMatch(/^job-clipper-all-\d{4}-\d{2}-\d{2}\.csv$/);
  const allText = readFileSync(await all.path(), "utf8");
  expect(allText).toContain("'=HYPERLINK(");
  expect(allText).toContain("Python Developer Intern");
  expect(allText).toContain("Data Analyst Intern, edited");

  await dashboard.reload();
  await expect(dashboard).toHaveURL(/#\/applications/);
  await expect(
    dashboard.getByRole("button", { name: "Data Analyst Intern, edited", exact: true }),
  ).toBeVisible();

  await dashboard.getByRole("button", { name: "Python Developer Intern", exact: true }).click();
  await dashboard.getByRole("button", { name: "Delete" }).click();
  await dashboard.getByRole("button", { name: "Cancel" }).click();
  await expect(
    dashboard.getByRole("button", { name: "Python Developer Intern", exact: true }),
  ).toBeVisible();
  await dashboard.getByRole("button", { name: "Delete" }).click();
  await dashboard.getByRole("button", { name: "Delete application" }).click();
  await expect(
    dashboard.getByRole("button", { name: "Python Developer Intern", exact: true }),
  ).toHaveCount(0);
  await expect(dashboard.getByText("1 application")).toBeVisible();
});
