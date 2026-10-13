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

  for (const path of ["/", "/customers", "/customers/cus_halden", "/licensing", "/approvals"]) {
    test(`no scroll container on ${path} shows a scrollbar`, async ({ page }) => {
      await gotoReady(page, path);
      const shown = await page.evaluate(
        () =>
          [document.documentElement, ...document.querySelectorAll("*")]
            .filter((el) => {
              const style = getComputedStyle(el);
              return (
                el === document.documentElement ||
                /(auto|scroll)/.test(style.overflowX + style.overflowY)
              );
            })
            .filter((el) => getComputedStyle(el).scrollbarWidth !== "none").length,
      );
      expect(shown).toBe(0);
    });
  }

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
