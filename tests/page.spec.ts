import { bootOverlay, expect, skipBoot, test, waitForHydration } from "./fixtures";

test.describe("display mode", () => {
  test.beforeEach(async ({ page }) => {
    await skipBoot(page);
  });

  test("toggles, persists and is restored before the page loads", async ({ page }) => {
    const html = page.locator("html");
    const toggle = page.getByRole("button", { name: "Toggle display mode" });
    const saved = () => page.evaluate(() => localStorage.getItem("yg-inv"));

    await page.goto("/");
    await waitForHydration(page);
    await expect(html).not.toHaveClass(/\binv\b/);

    await toggle.click();
    await expect(html).toHaveClass(/\binv\b/);
    expect(await saved()).toBe("1");

    // Record the mode as soon as the DOM is parsed, before any client component has hydrated.
    await page.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        (window as { invAtDomContentLoaded?: boolean }).invAtDomContentLoaded =
          document.documentElement.classList.contains("inv");
      });
    });
    await page.reload();
    expect(
      await page.evaluate(() => (window as { invAtDomContentLoaded?: boolean }).invAtDomContentLoaded),
    ).toBe(true);
    await waitForHydration(page);
    await expect(html).toHaveClass(/\binv\b/);

    await toggle.click();
    await expect(html).not.toHaveClass(/\binv\b/);
    expect(await saved()).toBe("0");
  });
});

test("the UTC clock replaces its placeholder", async ({ page, request }) => {
  const served = await request.get("/");
  expect(await served.text()).toContain("--:--:--");

  await skipBoot(page);
  await page.goto("/");
  const clock = page.locator("time");
  await expect(clock).toHaveText(/^\d{2}:\d{2}:\d{2}$/);
  const iso = await clock.getAttribute("datetime");
  expect(Math.abs(Date.parse(iso!) - Date.now())).toBeLessThan(60_000);
});

test("the title glitches on hover", async ({ page }) => {
  await skipBoot(page);
  await page.goto("/");
  await waitForHydration(page);

  const title = page.getByRole("heading", { name: "YoRHa GARDEN" });
  await expect(title).not.toHaveClass(/\bglitch\b/);
  await title.hover();
  await expect(title).toHaveClass(/\bglitch\b/);
});

// The `consoleProblems` fixture checks every test; this one walks through both kinds of visit.
test("logs no console errors or hydration warnings", async ({ page, consoleProblems }) => {
  await page.goto("/");
  await expect(bootOverlay(page)).toBeHidden({ timeout: 15_000 });
  await waitForHydration(page);

  await page.reload();
  await waitForHydration(page);
  await page.keyboard.press("2");
  await expect(page.getByRole("tabpanel")).toContainText("Status");

  expect(consoleProblems).toEqual([]);
});
