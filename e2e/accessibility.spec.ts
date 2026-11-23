import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { addApplication, expect, test } from "./extension";

async function expectNoViolations(page: Page, label: string): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const summary = results.violations
    .map(
      (violation) =>
        `${violation.id}: ${violation.help} (${violation.nodes.length} node${violation.nodes.length === 1 ? "" : "s"})`,
    )
    .join("\n");
  expect(results.violations, `${label}\n${summary}`).toEqual([]);
}

test("keyboard focus, dialogs and axe on the extension dashboard", async ({ dashboard }) => {
  await dashboard.keyboard.press("Tab");
  const skip = dashboard.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  const skipBox = await skip.boundingBox();
  expect(skipBox?.width ?? 0).toBeGreaterThan(20);

  await dashboard.keyboard.press("Enter");
  await expect(dashboard.locator("#main")).toBeFocused();

  await dashboard.getByRole("button", { name: "Add application", exact: true }).focus();
  await dashboard.keyboard.press("Enter");
  const dialog = dashboard.getByRole("dialog", { name: "Add an application" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Job title")).toBeFocused();
  await expectNoViolations(dashboard, "add application dialog");
  await dashboard.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  for (const route of ["Applications", "Calendar", "Settings", "Overview"] as const) {
    await dashboard.getByRole("link", { name: route, exact: true }).click();
    await expectNoViolations(dashboard, route);
  }

  await addApplication(dashboard, {
    title: "Accessible role",
    company: "Northwind",
    url: "https://example.com/jobs/accessible",
  });
  await dashboard.getByRole("link", { name: "Applications", exact: true }).click();
  await dashboard.getByRole("button", { name: "Accessible role", exact: true }).click();
  await expect(dashboard.getByRole("dialog")).toBeVisible();
  await expectNoViolations(dashboard, "job sheet");
  await dashboard.keyboard.press("Escape");
  await expect(dashboard.getByRole("dialog")).toBeHidden();
});
