import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";

test.describe("signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("the console opens on sign in, not Home", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
  });

  test("a deep link returns to its page after sign in", async ({ page }) => {
    await page.goto("/audit?impact=high");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Faudit%3Fimpact%3Dhigh$/);
    await page.getByRole("textbox", { name: "Work email" }).fill("amara.okafor@apporine.example");
    await page.getByLabel("Password", { exact: true }).fill("design-preview");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/audit\?impact=high$/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { level: 1, name: "Audit log" })).toBeVisible();
  });

  test("offers email sign in and SSO, never sign up", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("textbox", { name: "Work email" })).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in with SSO" })).toBeVisible();
    await expect(page.getByText(/There is no self-service sign-up/)).toBeVisible();
    await expect(page.getByText("No credentials are checked, sent or stored.")).toBeVisible();
    await expect(page.getByRole("link", { name: /sign up|create account|register/i })).toHaveCount(
      0,
    );
    await expectNoA11yViolations(page);
  });

  test("validates the form and focuses the first problem", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText("Enter your work email.")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Work email" })).toBeFocused();
    await page.getByRole("textbox", { name: "Work email" }).fill("not-an-email");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText("Enter an email address like name@company.com.")).toBeVisible();
    await page.getByRole("textbox", { name: "Work email" }).fill("amara.okafor@apporine.example");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText("Enter your password.")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeFocused();
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test("a valid sign in opens Home", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByRole("textbox", { name: "Work email" }).fill("amara.okafor@apporine.example");
    await page.getByLabel("Password", { exact: true }).fill("design-preview");
    await page.getByRole("button", { name: "Show password" }).click();
    await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Portfolio command center" }),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("SSO validates, then signs in and keeps the destination", async ({ page }) => {
    await page.goto("/sign-in?next=%2Fsecurity");
    await page.getByRole("link", { name: "Sign in with SSO" }).click();
    await expect(page).toHaveURL(/\/sign-in\/sso\?next=%2Fsecurity$/);
    await expect(page.getByRole("heading", { level: 1, name: "Single sign-on" })).toBeVisible();
    await expectNoA11yViolations(page);
    await page.getByRole("button", { name: "Continue with SSO" }).click();
    await expect(page.getByText("Enter your work email.")).toBeVisible();
    await page.getByRole("textbox", { name: "Work email" }).fill("amara.okafor@apporine.example");
    await page.getByRole("button", { name: "Continue with SSO" }).click();
    // Allows for a cold compile of the destination in dev.
    await expect(page).toHaveURL(/\/security$/, { timeout: 20_000 });
  });

  test("SSO links back to email sign in", async ({ page }) => {
    await page.goto("/sign-in/sso");
    await page.getByRole("link", { name: "Sign in with email and password" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test("never redirects off site after sign in", async ({ page }) => {
    await page.goto("/sign-in?next=%2F%2Fevil.example");
    await page.getByRole("textbox", { name: "Work email" }).fill("amara.okafor@apporine.example");
    await page.getByLabel("Password", { exact: true }).fill("design-preview");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/localhost:\d+\/$/);
  });
});

test.describe("signed in", () => {
  test("sign in pages go straight to the console", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page).toHaveURL(/localhost:\d+\/$/);
  });

  test("sign out ends the session", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-shell-ready", "true");
    await page.getByRole("button", { name: /Staff menu/ }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await page.goto("/customers");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fcustomers$/);
  });
});
