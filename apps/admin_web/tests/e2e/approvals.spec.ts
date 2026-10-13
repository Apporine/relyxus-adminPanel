import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";

async function gotoReady(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("html")).toHaveAttribute("data-shell-ready", "true");
}

const views = { nav: "Approval views" } as const;

test.describe("approval queue", () => {
  test("Mine lists requests awaiting my decision and is accessible", async ({ page }) => {
    await gotoReady(page, "/approvals");
    await expect(page.getByRole("heading", { level: 1, name: "Approvals" })).toBeVisible();
    const nav = page.getByRole("navigation", { name: views.nav });
    await expect(nav.getByRole("link", { name: /^Mine/ })).toHaveAttribute("aria-current", "page");
    const list = page.getByRole("region", { name: "Mine requests" });
    await expect(list.getByRole("article")).toHaveCount(2);
    await expect(list.getByText("Awaiting your decision")).toHaveCount(2);
    await expectNoA11yViolations(page);
  });

  test("views narrow the queue and show time remaining", async ({ page }) => {
    await gotoReady(page, "/approvals?view=expiring");
    const expiring = page.getByRole("region", { name: "Expiring requests" });
    await expect(expiring.getByRole("article")).toHaveCount(1);
    await expect(expiring.getByRole("article")).toContainText("22 hours left");

    await page
      .getByRole("navigation", { name: views.nav })
      .getByRole("link", { name: /^Decided/ })
      .click();
    await expect(page).toHaveURL(/view=decided/);
    const decided = page.getByRole("region", { name: "Decided requests" });
    await expect(decided.getByRole("article")).toHaveCount(5);
    await expect(decided).toContainText("Expired");
    await expectNoA11yViolations(page);
  });

  test("the top bar pending count opens the Team view with the same count", async ({ page }) => {
    await gotoReady(page, "/");
    await page.getByRole("link", { name: "4 pending approvals" }).click();
    await expect(page).toHaveURL(/view=team/);
    await expect(
      page.getByRole("region", { name: "Team requests" }).getByRole("article"),
    ).toHaveCount(4);
  });

  test("a card opens the approval detail", async ({ page }) => {
    await gotoReady(page, "/approvals?view=team");
    await page.getByRole("link", { name: "Revoke Atlas Freight Finance staging license" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Revoke Atlas Freight Finance staging license" }),
    ).toBeVisible();
  });
});

test.describe("approval detail", () => {
  test("shows summary, structured diff, evidence and policy", async ({ page }) => {
    await gotoReady(page, "/approvals/apr_1041");
    await expect(
      page.locator('[role="region"][aria-label="Changes requested in apr_1041"]'),
    ).toContainText("kms-sig-2026b");
    await expect(page.getByRole("region", { name: "Evidence" })).toContainText("SEC-RB-2026-04");
    await expect(page.getByRole("complementary", { name: "Decision" })).toContainText(
      "Step up authentication",
    );
    await expectNoA11yViolations(page);
  });

  test("an eligible approver sees the spec dialog and nothing is saved", async ({ page }) => {
    await gotoReady(page, "/approvals/apr_1039");
    await page.getByRole("button", { name: "Approve", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Approve governed action" });
    await expect(dialog).toHaveAccessibleDescription(
      "By approving, you confirm that the request, impact and supporting evidence meet the required policy.",
    );
    await expectNoA11yViolations(page);
    await dialog.getByRole("button", { name: "Approve" }).click();
    await expect(dialog.getByText("Not connected to the Control API")).toBeVisible();
  });

  test("rejection requires a reason", async ({ page }) => {
    await gotoReady(page, "/approvals/apr_1039");
    await page.getByRole("button", { name: "Reject", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Reject governed action" });
    await dialog.getByRole("button", { name: "Reject" }).click();
    await expect(dialog.getByLabel("Reason")).toBeFocused();
  });

  test("the requester cannot approve their own request", async ({ page }) => {
    await gotoReady(page, "/approvals/apr_1042");
    const panel = page.getByRole("complementary", { name: "Decision" });
    await expect(panel).toContainText("Policy requires a second person to decide it.");
    await expect(panel.getByRole("button", { name: "Approve" })).toBeDisabled();
    await expect(panel.getByRole("button", { name: "Approve" })).toHaveAccessibleDescription(
      "You requested this change. Policy requires a second person to decide it.",
    );
    await expectNoA11yViolations(page);
  });

  test("a decided request is final and shows its history", async ({ page }) => {
    await gotoReady(page, "/approvals/apr_1036");
    await expect(page.getByRole("region", { name: "Decision history" })).toContainText(
      "Approved by Hannah Becker",
    );
    const panel = page.getByRole("complementary", { name: "Decision" });
    await expect(panel).toContainText("Decisions are final");
    await expect(panel.getByRole("button", { name: "Approve" })).toHaveCount(0);
  });

  test("an unknown request shows the not-found page", async ({ page }) => {
    await page.goto("/approvals/apr_0000");
    await expect(page.getByText("Record not found")).toBeVisible();
  });
});

test("My decisions lists what I decided", async ({ page }) => {
  await gotoReady(page, "/approvals/decisions");
  const table = page.locator('[role="region"][aria-label="My decisions"]');
  await expect(table.getByRole("row", { name: /apr_1034/ })).toContainText("Rejected");
  await expectNoA11yViolations(page);
});
