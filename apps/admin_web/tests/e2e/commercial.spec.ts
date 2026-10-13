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

const contractsTable = '[role="region"][aria-label="Contracts"]';

test.describe("contracts", () => {
  test("lists contracts with notice and renewal stage, accessibly", async ({ page }) => {
    await gotoInteractive(page, "/commercial");
    await expect(page.getByRole("heading", { level: 1, name: "Commercial" })).toBeVisible();
    await expect(
      page.locator(contractsTable).getByRole("row", { name: /Halden Mutual/ }),
    ).toContainText("Negotiation");
    await expectNoA11yViolations(page);
  });

  test("the command center renewal drill-through filters to 120 days", async ({ page }) => {
    await gotoInteractive(page, "/commercial?renewal=120");
    await expect(page.getByLabel("Ends within")).toHaveValue("120");
    await expect(page.locator(`${contractsTable} tbody tr`)).toHaveCount(6);
  });

  test("the create contract quick action opens the spec dialog", async ({ page }) => {
    await gotoReady(page, "/commercial?create=1");
    await expect(
      page.getByRole("dialog", { name: "Create contract record" }),
    ).toHaveAccessibleDescription(
      "Create the operating contract record and link the approved source document or external system reference.",
    );
  });

  test("contract detail shows scope against the signed license", async ({ page }) => {
    await gotoReady(page, "/commercial/contracts/ctr_meridian");
    const scope = page.locator('[role="region"][aria-label^="Scope of"]');
    await expect(scope.getByRole("row", { name: /Production deployments/ })).toContainText(
      "differs",
    );
    await expect(page.getByText("No payment or card data is stored here.")).toBeVisible();
    await expectNoA11yViolations(page);
  });
});

test.describe("renewals", () => {
  test("the radar groups renewals by window with value and next action", async ({ page }) => {
    await gotoReady(page, "/commercial/renewals");
    const within30 = page.getByRole("region", { name: /Within 30 days/ });
    await expect(within30.getByRole("article")).toHaveCount(1);
    await expect(within30).toContainText("Notice passed. Send the renewal proposal");
    await expectNoA11yViolations(page);
  });

  test("the workspace shows countdown, value, health and stage", async ({ page }) => {
    await gotoReady(page, "/commercial/renewals/ctr_halden");
    await expect(
      page.getByRole("heading", { level: 1, name: "Renewal: Halden Mutual" }),
    ).toBeVisible();
    await expect(page.getByRole("region", { name: "Renewal summary" })).toContainText(
      "Notice deadline passed",
    );
    await expect(
      page.getByRole("list", { name: "Renewal stages" }).locator('[aria-current="step"]'),
    ).toHaveText("Negotiation");
    await expectNoA11yViolations(page);
    await page.getByRole("button", { name: "Create renewal proposal" }).click();
    const dialog = page.getByRole("dialog", { name: "Create renewal proposal" });
    await dialog.getByRole("button", { name: "Create proposal" }).click();
    await expect(dialog.getByText("Not connected to the Control API")).toBeVisible();
  });
});

test.describe("entitlements", () => {
  test("definitions list type, validation and lifecycle", async ({ page }) => {
    await gotoReady(page, "/commercial/entitlements");
    const table = page.locator('[role="region"][aria-label="Relyxus entitlement definitions"]');
    await expect(table.getByRole("row", { name: /Legacy CSV export/ })).toContainText("Deprecated");
    await expect(page.getByText("Security controls are never entitlements")).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("drift review compares all four sources", async ({ page }) => {
    await gotoReady(page, "/commercial/drift");
    await expect(page.getByText("3 mismatches across 3 customers.")).toBeVisible();
    await expect(
      page.getByText("Deployments report 5 non-production deployments; the license allows 4."),
    ).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("customer entitlements show sources and preview a change", async ({ page }) => {
    await gotoReady(page, "/commercial/entitlements/cus_tamsin");
    const table = page.locator('[role="region"][aria-label="Relyxus entitlements"]');
    const row = table.getByRole("row", { name: /Regulatory reporting pack/ });
    await expect(row).toContainText("Entitlement not yet signed");
    await expect(row).toContainText("apr_1018");
    await expectNoA11yViolations(page);
    await row.getByRole("button", { name: "Propose change" }).click();
    await expect(
      page.getByRole("dialog", { name: "Change regulatory reporting pack" }),
    ).toBeVisible();
  });

  test("an unknown contract shows the not-found page", async ({ page }) => {
    await page.goto("/commercial/contracts/ctr_missing");
    await expect(page.getByText("Record not found")).toBeVisible();
  });
});
