import { expect, skipBoot, test, waitForHydration, type Page } from "./fixtures";

// The landing page server runs with the mock Cloudflare settings (tests/monitor-env.ts), so the
// Status panel summarizes the mock's tunnels: garden-alpha, -beta, -gamma and -local.
const value = (page: Page, label: string) =>
  page
    .getByRole("tabpanel")
    .locator(".row", { has: page.locator("dt", { hasText: new RegExp(`^${label}$`) }) })
    .locator("dd");

test.describe("landing page status", () => {
  test.beforeEach(async ({ page }) => {
    await skipBoot(page);
    await page.goto("/");
    await waitForHydration(page);
    await page.getByRole("tab", { name: /^Status/ }).click();
  });

  test("shows the monitor's live summary", async ({ page }) => {
    await expect(value(page, "Vitals")).toHaveText("Degraded");
    await expect(value(page, "Vitals")).toHaveClass("alert");
    await expect(value(page, "Tunnels")).toHaveText("3/4 online");
    await expect(value(page, "Hostnames")).toHaveText("3/6 answering");
    await expect(value(page, "Edge")).toHaveText("Hong Kong · Jakarta · Singapore");
    await expect(value(page, "Last check")).toHaveText(/^\d{2}:\d{2} UTC$/);
    await expect(page.getByRole("img", { name: "50 percent of hostnames answering" })).toBeVisible();
    await expect(page.getByRole("tabpanel").locator(".barlbl")).toContainText("50% — it's staging");
  });

  test("never reveals addresses, hostnames or ports", async ({ page }) => {
    await expect(value(page, "Tunnels")).toHaveText("3/4 online");
    const text = await page.locator("body").innerText();
    for (const secret of ["203.0.113", "198.51.100", "192.0.2.", "yorhagarden.test", "localhost:"]) {
      expect(text).not.toContain(secret);
    }
  });
});
