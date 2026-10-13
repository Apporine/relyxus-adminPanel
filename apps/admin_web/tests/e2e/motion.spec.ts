import { expect, test, type Page } from "@playwright/test";

async function gotoReady(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("html")).toHaveAttribute("data-shell-ready", "true");
}

const pageRoot = "main#main-content > *";

test.describe("motion and scrolling", () => {
  test("scrollbars are hidden but tables still scroll by keyboard", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await gotoReady(page, "/customers");
    const region = page.locator('[role="region"][aria-label="Customers"]');
    await expect(region).toHaveCSS("scrollbar-width", "none");
    const overflows = await region.evaluate((el) => el.scrollWidth > el.clientWidth);
    test.skip(!overflows, "The table fits at this width");
    await region.focus();
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => region.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  });

  test.describe("with motion allowed", () => {
    test.use({ contextOptions: { reducedMotion: "no-preference" } });

    test("pages enter with a short rise and cards cascade", async ({ page }) => {
      await gotoReady(page, "/");
      await expect(page.locator(pageRoot).first()).toHaveCSS("animation-name", "ap-rise");
      const cards = page.getByRole("region", { name: "Portfolio summary" }).locator("> *");
      await expect(cards.nth(1)).toHaveCSS("animation-delay", "0.045s");
    });
  });

  test("reduced motion removes entrance delays", async ({ page }) => {
    await gotoReady(page, "/");
    const cards = page.getByRole("region", { name: "Portfolio summary" }).locator("> *");
    await expect(cards.nth(1)).toHaveCSS("animation-delay", "0s");
    await expect(page.locator(pageRoot).first()).toHaveCSS("animation-duration", "1e-05s");
  });
});
