import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";

async function gotoReady(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("html")).toHaveAttribute("data-shell-ready", "true");
}

const summary = (page: Page) => page.getByRole("region", { name: "Audit summary" });
const table = (page: Page) => page.locator('[role="region"][aria-label="Audit events"]');

test.describe("audit log", () => {
  test("shows synchronized analytics, the stream state and the event table", async ({ page }) => {
    await gotoReady(page, "/audit");
    await expect(page.getByRole("heading", { level: 1, name: "Audit log" })).toBeVisible();
    await expect(page.getByText("Stream delayed: Splunk HTTP Event Collector")).toBeVisible();
    await expect(summary(page)).toContainText("494");
    await expect(
      table(page).getByRole("row", { name: /Downloaded license artifact/ }),
    ).toContainText("as License Operator via break glass bg_0014");
    await expectNoA11yViolations(page);
  });

  test("filters narrow the table and the analytics together", async ({ page }) => {
    await gotoReady(page, "/audit?impact=high");
    await expect(summary(page)).toContainText("8");
    await expect(table(page).locator("tbody tr")).toHaveCount(8);
    await page.getByLabel("Result").selectOption("denied");
    await expect(page).toHaveURL(/result=denied/);
    await expect(page.getByText("No audit events match")).toBeVisible();
  });

  test("the drawer reconstructs a privileged action end to end", async ({ page }) => {
    await gotoReady(page, "/audit?event=aud_009123");
    const drawer = page.getByRole("dialog", { name: "Activated break glass access" });
    await expect(drawer.getByRole("region", { name: "Identity" })).toContainText(
      "Service identity",
    );
    await expect(drawer.getByRole("region", { name: "Change" })).toContainText(
      "Before and after values are masked",
    );
    const related = drawer.getByRole("region", { name: "Related events" });
    await expect(related.getByRole("link")).toHaveCount(6);
    await related.getByRole("link", { name: /Downloaded license artifact/ }).click();
    await expect(page).toHaveURL(/event=aud_009126/);
    await expect(page.getByRole("dialog", { name: "Downloaded license artifact" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page).not.toHaveURL(/event=/);
  });

  test("before and after values show when the role allows", async ({ page }) => {
    await gotoReady(page, "/audit?event=aud_009118");
    const change = page
      .getByRole("dialog", { name: "Updated customer" })
      .getByRole("region", { name: "Change" });
    await expect(change).toContainText("Sun 02:00 – 05:00 UTC");
  });

  test("export uses the authorized-fields contract", async ({ page }) => {
    await gotoReady(page, "/audit");
    await page.getByRole("button", { name: "Export audit" }).click();
    const dialog = page.getByRole("dialog", { name: "Export audit events" });
    await expect(dialog).toContainText("494 events match the current filters.");
    await dialog.getByLabel("Reason").fill("Quarterly control evidence");
    await dialog.getByRole("button", { name: "Queue export" }).click();
    await expect(dialog).toContainText("Nothing was saved");
  });
});

test.describe("audit analytics and exports", () => {
  test("analytics keep the filters and drill through to the log", async ({ page }) => {
    await gotoReady(page, "/audit/analytics?result=denied");
    await expect(page.getByRole("link", { name: "Audit log" })).toHaveAttribute(
      "href",
      "/audit?result=denied",
    );
    await expect(
      page.getByRole("region", { name: "Repeated authorization denials" }),
    ).toContainText("Sofia Martins");
    await expectNoA11yViolations(page);
  });

  test("the export center verifies the hash chain", async ({ page }) => {
    await gotoReady(page, "/audit/exports");
    await expect(page.getByText("Chain intact")).toBeVisible();
    const exports = page.locator('[role="region"][aria-label="Exports and evidence bundles"]');
    await expect(
      exports.getByRole("row", { name: /Halden Mutual customer dossier/ }),
    ).toContainText("Denied");
    await expect(page.getByText("Export queued: High impact actions, last 14 days")).toBeVisible();
    await expectNoA11yViolations(page);
  });
});
