import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";

async function gotoReady(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("html")).toHaveAttribute("data-shell-ready", "true");
}

test.describe("customer success", () => {
  test("the health overview lists every customer by score", async ({ page }) => {
    await gotoReady(page, "/success");
    await expect(
      page.getByRole("heading", { level: 1, name: "Success and support" }),
    ).toBeVisible();
    const table = page.locator('[role="region"][aria-label="Customer health scores"]');
    await expect(table.getByRole("row", { name: /Halden Mutual/ })).toContainText(
      "Until 9 Nov 2026",
    );
    await expectNoA11yViolations(page);
  });

  test("health detail keeps the calculated value beside an override", async ({ page }) => {
    await gotoReady(page, "/success/health/cus_halden");
    const factors = page.getByRole("region", { name: "Factor contribution" });
    await expect(factors).toContainText("Override: Attention");
    await expect(factors).toContainText("Calculated:");
    await expectNoA11yViolations(page);
  });

  test("the success plan shows goals and milestones", async ({ page }) => {
    await gotoReady(page, "/success/plans/cus_northwind");
    await expect(page.getByRole("region", { name: "Goals" })).toContainText(
      "Automate regulatory reporting",
    );
    await expect(page.getByRole("region", { name: "Milestones" })).toContainText(
      "Second production region live",
    );
    await expectNoA11yViolations(page);
  });

  test("QBR sensitive notes are restricted by role", async ({ page }) => {
    await gotoReady(page, "/success/qbrs/qbr_northwind_q3");
    await expect(page.getByRole("region", { name: "Sensitive notes" })).toContainText("Restricted");
    await expect(page.getByText("Budget pressure")).toHaveCount(0);
    await expectNoA11yViolations(page);
  });

  test("the risk register orders open risks by severity", async ({ page }) => {
    await gotoReady(page, "/success/risks");
    const rows = page.locator('[role="region"][aria-label="Risk register"] tbody tr');
    await expect(rows.first()).toContainText("High");
    await expect(page.getByText("5 open risks")).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("the onboarding board shows checklists by stage", async ({ page }) => {
    await gotoReady(page, "/success/onboarding");
    const security = page.getByRole("region", { name: /Security review/ });
    await expect(security.getByRole("article", { name: "Kestrel Health" })).toContainText(
      "blocked",
    );
    await expectNoA11yViolations(page);
  });
});

test.describe("support", () => {
  test("the overview lists case references, escalations and recurring issues", async ({ page }) => {
    await gotoReady(page, "/success/support");
    await expect(page.getByRole("region", { name: "Active escalations" })).toContainText("Level 3");
    await expect(page.getByRole("region", { name: "Recurring issues" })).toContainText(
      "Offline license import rejected",
    );
    await expectNoA11yViolations(page);
  });

  test("the escalation workspace shows cadence, owners and entitlement", async ({ page }) => {
    await gotoReady(page, "/success/support/cases/sc_06");
    await expect(page.getByRole("region", { name: "Escalation workspace" })).toContainText(
      "Every 4 hours",
    );
    await expect(page.getByRole("complementary", { name: "Support entitlement" })).toContainText(
      "24 x 7",
    );
    await expect(page.getByRole("complementary", { name: "Support entitlement" })).toContainText(
      "Executives on both sides",
    );
    await expectNoA11yViolations(page);
  });

  test("the SLA report measures compliance and first response", async ({ page }) => {
    await gotoReady(page, "/success/support/sla");
    const table = page.locator('[role="region"][aria-label="SLA by severity"]');
    await expect(table.getByRole("row", { name: /Sev 3/ })).toContainText("75%");
    await expectNoA11yViolations(page);
  });

  test("an unknown case shows the not-found page", async ({ page }) => {
    await page.goto("/success/support/cases/sc_missing");
    await expect(page.getByText("Record not found")).toBeVisible();
  });
});
