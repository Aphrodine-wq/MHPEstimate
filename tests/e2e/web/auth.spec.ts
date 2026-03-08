import { test, expect } from "@playwright/test";

test.describe("Auth Screen", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for splash screen to transition to auth
    await expect(page.getByText("Sign in")).toBeVisible({ timeout: 10000 });
  });

  test("shows ProEstimate AI branding", async ({ page }) => {
    await expect(page.getByText("ProEstimate AI")).toBeVisible();
  });

  test("email input is visible and accepts text", async ({ page }) => {
    const emailInput = page.getByPlaceholder(/email/i);
    await expect(emailInput).toBeVisible();
    await emailInput.fill("test@northmshomepros.com");
    await expect(emailInput).toHaveValue("test@northmshomepros.com");
  });

  test("password input is visible", async ({ page }) => {
    const passwordInput = page.getByPlaceholder(/password/i);
    await expect(passwordInput).toBeVisible();
  });

  test("Sign In button is present", async ({ page }) => {
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("forgot password link is visible", async ({ page }) => {
    await expect(page.getByText(/forgot/i)).toBeVisible();
  });

  test("form fields are accessible", async ({ page }) => {
    // Email and password inputs should be focusable
    const emailInput = page.getByPlaceholder(/email/i);
    await emailInput.focus();
    await expect(emailInput).toBeFocused();

    const passwordInput = page.getByPlaceholder(/password/i);
    await passwordInput.focus();
    await expect(passwordInput).toBeFocused();
  });
});
