import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";

async function gotoReady(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("html")).toHaveAttribute("data-shell-ready", "true");
}

test.describe("global shell", () => {
  test("marks the current module and navigates between modules", async ({ page }) => {
    await page.goto("/customers");
    const nav = page.getByRole("navigation", { name: "Primary" });
    await expect(nav.getByRole("link", { name: "Customers" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await nav.getByRole("link", { name: "Licensing" }).click();
    await expect(page).toHaveURL(/\/licensing$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Licensing");
    await expect(nav.getByRole("link", { name: "Licensing" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("shows the environment and pending approvals", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Environment:", { exact: false })).toBeAttached();
    await expect(page.getByRole("banner").getByText("DEVELOPMENT")).toBeVisible();
    await expect(page.getByRole("link", { name: "4 pending approvals" })).toHaveAttribute(
      "href",
      "/approvals",
    );
  });

  test("skip link moves focus to the main content", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
  });

  test("shell meets WCAG 2.2 AA", async ({ page }) => {
    await page.goto("/customers");
    await expectNoA11yViolations(page);
  });
});

test.describe("command palette", () => {
  test("opens with Ctrl+K, offers quick actions and is accessible", async ({ page }) => {
    await gotoReady(page, "/");
    await page.keyboard.press("Control+k");
    const palette = page.getByRole("dialog", { name: "Search and commands" });
    await expect(palette).toBeVisible();
    await expect(palette.getByRole("option", { name: "Create customer" })).toBeVisible();
    await expect(palette.getByRole("option", { name: "Open approval queue" })).toBeVisible();
    await expectNoA11yViolations(page);

    await page.keyboard.press("Escape");
    await expect(palette).toBeHidden();
  });

  test("groups free-text results by object type", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Search customers, licenses, deployments/ }).click();
    await page.getByRole("dialog").getByRole("combobox").fill("halden");
    const palette = page.getByRole("dialog", { name: "Search and commands" });
    for (const group of ["Customers", "Licenses", "Deployments", "Contracts", "Contacts"]) {
      await expect(palette.getByRole("group", { name: group })).toBeVisible();
    }
  });

  test("structured filters narrow to one type and Enter opens the record", async ({ page }) => {
    await gotoReady(page, "/");
    await page.keyboard.press("Control+k");
    await page.getByRole("dialog").getByRole("combobox").fill("deployment:prod halden");
    const options = page.getByRole("dialog").getByRole("option");
    await expect(options).toHaveCount(1);
    await expect(options.first()).toContainText("halden-relyxus-prod");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/deployments\/dep_halden_production$/);
  });
});

test.describe("navigation layout", () => {
  test("collapses to an icon rail and remembers the choice", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Expanded navigation exists from 1280 px");
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Primary" });
    await expect(nav).toHaveAttribute("data-collapsed", "false");
    await page.getByRole("button", { name: "Collapse navigation" }).click();
    await expect(nav).toHaveAttribute("data-collapsed", "true");
    await page.reload();
    await expect(nav).toHaveAttribute("data-collapsed", "true");
    await expect(page.getByRole("button", { name: "Expand navigation" })).toBeVisible();
  });

  test("uses a drawer on narrow screens", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Open navigation" }).click();
    const drawer = page.getByRole("dialog", { name: "Navigation" });
    await drawer.getByRole("link", { name: "Audit" }).click();
    await expect(page).toHaveURL(/\/audit$/);
    await expect(drawer).toBeHidden();
  });
});
