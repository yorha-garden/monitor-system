// Shared by playwright.config.ts and the dashboard tests: the dashboard is served on `localhost`
// while the landing page tests use 127.0.0.1, and its Cloudflare dependencies point at the mock.
export const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
export const MOCK_PORT = Number(process.env.PLAYWRIGHT_MOCK_PORT ?? 3199);
export const MOCK_ORIGIN = `http://127.0.0.1:${MOCK_PORT}`;
export const SITE_ORIGIN = `http://127.0.0.1:${PORT}`;
export const DASHBOARD_ORIGIN = `http://localhost:${PORT}`;
// A second server whose API token lacks the DNS permission.
export const NO_DNS_PORT = PORT + 1;
export const NO_DNS_DASHBOARD_ORIGIN = `http://localhost:${NO_DNS_PORT}`;

export const MONITOR_ENV = {
  DASHBOARD_HOST: "localhost",
  CF_ACCESS_TEAM_DOMAIN: MOCK_ORIGIN,
  CF_ACCESS_AUD: "test-aud",
  CLOUDFLARE_API_BASE_URL: `${MOCK_ORIGIN}/client/v4`,
  CLOUDFLARE_API_TOKEN: "test-token",
  CLOUDFLARE_ACCOUNT_ID: "acc-test",
  CLOUDFLARE_ZONE_ID: "zone-test",
  MONITOR_DOMAIN: "yorhagarden.test",
  MONITOR_PROBE_URL_TEMPLATE: `${MOCK_ORIGIN}/probe/{hostname}`,
};

export const MONITOR_ENV_NO_DNS = { ...MONITOR_ENV, CLOUDFLARE_API_TOKEN: "test-token-no-dns" };
