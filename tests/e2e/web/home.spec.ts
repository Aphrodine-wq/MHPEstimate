import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("loads with correct title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/ProEstimate AI/);
  });

  test("displays brand heading", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "ProEstimate AI" })
    ).toBeVisible();
  });

  test("shows CTA buttons", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Get Started" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Learn More" })
    ).toBeVisible();
  });

  test("displays description text", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByText("AI-powered estimation platform")
    ).toBeVisible();
  });
});
