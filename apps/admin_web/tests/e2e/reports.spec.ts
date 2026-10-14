import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";

async function gotoReady(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("html")).toHaveAttribute("data-shell-ready", "true");
}

test.describe("reports", () => {
  test("the library groups reports by family", async ({ page }) => {
    await gotoReady(page, "/analytics");
    await expect(page.getByRole("heading", { level: 1, name: "Report library" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Security" })).toContainText(
      "Privileged role inventory",
    );
    await expectNoA11yViolations(page);
  });

  test("a report runs its filter and sort", async ({ page }) => {
    await gotoReady(page, "/analytics/reports/rpt_value_at_risk");
    await expect(page.getByText("Health is At risk or Critical")).toBeVisible();
    const rows = page.locator('[role="region"][aria-label="Value at risk"] tbody tr');
    await expect(rows).toHaveCount(3);
    await expect(rows.first()).toContainText("Tamsin Capital");
    await expectNoA11yViolations(page);
  });

  test("restricted columns are hidden from the result", async ({ page }) => {
    await gotoReady(page, "/analytics/reports/rpt_privileged_roles");
    await expect(page.getByText("3 columns hidden by your permissions")).toBeVisible();
    const table = page.locator('[role="region"][aria-label="Privileged role inventory"]');
    await expect(table.getByRole("columnheader")).toHaveText(["Staff", "Title"]);
  });

  test("the builder previews approved fields and locks restricted ones", async ({ page }) => {
    await gotoReady(page, "/analytics/builder");
    await page.getByLabel("Dataset").selectOption({ label: "Staff access" });
    await expect(page.getByText("Needs Security Administrator or Auditor").first()).toBeVisible();
    await page.getByLabel("Dataset").selectOption({ label: "Licenses" });
    await page.getByLabel("Filter field").selectOption({ label: "State" });
    await page.getByLabel("Contains").fill("grace");
    await expect(page.getByText(/^\d+ rows match$/)).toBeVisible();
    const preview = page.locator('[role="region"][aria-label="Report preview"]');
    await expect(preview.locator("tbody tr").first()).toContainText("Grace");
    await expectNoA11yViolations(page);
  });

  test("saved views and schedules list their scope and delivery", async ({ page }) => {
    await gotoReady(page, "/analytics/saved-views");
    await expect(
      page.getByRole("link", { name: "Production deployments needing attention" }),
    ).toHaveAttribute("href", "/deployments?environment=production&risk=any");
    await gotoReady(page, "/analytics/schedules");
    const table = page.locator('[role="region"][aria-label="Scheduled reports"]');
    await expect(table.getByRole("row", { name: /Deployments needing attention/ })).toContainText(
      "Failed",
    );
    await expectNoA11yViolations(page);
  });
});

test.describe("data quality", () => {
  test("checks, duplicates and stale sources are actionable", async ({ page }) => {
    await gotoReady(page, "/analytics/data-quality");
    const checks = page.locator('[role="region"][aria-label="Data quality issues"]');
    await expect(checks.getByRole("row", { name: /Missing owners/ })).toContainText("11");
    await expect(checks.getByRole("row", { name: /Orphaned deployments/ })).toContainText(
      "No issues",
    );
    const duplicates = page.locator('[role="region"][aria-label="Duplicate suggestions"]');
    await expect(duplicates).toContainText("Salesforce CRM-01166");
    await expectNoA11yViolations(page);
    await duplicates.getByRole("button", { name: "Review" }).first().click();
    await expect(page.getByRole("dialog", { name: "Review possible duplicate" })).toContainText(
      "Merges need a second approver",
    );
  });
});
