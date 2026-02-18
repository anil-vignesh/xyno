import { test, expect } from "@playwright/test";
import { registerAndLogin, switchEnvironment } from "./helpers";

test.describe("Templates", () => {
  test("empty state shown when no templates", async ({ page }) => {
    await registerAndLogin(page);
    await page.goto("/templates");
    await expect(page.locator("text=No templates yet")).toBeVisible();
  });

  test("create template via builder navigation", async ({ page }) => {
    await registerAndLogin(page);
    await page.goto("/templates");
    await page.click('button:has-text("Create Template")');
    await page.waitForURL("**/templates/new");
    await expect(page).toHaveURL(/templates\/new/);
  });

  test("promote button visible in sandbox", async ({ page }) => {
    await registerAndLogin(page);
    // Create a template via API first
    const token = await page.evaluate(() => localStorage.getItem("access_token"));
    await page.request.post("http://localhost:8000/api/templates/", {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Environment": "sandbox",
        "Content-Type": "application/json",
      },
      data: {
        name: "Promote Test Template",
        subject: "Hello {{name}}",
        html_content: "<p>Hi {{name}}</p>",
      },
    });

    await page.goto("/templates");
    await page.waitForLoadState("networkidle");
    // ArrowUpCircle promote button should be visible in sandbox
    await expect(page.locator('[title="Promote to Production"]').first()).toBeVisible();
  });

  test("promote button NOT visible in production", async ({ page }) => {
    await registerAndLogin(page);
    await page.goto("/templates");
    await switchEnvironment(page, "production");
    await page.waitForLoadState("networkidle");
    await expect(page.locator('[title="Promote to Production"]')).toHaveCount(0);
  });

  test("promote template to production", async ({ page }) => {
    await registerAndLogin(page);
    const token = await page.evaluate(() => localStorage.getItem("access_token"));
    await page.request.post("http://localhost:8000/api/templates/", {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Environment": "sandbox",
        "Content-Type": "application/json",
      },
      data: {
        name: "Promote Me",
        subject: "Subject",
        html_content: "<p>body</p>",
      },
    });

    await page.goto("/templates");
    await page.waitForLoadState("networkidle");

    // Handle confirm dialog
    page.once("dialog", (d) => d.accept());
    await page.click('[title="Promote to Production"]');

    // Toast should appear
    await expect(page.locator("text=promoted to Production")).toBeVisible({ timeout: 5000 });

    // Switch to production and verify the template appears
    await switchEnvironment(page, "production");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Promote Me")).toBeVisible();
  });
});
