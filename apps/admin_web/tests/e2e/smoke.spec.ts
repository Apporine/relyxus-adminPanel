import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";

test("home renders the command center heading", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Portfolio command center");
  await expectNoA11yViolations(page);
});

test("health endpoint responds", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  expect(await response.json()).toMatchObject({ status: "ok" });
});
