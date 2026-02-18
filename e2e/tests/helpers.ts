import { type Page } from "@playwright/test";

const BASE = "http://localhost:8000/api";

/** Register + login a fresh user, store tokens in localStorage, navigate to /dashboard */
export async function registerAndLogin(page: Page, suffix = Date.now().toString()) {
  const username = `e2euser_${suffix}`;
  const email = `e2e_${suffix}@example.com`;
  const password = "testpass123";

  // Register via API
  await page.request.post(`${BASE}/auth/register/`, {
    data: { username, email, password, password_confirm: password },
  });

  // Login via API and store tokens
  const loginResp = await page.request.post(`${BASE}/auth/login/`, {
    data: { username, password },
  });
  const { access, refresh } = await loginResp.json();

  await page.goto("/");
  await page.evaluate(
    ([a, r]) => {
      localStorage.setItem("access_token", a);
      localStorage.setItem("refresh_token", r);
      localStorage.setItem("xyno_environment", "sandbox");
    },
    [access, refresh]
  );
  await page.goto("/dashboard");
  await page.waitForURL("**/dashboard");

  return { username, email, password };
}

/** Switch the sidebar environment toggle */
export async function switchEnvironment(page: Page, env: "sandbox" | "production") {
  await page.click(`button:has-text("${env === "sandbox" ? "Sandbox" : "Production"}")`);
  // Small wait for data refetch
  await page.waitForTimeout(500);
}
