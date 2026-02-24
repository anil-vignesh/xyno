import { test, expect } from "@playwright/test";
import { fixDockerApiRouting } from "./helpers";

test.describe("Forgot Password", () => {
  test("forgot password page renders correctly", async ({ page }) => {
    await fixDockerApiRouting(page);
    await page.goto("/forgot-password");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toHaveText("Send reset link");
  });

  test("submitting forgot password form sends reset email", async ({ page }) => {
    await fixDockerApiRouting(page);

    // Intercept and capture the API response while also driving the UI
    const [response] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes("/auth/forgot-password/") && r.request().method() === "POST"
      ),
      (async () => {
        await page.goto("/forgot-password");
        await page.waitForLoadState("networkidle");
        await page.fill("#email", "anil@eximpe.com");
        await page.click('button[type="submit"]');
      })(),
    ]);

    // 1. Backend returned 200
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.detail).toContain("reset link has been sent");

    // 2. UI transitioned to success state
    await expect(page.locator('[data-slot="card-description"]')).toHaveText("Check your inbox");
    await expect(page.getByText(/reset link has been sent/i)).toBeVisible();
  });
});
