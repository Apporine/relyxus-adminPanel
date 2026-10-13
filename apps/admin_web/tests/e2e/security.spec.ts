import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";

async function gotoReady(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("html")).toHaveAttribute("data-shell-ready", "true");
}

test.describe("security", () => {
  test("the posture page leads with the overdue review and its risks", async ({ page }) => {
    await gotoReady(page, "/security");
    await expect(page.getByRole("heading", { level: 1, name: "Security posture" })).toBeVisible();
    await expect(page.getByText("Security posture: Overdue review")).toBeVisible();
    const risks = page.locator('[role="region"][aria-label="Security risks"] tbody tr');
    await expect(risks.first()).toContainText("High");
    await expect(
      page.getByRole("link", { name: "Q3 privileged access review is overdue" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Kwame Mensah holds conflicting roles" }),
    ).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("starting an access review uses the governed dialog contract", async ({ page }) => {
    await gotoReady(page, "/security");
    await page.getByRole("button", { name: "Start review" }).click();
    const dialog = page.getByRole("dialog", { name: "Start access review" });
    await expect(dialog).toContainText("Existing access remains unchanged");
    await dialog.getByLabel("Reviewer").selectOption({ label: "Kwame Mensah" });
    await dialog.getByRole("button", { name: "Start review" }).click();
    await expect(dialog).toContainText("Nothing was saved");
  });

  test("staff access opens one account with role use and grants", async ({ page }) => {
    await gotoReady(page, "/security/staff?person=stf_04");
    const detail = page.getByRole("region", { name: "Tomasz Nowak", exact: true });
    await expect(detail).toContainText("still assigned");
    const table = page.locator('[role="region"][aria-label="Staff access"]');
    await expect(table.getByRole("row", { name: /Liam Gallagher-Shaw/ })).toContainText("No MFA");
    await expectNoA11yViolations(page);
  });

  test("role detail lists members and conflicting roles", async ({ page }) => {
    await gotoReady(page, "/security/roles/license_approver");
    await expect(page.getByRole("heading", { level: 1, name: "License Approver" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Conflicting roles" })).toContainText(
      "License Operator",
    );
    await expect(page.getByRole("region", { name: "Members", exact: true })).toContainText(
      "Hannah Becker",
    );
    await expectNoA11yViolations(page);
  });

  test("an access review shows each decision", async ({ page }) => {
    await gotoReady(page, "/security/access-reviews/acr_2026_q3");
    await expect(page.getByText("Review overdue")).toBeVisible();
    const items = page.locator('[role="region"][aria-label="Role assignments under review"]');
    await expect(items.getByRole("row", { name: /Marcus Bell/ })).toContainText("Pending");
    await expectNoA11yViolations(page);
  });

  test("API clients flag overdue rotation and idle clients", async ({ page }) => {
    await gotoReady(page, "/security/api-clients");
    const table = page.locator('[role="region"][aria-label="API clients"]');
    await expect(table.getByRole("row", { name: /Cost import/ })).toContainText("Rotation overdue");
    await expect(table.getByRole("row", { name: /Support platform bridge/ })).toContainText("idle");
    await expectNoA11yViolations(page);
  });

  test("signing keys show metadata only and plan a rotation", async ({ page }) => {
    await gotoReady(page, "/security/signing-keys");
    await expect(page.getByText("Key metadata only")).toBeVisible();
    const table = page.locator('[role="region"][aria-label="Signing keys"]');
    await expect(table.getByRole("row", { name: /kms-sig-2026b/ })).toContainText("2 of 3");
    await expectNoA11yViolations(page);
    await page.getByRole("button", { name: "Plan rotation" }).click();
    await expect(page.getByRole("dialog", { name: "Plan signing key rotation" })).toContainText(
      "overlap window",
    );
  });

  test("break glass shows the active activation and its evidence", async ({ page }) => {
    await gotoReady(page, "/security/break-glass");
    await expect(page.getByText("Break glass active: Tomasz Nowak, INC-2307")).toBeVisible();
    const table = page.locator('[role="region"][aria-label="Break glass register"]');
    await expect(table.getByRole("row", { name: /INC-2240/ })).toContainText("PIR-2026-08-17");
    await expectNoA11yViolations(page);
  });

  test("the sensitive data access report is restricted by role", async ({ page }) => {
    await gotoReady(page, "/security/data-access");
    await expect(page.getByText("Restricted", { exact: true })).toBeVisible();
    await expect(page.getByText("Board pack")).toHaveCount(0);
    await expectNoA11yViolations(page);
  });

  test("an unknown role shows the not-found page", async ({ page }) => {
    await page.goto("/security/roles/root");
    await expect(page.getByText("Record not found")).toBeVisible();
  });
});
