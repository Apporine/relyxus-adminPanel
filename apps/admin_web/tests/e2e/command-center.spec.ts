import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";

async function gotoReady(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("html")).toHaveAttribute("data-shell-ready", "true");
}

const metrics = [
  "Active customers",
  "Annual contract value",
  "Renewals in 120 days",
  "Production deployments",
  "License risk",
  "Pending approvals",
];

test.describe("portfolio command center", () => {
  test("every summary metric drills through to its records", async ({ page }) => {
    await gotoReady(page, "/");
    const summary = page.getByRole("region", { name: "Portfolio summary" });
    for (const metric of metrics) {
      const card = summary.getByRole("region", { name: metric });
      await expect(card).toBeVisible();
      await expect(card.getByRole("link", { name: `View records for ${metric}` })).toHaveAttribute(
        "href",
        /.+/,
      );
    }
    await expectNoA11yViolations(page);
  });

  test("filters update the URL and scope the metrics; clear filters resets", async ({ page }) => {
    await gotoReady(page, "/");
    const active = page.getByRole("region", { name: "Active customers" });
    await expect(active).toContainText("12");

    await page.getByLabel("Region").selectOption("EU");
    await expect(page).toHaveURL(/region=EU/);
    await expect(active).toContainText("2");
    await expect(
      page.getByText("Monthly history is portfolio-wide and ignores customer filters."),
    ).toBeVisible();
    await expectNoA11yViolations(page);

    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page).not.toHaveURL(/region=/);
    await expect(active).toContainText("12");
  });

  test("shows an empty state when no customer matches", async ({ page }) => {
    await gotoReady(page, "/?region=APAC&risk=critical");
    await expect(page.getByText("No customers match these filters")).toBeVisible();
    await expect(page.getByRole("link", { name: "Clear filters" })).toHaveAttribute("href", "/");
  });

  test("the inbox lists the most urgent work first", async ({ page }) => {
    await gotoReady(page, "/");
    const inbox = page.getByRole("region", { name: "Operational inbox" });
    await expect(inbox.getByRole("listitem").first()).toContainText("Critical");
  });

  test("charts are keyboard readable and offer a table view", async ({ page }) => {
    await gotoReady(page, "/");
    const chart = page.getByRole("group", { name: /Administrative actions and failures per day/ });
    await chart.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByRole("status").filter({ hasText: "Actions" })).toBeVisible();

    const audit = page.getByRole("region", { name: "Audit activity" });
    await audit.getByText("View as table").click();
    await expect(audit.getByRole("table")).toBeVisible();
  });

  test("create customer uses the spec copy and never pretends to save", async ({ page }) => {
    await gotoReady(page, "/");
    await page.getByRole("button", { name: "Create customer" }).click();
    const dialog = page.getByRole("dialog", { name: "Create customer" });
    await expect(dialog).toHaveAccessibleDescription(
      "Create a new Apporine customer record. You can add products, contracts, licenses and deployments after the customer exists.",
    );
    await expectNoA11yViolations(page);

    await dialog.getByLabel("Legal name").fill("Example Holdings Ltd");
    await dialog.getByLabel("Display name").fill("Example Holdings");
    await dialog.getByLabel("Headquarters country").fill("United Kingdom");
    await dialog.getByRole("button", { name: "Create customer" }).click();
    await expect(dialog.getByText("Not connected to the Control API")).toBeVisible();
    await dialog.getByRole("button", { name: "Close", exact: true }).first().click();
    await expect(dialog).toBeHidden();
  });
});
