import { test, expect } from "@playwright/test";

test.describe("App Load", () => {
  test("loads and shows splash screen", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/MHP Estimate/);
  });

  test("displays ProEstimate AI branding on splash", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("ProEstimate AI")).toBeVisible();
  });

  test("transitions to auth screen after splash", async ({ page }) => {
    await page.goto("/");
    // Wait for splash to complete (splash has a timeout)
    await expect(page.getByText("Sign in")).toBeVisible({ timeout: 10000 });
  });

  test("shows email input on auth screen", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByPlaceholder(/email/i)).toBeVisible({ timeout: 10000 });
  });
});
