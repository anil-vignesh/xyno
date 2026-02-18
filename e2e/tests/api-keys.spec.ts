import { test, expect } from "@playwright/test";
import { registerAndLogin } from "./helpers";

test.describe("API Keys", () => {
  test("empty state shown when no keys", async ({ page }) => {
    await registerAndLogin(page);
    await page.goto("/api-keys");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("No API keys yet.").first()).toBeVisible({ timeout: 8000 });
  });

  test("create dialog shows environment selector", async ({ page }) => {
    await registerAndLogin(page);
    await page.goto("/api-keys");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Create API Key" }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.getByText("Environment").first()).toBeVisible();
    await expect(page.getByText("Sandbox").first()).toBeVisible();
  });

  test("create sandbox key and raw key is shown", async ({ page }) => {
    await registerAndLogin(page);
    await page.goto("/api-keys");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Create API Key" }).click();
    await page.fill('input[placeholder*="Production Backend"]', "My Sandbox Key");
    await page.getByRole("button", { name: "Create" }).last().click();
    // Reveal dialog
    await expect(page.getByText("API Key Created")).toBeVisible({ timeout: 8000 });
    await expect(page.getByText("Copy your API key now")).toBeVisible();
  });

  test("environment badge shown in key list", async ({ page }) => {
    await registerAndLogin(page);
    const token = await page.evaluate(() => localStorage.getItem("access_token"));
    await page.request.post("http://localhost:8000/api/auth/api-keys/", {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      data: { name: "Test Key", environment: "production" },
    });

    await page.goto("/api-keys");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("production").first()).toBeVisible();
  });
});
