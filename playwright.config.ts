import { defineConfig, devices } from "@playwright/test";
import {
  MOCK_ORIGIN,
  MOCK_PORT,
  MONITOR_ENV,
  MONITOR_ENV_NO_DNS,
  NO_DNS_PORT,
  PORT as port,
  SITE_ORIGIN as baseURL,
} from "./tests/monitor-env";


export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Tests run against the production build, which is what gets deployed. CI has already built it
  // in an earlier step, so only local runs build here.
  webServer: [
    // Mock Cloudflare API and Access keys for the dashboard tests.
    {
      command: `node tests/mock/cloudflare.mjs ${MOCK_PORT}`,
      url: `${MOCK_ORIGIN}/health`,
      reuseExistingServer: !process.env.CI,
    },
    {
      // Bound to 127.0.0.1 like the live service, whose routing depends on the bind address.
      command: `${process.env.CI ? "" : "npm run build && "}npm start -- --port ${port} --hostname 127.0.0.1`,
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      // The monitor settings are read at request time, so the CI build doesn't need them.
      env: { ...process.env, ...MONITOR_ENV } as Record<string, string>,
    },
    // The same build with a token that can't read DNS records. Servers start in order, so the
    // build above has finished by now.
    {
      command: `npm start -- --port ${NO_DNS_PORT} --hostname 127.0.0.1`,
      url: `http://127.0.0.1:${NO_DNS_PORT}`,
      reuseExistingServer: !process.env.CI,
      env: { ...process.env, ...MONITOR_ENV_NO_DNS } as Record<string, string>,
    },
  ],
});
