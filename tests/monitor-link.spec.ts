import { expect, skipBoot, test, waitForHydration } from "./fixtures";

const MONITOR_URL = "https://monitor.yorhagarden.xyz";

test.describe("monitor shortcut", () => {
  test.beforeEach(async ({ page }) => {
    await skipBoot(page);
    await page.goto("/");
    await waitForHydration(page);
  });

  test("is linked from the top bar", async ({ page }) => {
    await expect(page.locator(".topbar").getByRole("link", { name: "MONITOR ↗" })).toHaveAttribute(
      "href",
      MONITOR_URL,
    );
  });

  test("has its own section, opened with the 5 key", async ({ page }) => {
    await page.keyboard.press("5");
    const panel = page.getByRole("tabpanel");
    await expect(panel).toContainText("Monitor");
    await expect(panel.getByRole("link", { name: "monitor ↗" })).toHaveAttribute("href", MONITOR_URL);
  });
});
