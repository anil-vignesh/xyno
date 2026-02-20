import { test, expect } from "@playwright/test";
import { registerAndLogin, switchEnvironment } from "./helpers";

test.describe("Events", () => {
  test("empty state shown when no events", async ({ page }) => {
    await registerAndLogin(page);
    await page.goto("/events");
    await expect(page.locator("text=No events yet")).toBeVisible();
  });

  test("create event dialog opens", async ({ page }) => {
    await registerAndLogin(page);
    await page.goto("/events");
    await page.click('button:has-text("Create Event")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('text=Create Event').last()).toBeVisible();
  });

  test("promote button visible in sandbox", async ({ page }) => {
    await registerAndLogin(page);
    const token = await page.evaluate(() => localStorage.getItem("access_token"));

    // Create template + integration + event via API
    const tplResp = await page.request.post("http://localhost:8000/api/templates/", {
      headers: { Authorization: `Bearer ${token}`, "X-Environment": "sandbox", "Content-Type": "application/json" },
      data: { name: "Event Tpl", subject: "Hi", html_content: "<p>Hi</p>" },
    });
    const tpl = await tplResp.json();

    await page.request.post("http://localhost:8000/api/events/definitions/", {
      headers: { Authorization: `Bearer ${token}`, "X-Environment": "sandbox", "Content-Type": "application/json" },
      data: { name: "Test Event", description: "", template: tpl.id, integration: null, is_active: true },
    });

    await page.goto("/events");
    await page.waitForLoadState("networkidle");
    await expect(page.locator('[title="Promote to Production"]').first()).toBeVisible();
  });

  test("promote button NOT visible in production", async ({ page }) => {
    await registerAndLogin(page);
    await page.goto("/events");
    await switchEnvironment(page, "production");
    await page.waitForLoadState("networkidle");
    await expect(page.locator('[title="Promote to Production"]')).toHaveCount(0);
  });

  test("trigger code dialog shows curl command", async ({ page }) => {
    await registerAndLogin(page);
    const token = await page.evaluate(() => localStorage.getItem("access_token"));
    await page.request.post("http://localhost:8000/api/events/definitions/", {
      headers: { Authorization: `Bearer ${token}`, "X-Environment": "sandbox", "Content-Type": "application/json" },
      data: { name: "Curl Event", description: "", template: null, integration: null, is_active: true },
    });

    await page.goto("/events");
    await page.waitForLoadState("networkidle");
    await page.click('[title="View Trigger Code"]');
    await expect(page.locator("text=curl -X POST")).toBeVisible();
  });
});
