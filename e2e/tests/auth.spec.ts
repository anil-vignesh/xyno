import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("login page renders", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Xyno").first()).toBeVisible();
    await expect(page.locator("#username")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
  });

  test("register and login flow", async ({ page }) => {
    const suffix = Date.now().toString();
    await page.goto("/register");
    await page.waitForLoadState("networkidle");
    await page.fill("#username", `e2etest_${suffix}`);
    await page.fill("#email", `e2e_${suffix}@example.com`);
    await page.fill("#password", "testpass123!");
    await page.fill("#password_confirm", "testpass123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 10_000 });
    await expect(page).toHaveURL(/dashboard/);
  });

  test("login with wrong password shows error", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.fill("#username", "nonexistent");
    await page.fill("#password", "wrongpass");
    await page.click('button[type="submit"]');
    // Should stay on login page
    await expect(page).toHaveURL(/login/);
  });

  test("protected route redirects to login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL("**/login");
    await expect(page).toHaveURL(/login/);
  });

  test("logout clears session", async ({ page }) => {
    const { registerAndLogin } = await import("./helpers");
    await registerAndLogin(page);
    await page.click('button[title="Logout"]');
    await page.waitForURL("**/login");
    await expect(page).toHaveURL(/login/);
  });
});
