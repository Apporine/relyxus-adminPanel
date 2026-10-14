import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";

async function gotoReady(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("html")).toHaveAttribute("data-shell-ready", "true");
}

test.describe("settings", () => {
  for (const [path, heading] of [
    ["/settings", "Settings"],
    ["/settings/identity", "Identity"],
    ["/settings/notifications", "Notifications and automation"],
    ["/settings/integrations", "Integrations"],
    ["/settings/data-policy", "Data policy"],
    ["/settings/environments", "Environments"],
  ] as const) {
    test(`${heading} renders and meets WCAG 2.2 AA`, async ({ page }) => {
      await gotoReady(page, path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expectNoA11yViolations(page);
    });
  }

  test("integrations show health and only credential references", async ({ page }) => {
    await gotoReady(page, "/settings/integrations");
    const table = page.locator('[role="region"][aria-label="Integrations"]');
    await expect(table.getByRole("row", { name: /NetSuite/ })).toContainText("Failing");
    await expect(table.getByRole("row", { name: /NetSuite/ })).toContainText(
      "secretsmanager://apc/prod/netsuite",
    );
  });

  test("automation rules never issue or revoke licenses", async ({ page }) => {
    await gotoReady(page, "/settings/notifications");
    const rules = page.locator('[role="region"][aria-label="Automation rules"]');
    await expect(rules.getByRole("row", { name: /Signing key rotation due/ })).toContainText(
      "Test mode",
    );
    await expect(rules).not.toContainText(/revoke license/i);
  });
});

test.describe("operator assistant", () => {
  test("briefs link every line to its records", async ({ page }) => {
    await gotoReady(page, "/");
    await page.getByRole("button", { name: "Open operator assistant" }).click();
    const panel = page.getByRole("dialog", { name: "Operator assistant" });
    await expect(panel).toContainText("Read only");
    const portfolio = panel.getByRole("region", { name: "Portfolio brief" });
    await expect(portfolio.getByRole("link")).toHaveCount(5);
    await expectNoA11yViolations(page);

    await panel.getByRole("button", { name: "Audit" }).click();
    await panel
      .getByLabel("Action")
      .selectOption({ label: "Requested break glass access (cor_inc2307)" });
    const audit = panel.getByRole("region", { name: "Audit explanation" });
    await expect(audit.getByRole("link")).toHaveCount(6);
    await audit.getByRole("link").first().click();
    await expect(page).toHaveURL(/\/audit\?event=aud_009121/);
  });

  test("questions become permission-aware filter links", async ({ page }) => {
    await gotoReady(page, "/");
    await page.getByRole("button", { name: "Open operator assistant" }).click();
    const panel = page.getByRole("dialog", { name: "Operator assistant" });
    await panel.getByRole("button", { name: "Ask" }).click();
    await panel.getByLabel("Question").fill("Which licenses are in grace?");
    await panel.getByRole("button", { name: "Find records" }).click();
    await panel.getByRole("link", { name: /Licenses in grace period/ }).click();
    await expect(page).toHaveURL(/\/licensing\?state=grace/);
  });
});
