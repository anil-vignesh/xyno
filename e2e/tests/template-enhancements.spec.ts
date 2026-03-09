import { test, expect } from "@playwright/test";
import { registerAndLogin } from "./helpers";

const BASE = "http://localhost:8000/api";

// ---------------------------------------------------------------------------
// Feature 3: Duplicate templates
// ---------------------------------------------------------------------------

test.describe("Duplicate templates", () => {
  test("duplicate button is visible in template list", async ({ page }) => {
    await registerAndLogin(page);
    const token = await page.evaluate(() => localStorage.getItem("access_token"));
    await page.request.post(`${BASE}/templates/`, {
      headers: { Authorization: `Bearer ${token}`, "X-Environment": "sandbox", "Content-Type": "application/json" },
      data: { name: "Duplicate Button Test", subject: "Subject", html_content: "<p>body</p>" },
    });

    await page.goto("/templates");
    await page.waitForLoadState("load");
    await expect(page.locator('[title="Duplicate"]').first()).toBeVisible({ timeout: 5000 });
  });

  test("clicking duplicate creates a copy with (Copy) suffix", async ({ page }) => {
    await registerAndLogin(page);
    const token = await page.evaluate(() => localStorage.getItem("access_token"));
    await page.request.post(`${BASE}/templates/`, {
      headers: { Authorization: `Bearer ${token}`, "X-Environment": "sandbox", "Content-Type": "application/json" },
      data: { name: "Original Template", subject: "Subject", html_content: "<p>body</p>" },
    });

    await page.goto("/templates");
    await page.waitForLoadState("load");

    await page.click('[title="Duplicate"]');
    await expect(page.locator("text=Template duplicated")).toBeVisible({ timeout: 5000 });
    await page.waitForLoadState("load");

    await expect(page.locator("text=Original Template (Copy)")).toBeVisible({ timeout: 5000 });
  });

  test("duplicating twice generates unique names", async ({ page }) => {
    await registerAndLogin(page);
    const token = await page.evaluate(() => localStorage.getItem("access_token"));
    await page.request.post(`${BASE}/templates/`, {
      headers: { Authorization: `Bearer ${token}`, "X-Environment": "sandbox", "Content-Type": "application/json" },
      data: { name: "Multi Copy", subject: "Subject", html_content: "<p>body</p>" },
    });

    await page.goto("/templates");
    await page.waitForLoadState("load");

    // First duplicate
    await page.locator("tr").filter({ hasText: "Multi Copy" }).locator('[title="Duplicate"]').first().click();
    await expect(page.locator("text=Template duplicated")).toBeVisible({ timeout: 5000 });
    await page.waitForLoadState("load");

    // Second duplicate from original row
    await page.locator("tr").filter({ hasText: "Multi Copy" }).filter({ hasNot: page.locator("text=(Copy)") }).locator('[title="Duplicate"]').click();
    await expect(page.locator("text=Template duplicated")).toBeVisible({ timeout: 5000 });
    await page.waitForLoadState("load");

    await expect(page.locator("text=Multi Copy (Copy) 2")).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// Feature 4+5: Preview modal with dark mode toggle and device switcher
// ---------------------------------------------------------------------------

test.describe("Template preview modal", () => {
  test("preview button is visible in template list", async ({ page }) => {
    await registerAndLogin(page);
    const token = await page.evaluate(() => localStorage.getItem("access_token"));
    await page.request.post(`${BASE}/templates/`, {
      headers: { Authorization: `Bearer ${token}`, "X-Environment": "sandbox", "Content-Type": "application/json" },
      data: { name: "Preview Button Test", subject: "Subject", html_content: "<p>body</p>" },
    });

    await page.goto("/templates");
    await page.waitForLoadState("load");
    await expect(page.locator('[title="Preview"]').first()).toBeVisible({ timeout: 5000 });
  });

  test("clicking preview opens the modal with rendered content", async ({ page }) => {
    await registerAndLogin(page);
    const token = await page.evaluate(() => localStorage.getItem("access_token"));
    await page.request.post(`${BASE}/templates/`, {
      headers: { Authorization: `Bearer ${token}`, "X-Environment": "sandbox", "Content-Type": "application/json" },
      data: { name: "Preview Modal Template", subject: "Welcome Email", html_content: "<p>Hello world from preview</p>" },
    });

    await page.goto("/templates");
    await page.waitForLoadState("load");
    await page.click('[title="Preview"]');

    await expect(page.locator("text=Preview: Preview Modal Template")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Subject: Welcome Email")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("iframe[title='Email preview']")).toBeVisible({ timeout: 5000 });
  });

  test("dark mode toggle switches between light and dark labels", async ({ page }) => {
    await registerAndLogin(page);
    const token = await page.evaluate(() => localStorage.getItem("access_token"));
    await page.request.post(`${BASE}/templates/`, {
      headers: { Authorization: `Bearer ${token}`, "X-Environment": "sandbox", "Content-Type": "application/json" },
      data: { name: "Dark Mode Test", subject: "Subject", html_content: "<p>body</p>" },
    });

    await page.goto("/templates");
    await page.waitForLoadState("load");
    await page.click('[title="Preview"]');
    await expect(page.locator("text=Preview: Dark Mode Test")).toBeVisible({ timeout: 5000 });

    // Initially shows "Light"
    await expect(page.locator("button:has-text('Light')")).toBeVisible({ timeout: 5000 });

    // Click to switch to dark
    await page.click("button:has-text('Light')");
    await expect(page.locator("button:has-text('Dark')")).toBeVisible({ timeout: 3000 });

    // Click again to go back to light
    await page.click("button:has-text('Dark')");
    await expect(page.locator("button:has-text('Light')")).toBeVisible({ timeout: 3000 });
  });

  test("device switcher buttons are visible", async ({ page }) => {
    await registerAndLogin(page);
    const token = await page.evaluate(() => localStorage.getItem("access_token"));
    await page.request.post(`${BASE}/templates/`, {
      headers: { Authorization: `Bearer ${token}`, "X-Environment": "sandbox", "Content-Type": "application/json" },
      data: { name: "Device Switcher Test", subject: "Subject", html_content: "<p>body</p>" },
    });

    await page.goto("/templates");
    await page.waitForLoadState("load");
    await page.click('[title="Preview"]');
    await expect(page.locator("text=Preview: Device Switcher Test")).toBeVisible({ timeout: 5000 });

    await expect(page.locator('[title="Mobile (375px)"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[title="Tablet (768px)"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[title="Desktop"]')).toBeVisible({ timeout: 5000 });
  });

  test("placeholder context inputs shown for templates with placeholders", async ({ page }) => {
    await registerAndLogin(page);
    const token = await page.evaluate(() => localStorage.getItem("access_token"));
    await page.request.post(`${BASE}/templates/`, {
      headers: { Authorization: `Bearer ${token}`, "X-Environment": "sandbox", "Content-Type": "application/json" },
      data: { name: "Placeholder Preview", subject: "Hi {{first_name}}", html_content: "<p>Hello {{first_name}}</p>" },
    });

    await page.goto("/templates");
    await page.waitForLoadState("load");
    await page.click('[title="Preview"]');
    await expect(page.locator("text=Preview: Placeholder Preview")).toBeVisible({ timeout: 5000 });

    await expect(page.locator("text=Preview values:")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("code:has-text('{{first_name}}')")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("button:has-text('Apply')")).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// Fix: header brand component inserted at top, not after footer
// ---------------------------------------------------------------------------

test.describe("Brand component insertion order", () => {
  test("header brand component insert button is visible in brand library", async ({ page }) => {
    await registerAndLogin(page);
    const token = await page.evaluate(() => localStorage.getItem("access_token"));

    // Create a template to edit
    const resp = await page.request.post(`${BASE}/templates/`, {
      headers: { Authorization: `Bearer ${token}`, "X-Environment": "sandbox", "Content-Type": "application/json" },
      data: { name: "Header Insert Test", subject: "Subject", html_content: "<p>body</p>" },
    });
    const { id } = await resp.json();

    // Create a header brand component
    await page.request.post(`${BASE}/brand-components/`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      data: { name: "My Header", category: "header", html_content: "<header><h1>Site Header</h1></header>" },
    });

    await page.goto(`/templates/${id}/edit`);
    await page.waitForLoadState("load");

    // Open brand library panel
    await page.click("button:has-text('Brand Library')");
    await expect(page.locator("text=My Header")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("button:has-text('Insert')").first()).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// Regression: existing template list actions still work
// ---------------------------------------------------------------------------

test.describe("Regression: existing template actions", () => {
  test("edit button navigates to template builder", async ({ page }) => {
    await registerAndLogin(page);
    const token = await page.evaluate(() => localStorage.getItem("access_token"));
    const resp = await page.request.post(`${BASE}/templates/`, {
      headers: { Authorization: `Bearer ${token}`, "X-Environment": "sandbox", "Content-Type": "application/json" },
      data: { name: "Edit Regression", subject: "Subject", html_content: "<p>body</p>" },
    });
    const { id } = await resp.json();

    await page.goto("/templates");
    await page.waitForLoadState("load");
    await page.locator("tr").filter({ hasText: "Edit Regression" }).locator('[title="Edit"]').click();
    await page.waitForURL(`**/templates/${id}/edit`, { timeout: 10000 });
  });

  test("delete button removes the template", async ({ page }) => {
    await registerAndLogin(page);
    const token = await page.evaluate(() => localStorage.getItem("access_token"));
    await page.request.post(`${BASE}/templates/`, {
      headers: { Authorization: `Bearer ${token}`, "X-Environment": "sandbox", "Content-Type": "application/json" },
      data: { name: "Delete Regression", subject: "Subject", html_content: "<p>body</p>" },
    });

    await page.goto("/templates");
    await page.waitForLoadState("load");

    page.once("dialog", (d) => d.accept());
    await page.locator("tr").filter({ hasText: "Delete Regression" }).locator('[title="Delete"]').click();
    await expect(page.locator("text=Template deleted")).toBeVisible({ timeout: 5000 });
    await page.waitForLoadState("load");
    await expect(page.locator("text=Delete Regression")).not.toBeVisible();
  });

  test("promote button still works", async ({ page }) => {
    await registerAndLogin(page);
    const token = await page.evaluate(() => localStorage.getItem("access_token"));
    await page.request.post(`${BASE}/templates/`, {
      headers: { Authorization: `Bearer ${token}`, "X-Environment": "sandbox", "Content-Type": "application/json" },
      data: { name: "Promote Regression", subject: "Subject", html_content: "<p>body</p>" },
    });

    await page.goto("/templates");
    await page.waitForLoadState("load");

    page.once("dialog", (d) => d.accept());
    await page.click('[title="Promote to Production"]');
    await expect(page.locator("text=promoted to Production")).toBeVisible({ timeout: 5000 });
  });

  test("all action buttons visible in sandbox", async ({ page }) => {
    await registerAndLogin(page);
    const token = await page.evaluate(() => localStorage.getItem("access_token"));
    await page.request.post(`${BASE}/templates/`, {
      headers: { Authorization: `Bearer ${token}`, "X-Environment": "sandbox", "Content-Type": "application/json" },
      data: { name: "All Buttons Test", subject: "Subject", html_content: "<p>body</p>" },
    });

    await page.goto("/templates");
    await page.waitForLoadState("load");

    const row = page.locator("tr").filter({ hasText: "All Buttons Test" });
    await expect(row.locator('[title="Promote to Production"]')).toBeVisible({ timeout: 5000 });
    await expect(row.locator('[title="Preview"]')).toBeVisible();
    await expect(row.locator('[title="Duplicate"]')).toBeVisible();
    await expect(row.locator('[title="Edit"]')).toBeVisible();
    await expect(row.locator('[title="Delete"]')).toBeVisible();
  });
});
