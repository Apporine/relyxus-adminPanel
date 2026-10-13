import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";

async function gotoReady(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("html")).toHaveAttribute("data-shell-ready", "true");
}

test.describe("finance", () => {
  test("the commercial summary shows value, pipeline and concentration", async ({ page }) => {
    await gotoReady(page, "/analytics/finance");
    await expect(page.getByRole("heading", { level: 1, name: "Commercial summary" })).toBeVisible();
    await expect(page.getByText("Invoices and payments unavailable: NetSuite")).toBeVisible();
    const pipeline = page.locator('[role="region"][aria-label="Renewal pipeline"]');
    await expect(pipeline.getByRole("row", { name: /Next 90 days/ })).toContainText(
      "Halden Mutual",
    );
    await expect(
      page.getByRole("region", { name: "Revenue concentration by customer" }),
    ).toContainText("Meridian Clearing");
    await expectNoA11yViolations(page);
  });

  test("cost to serve labels estimates and switches allocation views", async ({ page }) => {
    await gotoReady(page, "/analytics/finance/cost-to-serve");
    await expect(page.getByText("Apporine cloud cost delayed")).toBeVisible();
    const table = page.locator('[role="region"][aria-label="Cost to serve by customer"]');
    await expect(table.getByRole("row", { name: /Corvane Bank/ })).toContainText(
      "converted from EUR",
    );
    await expect(table.getByRole("row", { name: /Kestrel Health/ })).toContainText(
      "No contract value",
    );
    await expectNoA11yViolations(page);
    await page
      .getByRole("navigation", { name: "Allocation view" })
      .getByRole("link", { name: "Direct cost only" })
      .click();
    await expect(page).toHaveURL(/allocation=direct/);
    await expect(table.getByRole("row", { name: /Northwind Payments UK/ })).toBeVisible();
  });

  test("the margin estimate shows a range and the customers left out", async ({ page }) => {
    await gotoReady(page, "/analytics/finance/margin");
    const table = page.locator('[role="region"][aria-label="Margin estimate by customer"]');
    await expect(table.getByRole("row", { name: /Meridian Clearing/ })).toContainText(" to ");
    await expect(page.getByText("3 customers not estimated")).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("cost attribution shows tag coverage and gaps", async ({ page }) => {
    await gotoReady(page, "/analytics/finance/attribution");
    await expect(page.getByRole("region", { name: "Untagged" })).toContainText("8%");
    await expect(page.getByRole("region", { name: "Tagging gaps" })).toContainText(
      "Shared networking and egress",
    );
    await expectNoA11yViolations(page);
  });
});
