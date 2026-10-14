import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";

test.describe("sign in", () => {
  test("offers email sign in and SSO, never sign up", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
    await expect(page.getByLabel("Work email")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in with SSO" })).toBeVisible();
    await expect(page.getByText(/There is no self-service sign-up/)).toBeVisible();
    await expect(page.getByRole("link", { name: /sign up|create account|register/i })).toHaveCount(
      0,
    );
    await expectNoA11yViolations(page);
  });

  test("validates the form and focuses the first problem", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText("Enter your work email.")).toBeVisible();
    await expect(page.getByLabel("Work email")).toBeFocused();
    await page.getByLabel("Work email").fill("not-an-email");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText("Enter an email address like name@company.com.")).toBeVisible();
    await page.getByLabel("Work email").fill("amara.okafor@apporine.example");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText("Enter your password.")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeFocused();
  });

  test("a valid sign in says nothing was sent and opens the console preview", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Work email").fill("amara.okafor@apporine.example");
    await page.getByLabel("Password", { exact: true }).fill("design-preview");
    await page.getByRole("button", { name: "Show password" }).click();
    await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText("No credentials were sent or stored.")).toBeVisible();
    await page.getByRole("link", { name: "Continue to the console preview" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Portfolio command center" }),
    ).toBeVisible();
  });

  test("SSO finds the organization by email domain", async ({ page }) => {
    await page.goto("/sign-in/sso");
    await expect(page.getByRole("heading", { level: 1, name: "Single sign-on" })).toBeVisible();
    await expectNoA11yViolations(page);
    await page.getByRole("button", { name: "Continue with SSO" }).click();
    await expect(page.getByText("Enter your work email.")).toBeVisible();
    await page.getByLabel("Work email").fill("amara.okafor@apporine.example");
    await page.getByRole("button", { name: "Continue with SSO" }).click();
    await expect(
      page.getByText("Redirecting to Microsoft Entra ID is a design preview."),
    ).toBeVisible();
  });

  test("SSO links back to email sign in", async ({ page }) => {
    await page.goto("/sign-in/sso");
    await page.getByRole("link", { name: "Sign in with email and password" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test("sign out from the staff menu opens sign in", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-shell-ready", "true");
    await page.getByRole("button", { name: /Staff menu/ }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
  });
});
