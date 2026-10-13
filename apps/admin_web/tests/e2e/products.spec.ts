import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";

async function gotoReady(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("html")).toHaveAttribute("data-shell-ready", "true");
}

test.describe("products", () => {
  test("the portfolio lists every product record and is accessible", async ({ page }) => {
    await gotoReady(page, "/products");
    await expect(page.getByRole("article")).toHaveCount(2);
    await expect(page.getByRole("article", { name: "Relyxus" })).toContainText("Release train");
    await expectNoA11yViolations(page);
    await page.getByRole("link", { name: "Apporine Sentinel" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Apporine Sentinel" })).toBeVisible();
  });

  test("the overview drills through to records", async ({ page }) => {
    await gotoReady(page, "/products/prd_relyxus");
    const card = page.getByRole("region", { name: "Deployments", exact: true });
    await expect(card.getByRole("link", { name: "View records for Deployments" })).toHaveAttribute(
      "href",
      "/deployments?product=prd_relyxus",
    );
    await expectNoA11yViolations(page);
  });

  test("the entitlement catalog shows classification and deprecation", async ({ page }) => {
    await gotoReady(page, "/products/prd_relyxus?tab=catalog");
    const catalog = page.locator('[role="region"][aria-label="Entitlement catalog"]');
    await expect(catalog.getByRole("row", { name: /AI routing module/ })).toContainText(
      "Confidential",
    );
    await expect(catalog.getByRole("row", { name: /Legacy CSV export/ })).toContainText(
      "Deprecated",
    );
    await expectNoA11yViolations(page);
  });

  test("product customers show value, licenses, deployments and renewal exposure", async ({
    page,
  }) => {
    await gotoReady(page, "/products/prd_relyxus?tab=customers");
    const table = page.locator('[role="region"][aria-label="Relyxus customers"]');
    await expect(table.getByRole("row", { name: /Halden Mutual/ })).toContainText(
      "Ends 14 Nov 2026",
    );
    await expectNoA11yViolations(page);
  });

  test("the release train links every release with its support window", async ({ page }) => {
    await gotoReady(page, "/products/prd_relyxus?tab=releases");
    const section = page.getByRole("region", { name: "Release train section" });
    await expect(section.getByRole("link", { name: "2.5.0" })).toHaveAttribute(
      "href",
      "/releases/rel_2_5_0",
    );
    await expect(section).toContainText("End of support 30 Sept 2027");
    await expectNoA11yViolations(page);
  });

  test("an unknown product shows the not-found page", async ({ page }) => {
    await page.goto("/products/prd_missing");
    await expect(page.getByText("Record not found")).toBeVisible();
  });
});
