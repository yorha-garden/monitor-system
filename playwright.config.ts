import { defineConfig, devices } from "@playwright/test";
import { MOCK_ORIGIN, MOCK_PORT, MONITOR_ENV, PORT as port, SITE_ORIGIN as baseURL } from "./tests/monitor-env";


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
      command: `${process.env.CI ? "" : "npm run build && "}npm start -- --port ${port}`,
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      // The monitor settings are read at request time, so the CI build doesn't need them.
      env: { ...process.env, ...MONITOR_ENV } as Record<string, string>,
    },
  ],
});
