import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";

async function gotoReady(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("html")).toHaveAttribute("data-shell-ready", "true");
  // Filter regions stream in after the shell; wait until their handlers are attached.
  await expect(page.locator('[data-hydrated="true"]').first()).toBeAttached();
}

const results = (page: Page) => page.getByRole("region", { name: "Customers" }).getByRole("row");

test.describe("customer list", () => {
  test("lists customers with list states and no accessibility violations", async ({ page }) => {
    await gotoReady(page, "/customers");
    await expect(page.getByRole("heading", { level: 1, name: "Customers" })).toBeVisible();
    await expect(page.getByText("17 of 17 customers")).toBeVisible();
    await expect(page.getByText("Salesforce sync delayed")).toBeVisible();
    await expect(page.getByText("Possible duplicate customers")).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("finds a customer by name, ID, owner, product or region", async ({ page }) => {
    await gotoReady(page, "/customers");
    const search = page.getByRole("searchbox", { name: "Find customers" });
    for (const [query, expected] of [
      ["halden", "Halden Mutual"],
      ["cus_qadira", "Qadira Exchange"],
      ["sentinel", "Meridian Clearing"],
      ["apac", "Harbourline Logistics"],
    ] as const) {
      await search.fill(query);
      await expect(results(page).nth(1)).toContainText(expected);
    }
    await search.fill("no such customer");
    await expect(page.getByText("No customers match this view")).toBeVisible();
  });

  test("saved views and filters update the URL and can be cleared", async ({ page }) => {
    await gotoReady(page, "/customers");
    await page.getByRole("button", { name: "At risk", exact: true }).click();
    await expect(page).toHaveURL(/view=at-risk/);
    await expect(page.getByText("2 of 17 customers")).toBeVisible();

    await page.getByRole("button", { name: "Clear filters" }).click();
    await page
      .getByRole("complementary", { name: "Customer filters" })
      .getByLabel("Renewal", { exact: true })
      .selectOption("30");
    await expect(page).toHaveURL(/renewal=30/);
    await expect(results(page).nth(1)).toContainText("Tamsin Capital");
  });

  test("opens from a drill-through link with filters applied", async ({ page }) => {
    await gotoReady(page, "/customers?health=critical");
    await expect(page.getByText("1 of 17 customers")).toBeVisible();
    await expect(results(page).nth(1)).toContainText("Atlas Freight Finance");
  });

  test("sorts, manages columns and offers only safe bulk actions", async ({ page }) => {
    await gotoReady(page, "/customers");
    await page
      .getByRole("region", { name: "Customers" })
      .getByRole("button", { name: "Customer", exact: true })
      .click();
    await expect(page.getByRole("columnheader", { name: "Customer", exact: true })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    await expect(results(page).nth(1)).toContainText("Atlas Freight Finance");

    await page.getByRole("button", { name: "Columns" }).click();
    await page.getByRole("checkbox", { name: "Products" }).uncheck();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("columnheader", { name: "Products" })).toHaveCount(0);

    await page.getByRole("checkbox", { name: "Select Halden Mutual" }).check();
    const bulk = page.getByRole("region", { name: "Bulk actions" });
    await expect(bulk).toContainText("1 selected");
    await expect(bulk.getByRole("button")).toHaveText([
      "Create task",
      "Export selected",
      "Clear selection",
    ]);
  });

  test("hides the filter rail to widen the table", async ({ page }) => {
    await gotoReady(page, "/customers");
    await page.getByRole("button", { name: "Hide filters" }).click();
    await expect(page.getByRole("complementary", { name: "Customer filters" })).toBeHidden();
    await page.getByRole("button", { name: "Show filters" }).click();
    await expect(page.getByRole("complementary", { name: "Customer filters" })).toBeVisible();
  });
});
