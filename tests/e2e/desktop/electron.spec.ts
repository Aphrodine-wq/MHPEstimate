import { test, expect, _electron as electron } from "@playwright/test";
import path from "path";

// Electron tests launch the desktop app directly — no web server needed.
// They require `electron-vite build` to have been run first.
const appPath = path.resolve(__dirname, "../../../apps/desktop");

let electronApp: Awaited<ReturnType<typeof electron.launch>>;
let page: Awaited<ReturnType<typeof electronApp.firstWindow>>;

test.beforeAll(async () => {
  electronApp = await electron.launch({
    args: [path.join(appPath, "out/main/index.js")],
    cwd: appPath,
  });
  page = await electronApp.firstWindow();
  // Wait for the renderer to finish loading
  await page.waitForLoadState("domcontentloaded");
});

test.afterAll(async () => {
  await electronApp.close();
});

test.describe("Desktop App — Launch", () => {
  test("window opens with correct title", async () => {
    const title = await electronApp.evaluate(({ BrowserWindow }) => {
      return BrowserWindow.getAllWindows()[0].getTitle();
    });
    expect(title).toContain("ProEstimate");
  });

  test("sidebar is visible", async () => {
    await expect(page.getByText("ProEstimate AI")).toBeVisible();
    await expect(page.getByText("MHP Construction")).toBeVisible();
  });
});

test.describe("Desktop App — Navigation", () => {
  test("navigates to Dashboard by default", async () => {
    await expect(
      page.getByRole("heading", { name: "Dashboard" })
    ).toBeVisible();
  });

  test("navigates to Estimates page", async () => {
    await page.getByRole("button", { name: "Estimates" }).click();
    await expect(
      page.getByRole("heading", { name: "Estimates" })
    ).toBeVisible();
  });

  test("navigates to Materials page", async () => {
    await page.getByRole("button", { name: "Materials" }).click();
    await expect(
      page.getByRole("heading", { name: "Materials" })
    ).toBeVisible();
  });

  test("navigates to Invoices page", async () => {
    await page.getByRole("button", { name: "Invoices" }).click();
    await expect(
      page.getByRole("heading", { name: "Invoices" })
    ).toBeVisible();
  });

  test("navigates to Clients page", async () => {
    await page.getByRole("button", { name: "Clients" }).click();
    await expect(
      page.getByRole("heading", { name: "Clients" })
    ).toBeVisible();
  });

  test("navigates to Call History page", async () => {
    await page.getByRole("button", { name: "Call History" }).click();
    await expect(
      page.getByRole("heading", { name: "Call History" })
    ).toBeVisible();
  });

  test("navigates to Analytics page", async () => {
    await page.getByRole("button", { name: "Analytics" }).click();
    await expect(
      page.getByRole("heading", { name: "Analytics" })
    ).toBeVisible();
  });

  test("navigates to Settings page", async () => {
    await page.getByRole("button", { name: "Settings" }).click();
    await expect(
      page.getByRole("heading", { name: "Settings" })
    ).toBeVisible();
  });
});

test.describe("Desktop App — Dashboard", () => {
  test.beforeEach(async () => {
    await page.getByRole("button", { name: "Dashboard" }).click();
  });

  test("shows KPI metrics", async () => {
    await expect(page.getByText("Pipeline")).toBeVisible();
    await expect(page.getByText("Won")).toBeVisible();
    await expect(page.getByText("Avg Margin")).toBeVisible();
    await expect(page.getByText("Drafts")).toBeVisible();
  });

  test("shows quick action buttons", async () => {
    await expect(page.getByText("New Estimate")).toBeVisible();
    await expect(page.getByText("Quick Ballpark")).toBeVisible();
    await expect(page.getByText("Upload Invoice")).toBeVisible();
  });

  test("shows Recent Estimates section", async () => {
    await expect(page.getByText("Recent Estimates")).toBeVisible();
  });

  test("shows Pipeline breakdown", async () => {
    await expect(
      page.getByText("Total pending value")
    ).toBeVisible();
  });
});

test.describe("Desktop App — Estimates", () => {
  test.beforeEach(async () => {
    await page.getByRole("button", { name: "Estimates" }).click();
  });

  test("shows estimates header with count", async () => {
    await expect(
      page.getByRole("heading", { name: "Estimates" })
    ).toBeVisible();
    await expect(page.getByText("total")).toBeVisible();
  });

  test("has search input", async () => {
    await expect(
      page.getByPlaceholder("Search by number, type, or address")
    ).toBeVisible();
  });

  test("has filter tabs", async () => {
    await expect(page.getByRole("button", { name: "All" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Draft" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sent" })).toBeVisible();
  });

  test("has New Estimate button", async () => {
    await expect(
      page.getByRole("button", { name: "New Estimate" })
    ).toBeVisible();
  });
});

test.describe("Desktop App — Clients", () => {
  test.beforeEach(async () => {
    await page.getByRole("button", { name: "Clients" }).click();
  });

  test("shows clients header", async () => {
    await expect(
      page.getByRole("heading", { name: "Clients" })
    ).toBeVisible();
  });

  test("has search input", async () => {
    await expect(
      page.getByPlaceholder("Search by name, email, or phone")
    ).toBeVisible();
  });

  test("has Add Client button", async () => {
    await expect(
      page.getByRole("button", { name: "Add Client" })
    ).toBeVisible();
  });
});
