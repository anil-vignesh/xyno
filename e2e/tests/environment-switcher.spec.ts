import { test, expect } from "@playwright/test";
import { registerAndLogin, switchEnvironment } from "./helpers";

test.describe("Environment Switcher", () => {
  test("sidebar shows Sandbox/Production toggle", async ({ page }) => {
    await registerAndLogin(page);
    await expect(page.locator('button:has-text("Sandbox")')).toBeVisible();
    await expect(page.locator('button:has-text("Production")')).toBeVisible();
  });

  test("defaults to Sandbox", async ({ page }) => {
    await registerAndLogin(page);
    const sandboxBtn = page.locator('button:has-text("Sandbox")');
    // Active button has bg-background class applied
    await expect(sandboxBtn).toBeVisible();
    const val = await page.evaluate(() => localStorage.getItem("xyno_environment"));
    expect(val).toBe("sandbox");
  });

  test("switching to Production persists in localStorage", async ({ page }) => {
    await registerAndLogin(page);
    await switchEnvironment(page, "production");
    const val = await page.evaluate(() => localStorage.getItem("xyno_environment"));
    expect(val).toBe("production");
  });

  test("switching environment refetches templates page data", async ({ page }) => {
    await registerAndLogin(page);
    await page.goto("/templates");
    await page.waitForLoadState("networkidle");

    // Intercept the templates API call after switching
    const [request] = await Promise.all([
      page.waitForRequest((req) => req.url().includes("/api/templates/") && req.method() === "GET"),
      switchEnvironment(page, "production"),
    ]);
    expect(request.headers()["x-environment"]).toBe("production");
  });

  test("switching environment refetches events page data", async ({ page }) => {
    await registerAndLogin(page);
    await page.goto("/events");
    await page.waitForLoadState("networkidle");

    const [request] = await Promise.all([
      page.waitForRequest((req) => req.url().includes("/api/events/") && req.method() === "GET"),
      switchEnvironment(page, "production"),
    ]);
    expect(request.headers()["x-environment"]).toBe("production");
  });

  test("X-Environment header sent on every API request", async ({ page }) => {
    await registerAndLogin(page);
    // Navigate to dashboard and capture the stats API request
    const [request] = await Promise.all([
      page.waitForRequest((req) => req.url().includes("/dashboard-stats/")),
      page.goto("/dashboard"),
    ]);
    expect(request.headers()["x-environment"]).toBe("sandbox");
  });
});
