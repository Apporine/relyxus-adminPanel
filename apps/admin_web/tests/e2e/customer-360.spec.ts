import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";

async function gotoReady(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("html")).toHaveAttribute("data-shell-ready", "true");
}

const tabs = [
  "Overview",
  "Contacts",
  "Products",
  "Contracts",
  "Entitlements",
  "Licenses",
  "Deployments",
  "Usage",
  "Support",
  "Success",
  "Finance",
  "Timeline",
  "Audit",
];

test.describe("Customer 360", () => {
  test("shows the header summary, rails and explainable health", async ({ page }) => {
    await gotoReady(page, "/customers/cus_halden");
    await expect(page.getByRole("heading", { level: 1, name: "Halden Mutual" })).toBeVisible();
    const summary = page.getByRole("region", { name: "Customer summary" });
    for (const metric of [
      "Annual contract value",
      "Next renewal",
      "Licenses",
      "Deployments",
      "Open support cases",
      "Health score",
    ]) {
      await expect(summary.getByRole("region", { name: metric })).toBeVisible();
    }
    await expect(
      page.getByRole("complementary", { name: "Customer identity and owners" }),
    ).toContainText("Not assigned");
    await expect(page.getByRole("complementary", { name: "Next actions and risks" })).toContainText(
      "Commercial: risk",
    );
    await expect(page.getByRole("region", { name: /^Health score \d+ \/ 100$/ })).toContainText(
      "JSM-4351 breached SLA",
    );
  });

  for (const tab of tabs) {
    test(`${tab} tab renders and meets WCAG 2.2 AA`, async ({ page }) => {
      await gotoReady(page, `/customers/cus_halden?tab=${tab.toLowerCase()}`);
      const nav = page.getByRole("navigation", { name: "Customer sections" });
      await expect(nav.getByRole("link", { name: tab, exact: true })).toHaveAttribute(
        "aria-current",
        "page",
      );
      await expect(page.getByRole("region", { name: `${tab} section` })).toBeVisible();
      await expectNoA11yViolations(page);
    });
  }

  test("tabs are shareable links and contacts open their detail page", async ({ page }) => {
    await gotoReady(page, "/customers/cus_halden");
    await page
      .getByRole("navigation", { name: "Customer sections" })
      .getByRole("link", { name: "Contacts" })
      .click();
    await expect(page).toHaveURL(/tab=contacts/);
    await expect(page.getByText("Missing security contact")).toBeVisible();

    await page.getByRole("link", { name: "Sanjay Patel" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Sanjay Patel" })).toBeVisible();
    await expect(page.getByText("Inactive", { exact: true }).first()).toBeVisible();
    await expectNoA11yViolations(page);
    await page
      .getByRole("navigation", { name: "Breadcrumb" })
      .getByRole("link", { name: "Halden Mutual" })
      .click();
    await expect(page).toHaveURL(/\/customers\/cus_halden\?tab=contacts/);
  });

  test("an onboarding account without records shows empty states, not zeros", async ({ page }) => {
    await gotoReady(page, "/customers/cus_northwind_uk?tab=licenses");
    await expect(page.getByText("No licenses found")).toBeVisible();
    await page
      .getByRole("navigation", { name: "Customer sections" })
      .getByRole("link", { name: "Contracts" })
      .click();
    await expect(page.getByText("No contracts yet")).toBeVisible();
  });

  test("issue license request uses the spec copy and validates required fields", async ({
    page,
  }) => {
    await gotoReady(page, "/customers/cus_halden");
    await page.getByRole("button", { name: "Issue license request" }).click();
    const dialog = page.getByRole("dialog", { name: "Issue commercial license" });
    await expect(dialog).toHaveAccessibleDescription(
      "This creates a new signed license revision. It does not rebuild or modify the product application image.",
    );
    await dialog.getByRole("button", { name: "Issue license" }).click();
    await expect(dialog.getByLabel("Source contract")).toBeFocused();
    await expectNoA11yViolations(page);
  });

  test("an unknown customer shows the not-found page", async ({ page }) => {
    await page.goto("/customers/cus_does_not_exist");
    await expect(page.getByText("Record not found")).toBeVisible();
  });

  test("the customer list links into Customer 360", async ({ page }) => {
    await gotoReady(page, "/customers");
    await expect(page.locator('[data-hydrated="true"]').first()).toBeAttached();
    await page.getByRole("link", { name: "Atlas Freight Finance" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Atlas Freight Finance" }),
    ).toBeVisible();
  });
});
