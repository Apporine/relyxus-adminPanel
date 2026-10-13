import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";

test.describe("design system", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/design-system");
  });

  test("all components meet WCAG 2.2 AA", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1, name: "Design system" })).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("non-dismissible dialog traps focus, ignores Escape and returns focus", async ({ page }) => {
    const trigger = page.getByRole("button", { name: "Open example dialog" });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Suspend license" });
    await expect(dialog).toBeVisible();
    await expectNoA11yViolations(page);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();

    for (let i = 0; i < 6; i += 1) await page.keyboard.press("Tab");
    await expect(dialog.locator(":focus")).toHaveCount(1);

    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("tabs are keyboard operable", async ({ page }) => {
    await page.getByRole("tab", { name: "Overview" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Contracts" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByRole("tabpanel")).toHaveText("Active, future and historical contracts.");
  });
});
