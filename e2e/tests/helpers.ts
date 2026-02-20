import { type Page } from "@playwright/test";

const BASE = "http://localhost:8000/api";

/**
 * The frontend Docker container has VITE_API_URL=http://backend:8000 which is a
 * Docker-internal hostname not resolvable from the host machine's browser (Playwright).
 * This intercepts those requests and rewrites them to localhost:8000.
 */
export async function fixDockerApiRouting(page: Page) {
  await page.route("http://backend:8000/**", (route) => {
    const url = route.request().url().replace("http://backend:8000", "http://localhost:8000");
    route.continue({ url });
  });
}

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

  // Rewrite Docker-internal API URLs to localhost before any page loads
  await fixDockerApiRouting(page);

  // Inject tokens into localStorage before the app JS runs, so AuthContext
  // reads them on mount without triggering a redirect to /login
  await page.addInitScript(([a, r]: string[]) => {
    localStorage.setItem("access_token", a);
    localStorage.setItem("refresh_token", r);
    localStorage.setItem("xyno_environment", "sandbox");
  }, [access, refresh]);

  await page.goto("/dashboard");
  await page.waitForURL("**/dashboard", { timeout: 20_000 });
  await page.waitForLoadState("networkidle");

  return { username, email, password };
}

/** Switch the sidebar environment toggle */
export async function switchEnvironment(page: Page, env: "sandbox" | "production") {
  await page.click(`button:has-text("${env === "sandbox" ? "Sandbox" : "Production"}")`);
  // Small wait for data refetch
  await page.waitForTimeout(500);
}
