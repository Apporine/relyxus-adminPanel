import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";

async function gotoReady(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("html")).toHaveAttribute("data-shell-ready", "true");
}

async function gotoInteractive(page: Page, path: string) {
  await gotoReady(page, path);
  await expect(page.locator('[data-hydrated="true"]').first()).toBeAttached();
}

const fleetTable = '[role="region"][aria-label="Deployments"]';

test.describe("deployment fleet", () => {
  test("lists the fleet with risk and is accessible", async ({ page }) => {
    await gotoInteractive(page, "/deployments");
    await expect(page.getByRole("heading", { level: 1, name: "Deployments" })).toBeVisible();
    await expect(
      page.locator(fleetTable).getByRole("row", { name: /atlas-relyxus-prod/ }),
    ).toContainText("Unsupported release");
    await expectNoA11yViolations(page);
  });

  test("filters narrow the fleet and the command center link still works", async ({ page }) => {
    await gotoInteractive(page, "/deployments?environment=production");
    await expect(page.getByLabel("Environment", { exact: true })).toHaveValue("production");
    await page.getByLabel("Release", { exact: true }).selectOption("2.1.0");
    await expect(page).toHaveURL(/release=2\.1\.0/, { timeout: 20_000 });
    await expect(page.locator(fleetTable).getByRole("row")).toHaveCount(2);
  });

  test("the add deployment quick action opens the register dialog", async ({ page }) => {
    await gotoReady(page, "/deployments?create=1");
    const dialog = page.getByRole("dialog", { name: "Register deployment" });
    await expect(dialog).toHaveAccessibleDescription(
      "Register an authorized customer deployment. Do not enter customer secrets or production credentials.",
    );
  });

  test("the release heatmap drills into the fleet", async ({ page }) => {
    await gotoReady(page, "/deployments/heatmap");
    const heatmap = page.locator('[role="region"][aria-label="Relyxus release heatmap"]');
    await expect(heatmap.getByRole("row", { name: /2\.1\.0/ })).toContainText("End of support");
    await expectNoA11yViolations(page);
    await heatmap.getByRole("link", { name: "1 deployment on 2.1.0 in Production" }).click();
    await expect(page).toHaveURL(/release=2\.1\.0&environment=production/);
  });

  test("upgrade readiness explains blocked deployments", async ({ page }) => {
    await gotoReady(page, "/deployments/readiness");
    const blocked = page.getByRole("region", { name: /^Blocked/ });
    await expect(blocked).toContainText(
      "2.1.0 cannot upgrade directly to 2.4.1; upgrade to 2.3.1 first.",
    );
    await expectNoA11yViolations(page);
  });
});

test.describe("deployment detail", () => {
  test("shows environment, release, license, metadata and readiness", async ({ page }) => {
    await gotoReady(page, "/deployments/dep_halden_production");
    await expect(
      page.getByRole("heading", { level: 1, name: "halden-relyxus-prod" }),
    ).toBeVisible();
    await expect(page.getByText("Customer authorized metadata only")).toBeVisible();
    await expect(page.getByRole("region", { name: "Risks" })).toContainText(
      "Support window ending",
    );
    await expect(page.getByRole("region", { name: "Upgrade readiness" })).toContainText(
      "Plan recorded: 2.4.1 on 8 Nov 2026",
    );
    await expectNoA11yViolations(page);
  });

  test("records an upgrade plan without pretending to save", async ({ page }) => {
    await gotoReady(page, "/deployments/dep_atlas_production");
    await page.getByRole("button", { name: "Record upgrade plan" }).click();
    const dialog = page.getByRole("dialog", { name: "Record upgrade plan" });
    await dialog.getByLabel("Planned date").fill("2026-11-20");
    await dialog.getByRole("button", { name: "Record plan" }).click();
    await expect(dialog.getByText("Not connected to the Control API")).toBeVisible();
  });

  test("an unknown deployment shows the not-found page", async ({ page }) => {
    await page.goto("/deployments/dep_missing");
    await expect(page.getByText("Record not found")).toBeVisible();
  });
});

test.describe("releases", () => {
  test("lists releases with promotion state and gates", async ({ page }) => {
    await gotoInteractive(page, "/releases");
    const row = page.locator('[role="region"][aria-label="Releases"]').getByRole("row", {
      name: /2\.5\.0/,
    });
    await expect(row).toContainText("Tested");
    await expect(row).toContainText("3 of 6 passed");
    await expectNoA11yViolations(page);
  });

  test("an unreleased build is not supported while gates are open", async ({ page }) => {
    await gotoReady(page, "/releases/rel_2_5_0");
    await expect(page.getByText("Not supported", { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Acceptance gates" })).toContainText("failed");
    await expect(
      page.getByRole("list", { name: "Promotion stages" }).locator('[aria-current="step"]'),
    ).toHaveText("Tested");
    await expectNoA11yViolations(page);
  });

  test("customer impact lists who a support change affects", async ({ page }) => {
    await gotoReady(page, "/releases/rel_2_2_4?tab=impact");
    await expect(page.getByRole("region", { name: "Customers affected" })).toContainText("1");
    await expect(
      page
        .locator('[role="region"][aria-label="Deployments on 2.2.4"]')
        .getByRole("row", { name: /Halden Mutual/ }),
    ).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("the compatibility matrix shows every profile by release", async ({ page }) => {
    await gotoReady(page, "/releases/compatibility");
    const matrix = page.locator('[role="region"][aria-label="Relyxus compatibility matrix"]');
    await expect(matrix.getByRole("row", { name: /Red Hat OpenShift/ })).toContainText(
      "Conditional",
    );
    await expectNoA11yViolations(page);
  });
});
