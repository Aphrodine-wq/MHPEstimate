import { test, expect } from "@playwright/test";

/**
 * Mobile E2E tests (Expo web export).
 *
 * These tests run against the Expo web export of the mobile app.
 * To run: pnpm --filter mobile build:export && npx serve apps/mobile/dist
 *
 * For native testing, use Detox or Maestro (see docs/testing.md).
 */

test.describe("Mobile App — Web Export", () => {
  test.beforeEach(async ({ page }) => {
    // Expo web export serves on port 8081 by default
    await page.goto("http://localhost:8081");
  });

  test("shows auth screen on first load", async ({ page }) => {
    // The app should show an authentication screen when not logged in
    await expect(page.locator("text=Sign In").or(page.locator("text=Log In")).or(page.locator("text=Welcome"))).toBeVisible({ timeout: 10000 });
  });

  test("has proper viewport meta tag", async ({ page }) => {
    const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
    expect(viewport).toContain("width=device-width");
  });

  test("renders without JavaScript errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("http://localhost:8081");
    await page.waitForTimeout(3000);

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(
      (e) => !e.includes("ResizeObserver") && !e.includes("Non-Error")
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
