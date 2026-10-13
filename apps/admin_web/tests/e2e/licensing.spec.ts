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

const transition = { timeout: 20_000 };

test.describe("license list", () => {
  test("lists licenses with state and risk, and is accessible", async ({ page }) => {
    await gotoInteractive(page, "/licensing");
    await expect(page.getByRole("heading", { level: 1, name: "Licensing" })).toBeVisible();
    await expect(page.getByRole("row", { name: /LIC_00409/ })).toContainText("In grace period");
    await expectNoA11yViolations(page);
  });

  test("risk drill-through and filters narrow the list", async ({ page }) => {
    await gotoInteractive(page, "/licensing?risk=any");
    await expect(page.getByText(/^\d+ of \d+ licenses$/)).toContainText("3 of");
    await page.getByLabel("State", { exact: true }).selectOption("grace");
    await expect(page).toHaveURL(/state=grace/, transition);
    await expect(
      page.locator('[role="region"][aria-label="Licenses"]').getByRole("row"),
    ).toHaveCount(2);

    await page.getByRole("searchbox", { name: "Search" }).fill("nothing-matches");
    await page.keyboard.press("Enter");
    await expect(page.getByText("No licenses found")).toBeVisible(transition);
  });
});

test.describe("license detail", () => {
  test("shows status, validity, bindings and signed entitlements", async ({ page }) => {
    await gotoReady(page, "/licensing/LIC_00409");
    await expect(page.getByRole("heading", { level: 1, name: "LIC_00409" })).toBeVisible();
    await expect(page.getByText("In grace period", { exact: true })).toBeVisible();
    await expect(page.getByRole("meter", { name: "Deployment allowance used" })).toHaveAttribute(
      "aria-valuenow",
      "1",
    );
    await expect(
      page.locator('[role="region"][aria-label="Signed entitlements, revision 2"]'),
    ).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("older revisions are viewable and marked immutable", async ({ page }) => {
    await gotoReady(page, "/licensing/LIC_00409");
    await page
      .getByRole("navigation", { name: "Revisions" })
      .getByRole("link", { name: /Revision 1/ })
      .click();
    await expect(page).toHaveURL(/rev=1/);
    await expect(page.getByText("Viewing superseded revision 1")).toBeVisible();
    await page
      .getByRole("navigation", { name: "License sections" })
      .getByRole("link", { name: "Revisions" })
      .click();
    await expect(
      page.locator('[role="region"][aria-label="Revision history"]').getByRole("row"),
    ).toHaveCount(3);
    await expectNoA11yViolations(page);
  });

  test("a pending request blocks a second one and explains why", async ({ page }) => {
    await gotoReady(page, "/licensing/LIC_00391");
    await expect(page.getByText("License renewal awaiting approval")).toBeVisible();
    await expect(page.getByRole("button", { name: "Renew license" })).toBeDisabled();
    await expect(page.locator("#unavailable-actions")).toContainText(
      "Request apr_1042 is already awaiting a decision.",
    );
    await expect(
      page.locator('[role="region"][aria-label="Proposed changes in apr_1042"]'),
    ).toContainText("14 Nov 2027");
  });

  for (const tab of ["Deployments", "Delivery", "Audit"]) {
    test(`${tab} tab is accessible`, async ({ page }) => {
      await gotoReady(page, `/licensing/LIC_00400?tab=${tab.toLowerCase()}`);
      await expect(
        page.getByRole("navigation", { name: "License sections" }).getByRole("link", { name: tab }),
      ).toHaveAttribute("aria-current", "page");
      await expectNoA11yViolations(page);
    });
  }
});

test.describe("governed flows", () => {
  test("revoke needs a reason, communication state and typed confirmation", async ({ page }) => {
    await gotoInteractive(page, "/licensing/LIC_00388/revoke");
    await expect(page.getByRole("heading", { level: 1, name: "Revoke license" })).toBeVisible();
    await expectNoA11yViolations(page);
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Record the customer communication state.")).toBeVisible();
    await expect(page.getByLabel("Customer communication")).toBeFocused();

    await page.getByLabel("Customer communication").selectOption("notified");
    await page.getByLabel("Reason").fill("Contract terminated for material breach.");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("2 approvers other than you")).toBeVisible();

    await page.getByRole("button", { name: "Request approval" }).click();
    await expect(page.getByText("Type LIC_00388 exactly to confirm.")).toBeVisible();
    await page.getByLabel("Type LIC_00388 to confirm").fill("LIC_00388");
    await page.getByRole("button", { name: "Request approval" }).click();
    await expect(page.getByRole("heading", { name: "Request prepared" })).toBeFocused();
    await expect(page.getByText("Nothing was saved, signed or recorded in audit.")).toContainText(
      "2 approvers",
    );
  });

  test("renew previews the new expiry from the chosen term", async ({ page }) => {
    await gotoInteractive(page, "/licensing/LIC_00409/renew");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Renewal term").selectOption("24");
    const proposed = page.getByRole("complementary", { name: "Proposed change" });
    await expect(proposed).toContainText("5 Oct 2028");
    await expect(proposed).toContainText("grace");
  });

  test("issue lists only unlicensed contract lines", async ({ page }) => {
    await gotoInteractive(page, "/licensing/issue");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Choose the contract line to license.")).toBeVisible();
    const source = page.getByLabel("Source contract line");
    await expect(source.getByRole("option")).toHaveCount(2);
    await source.selectOption({ index: 1 });
    await expect(source).toHaveValue(/prd_sentinel/);
    await expect(page.getByRole("complementary", { name: "Proposed change" })).toContainText(
      "New license for Vantage Retail Group",
    );
    await expectNoA11yViolations(page);
  });

  test("an action is refused while another request is pending", async ({ page }) => {
    await gotoReady(page, "/licensing/LIC_00400/revoke");
    await expect(page.getByText("Revoke license is not available")).toBeVisible();
  });
});

test.describe("artifact verify", () => {
  test("verifies an intact artifact and detects tampering", async ({ page }) => {
    await gotoInteractive(page, "/licensing/verify?license=LIC_00391");
    await page.getByRole("button", { name: "Load LIC_00391 artifact" }).click();
    await page.getByRole("button", { name: "Verify artifact" }).click();
    await expect(page.getByText("Integrity verified")).toBeVisible();
    await expect(
      page
        .getByText("Signature verification runs in the License Issuer", { exact: false })
        .or(page.getByText("The artifact carries no signature", { exact: false })),
    ).toBeVisible();
    await expectNoA11yViolations(page);

    await page.getByRole("button", { name: "Load a tampered copy" }).click();
    await page.getByRole("button", { name: "Verify artifact" }).click();
    await expect(page.getByText("Verification failed")).toBeVisible();
    await expect(
      page.getByText("The payload was changed after hashing.", { exact: false }),
    ).toBeVisible();
  });
});
