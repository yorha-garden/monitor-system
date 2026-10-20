import { ACCESS_JWT_HEADER } from "../lib/monitor/access";
import { expect, test, type Page } from "./fixtures";
import { DASHBOARD_ORIGIN, MOCK_ORIGIN, SITE_ORIGIN } from "./monitor-env";

async function accessToken(params: Record<string, string> = {}) {
  const res = await fetch(`${MOCK_ORIGIN}/__token?${new URLSearchParams(params)}`);
  return res.text();
}

async function openDashboard(page: Page) {
  await page.setExtraHTTPHeaders({ [ACCESS_JWT_HEADER]: await accessToken() });
  await page.goto(`${DASHBOARD_ORIGIN}/`);
  await expect(page.locator(".mon-report")).toBeVisible();
}

const stat = (page: Page, label: string) => page.locator(".mon-stat", { hasText: label }).locator("dd");
const tunnel = (page: Page, name: string) => page.getByRole("region", { name: `Tunnel ${name}` });
const route = (page: Page, hostname: string) => page.getByRole("row").filter({ hasText: hostname }).first();

test.describe("dashboard access", () => {
  test("is not served on the main site", async ({ request }) => {
    expect((await request.get(`${SITE_ORIGIN}/dashboard`)).status()).toBe(404);
    const home = await request.get(`${SITE_ORIGIN}/`);
    expect(home.status()).toBe(200);
    expect(await home.text()).toContain("YoRHa GARDEN");
  });

  test("refuses requests without a valid Access token", async ({ request }) => {
    const cases: Record<string, string | undefined> = {
      missing: undefined,
      garbage: "not-a-jwt",
      "wrong audience": await accessToken({ aud: "someone-else" }),
      expired: await accessToken({ exp: "-1m" }),
    };
    for (const [name, token] of Object.entries(cases)) {
      const res = await request.get(`${DASHBOARD_ORIGIN}/`, {
        headers: token ? { [ACCESS_JWT_HEADER]: token } : {},
      });
      expect(res.status(), name).toBe(403);
      expect(await res.text(), name).not.toContain("garden-alpha");
    }
  });

  test("only serves the dashboard on its host", async ({ request }) => {
    const headers = { [ACCESS_JWT_HEADER]: await accessToken() };
    expect((await request.get(`${DASHBOARD_ORIGIN}/`, { headers })).status()).toBe(200);
    expect((await request.get(`${DASHBOARD_ORIGIN}/dashboard`, { headers })).status()).toBe(200);
    expect((await request.get(`${DASHBOARD_ORIGIN}/elsewhere`, { headers })).status()).toBe(404);
  });

  // cloudflared forwards requests to the plain-HTTP origin with X-Forwarded-Proto: https. The
  // redirect from / must lead to the visitor's own https origin, never to the server's localhost.
  test("works behind a tunnel that terminates TLS", async ({ request }) => {
    const headers = { [ACCESS_JWT_HEADER]: await accessToken(), "X-Forwarded-Proto": "https" };
    const visitorOrigin = DASHBOARD_ORIGIN.replace("http:", "https:");
    const root = await request.get(`${DASHBOARD_ORIGIN}/`, { headers, maxRedirects: 0 });
    expect(root.status()).toBe(307);
    expect(new URL(root.headers().location, visitorOrigin).href).toBe(`${visitorOrigin}/dashboard`);
    // The test server itself only speaks http, so fetch the redirect target directly.
    const page = await request.get(`${DASHBOARD_ORIGIN}/dashboard`, { headers });
    expect(page.status()).toBe(200);
    expect(await page.text()).toContain("garden-alpha");
  });
});

test.describe("dashboard report", () => {
  test.beforeEach(async ({ page }) => {
    await openDashboard(page);
  });

  test("summarizes the domain's tunnels across servers", async ({ page }) => {
    await expect(stat(page, "Tunnels healthy")).toHaveText("1/3");
    await expect(stat(page, "Connectors")).toHaveText("3" + "2 servers");
    await expect(stat(page, "Hostnames up")).toHaveText("2/4");
    await expect(stat(page, "Requests 24h")).toHaveText("1,297");
    await expect(stat(page, "5xx 24h")).toHaveText("7");
    await expect(page.locator(".mon-meta")).toContainText("operator@yorhagarden.test");
  });

  test("lists only tunnels that route the monitored domain", async ({ page }) => {
    const names = page.locator(".mon-tunnel .ptitle > span:first-child");
    await expect(names).toHaveText(["garden-alpha", "garden-beta", "garden-gamma"]);
    await expect(tunnel(page, "garden-alpha").locator(".mon-status")).toHaveText("Healthy");
    await expect(tunnel(page, "garden-beta").locator(".mon-status")).toHaveText("Degraded");
    await expect(tunnel(page, "garden-gamma").locator(".mon-status")).toHaveText("Down");
  });

  test("shows each connector with its server, edges and version", async ({ page }) => {
    const alpha = tunnel(page, "garden-alpha");
    await expect(alpha.getByRole("row", { name: /203\.0\.113\.10/ })).toContainText("cgk02 sin13");
    await expect(alpha.getByRole("row", { name: /203\.0\.113\.10/ })).toContainText(/5h \d+m/);
    await expect(alpha.getByRole("row", { name: /198\.51\.100\.20/ })).toContainText("2026.8.0");
    await expect(tunnel(page, "garden-gamma")).toContainText(/No cloudflared connected for 3h \d+m\./);
  });

  test("shows uptime checks and traffic per hostname", async ({ page }) => {
    await expect(route(page, "yorhagarden.test")).toContainText(/Up\s*200/);
    await expect(route(page, "yorhagarden.test")).toContainText("1,230");
    await expect(route(page, "monitor.yorhagarden.test")).toContainText(/Up\s*302/);
    await expect(route(page, "api.yorhagarden.test")).toContainText(/Down\s*502/);
    await expect(route(page, "api.yorhagarden.test").locator(".mon-alert")).toHaveText("7");
    await expect(route(page, "old.yorhagarden.test")).toContainText(/Down\s*530/);
  });
});
