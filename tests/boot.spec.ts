import { bootOverlay, expect, test, type Page } from "./fixtures";

const bootSeen = (page: Page) => page.evaluate(() => sessionStorage.getItem("yg-boot"));

// The first log line only appears once the overlay has hydrated and is listening for a skip.
async function waitForBootToStart(page: Page) {
  await expect(bootOverlay(page)).toBeVisible();
  await expect(bootOverlay(page)).toContainText("YoRHa GARDEN OS");
}

test.describe("boot sequence", () => {
  test("plays on a first visit and is remembered for the session", async ({ page }) => {
    await page.goto("/");
    await waitForBootToStart(page);
    expect(await bootSeen(page)).toBeNull();

    // The full sequence takes about five seconds.
    await expect(bootOverlay(page)).toContainText("Deployment Preparations Complete", {
      timeout: 10_000,
    });
    await expect(bootOverlay(page)).toBeHidden({ timeout: 10_000 });
    expect(await bootSeen(page)).toBe("1");
  });

  test("can be skipped with a key", async ({ page }) => {
    await page.goto("/");
    await waitForBootToStart(page);

    await page.keyboard.press("Space");
    await expect(bootOverlay(page)).toBeHidden();
    expect(await bootSeen(page)).toBe("1");
  });

  test("can be skipped with a click", async ({ page }) => {
    await page.goto("/");
    await waitForBootToStart(page);

    await bootOverlay(page).click();
    await expect(bootOverlay(page)).toBeHidden();
    expect(await bootSeen(page)).toBe("1");
  });

  test("does not play again on reload in the same session", async ({ page }) => {
    await page.goto("/");
    await waitForBootToStart(page);
    await page.keyboard.press("Escape");
    await expect(bootOverlay(page)).toBeHidden();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(bootOverlay(page)).toBeHidden();
    await page.waitForLoadState("load");
    await expect(bootOverlay(page)).toBeHidden();
    await expect(page.getByRole("heading", { name: "YoRHa GARDEN" })).toBeVisible();
  });

  test.describe("with reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("does not play at all", async ({ page }) => {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await expect(bootOverlay(page)).toBeHidden();
      await page.waitForLoadState("load");
      await expect(bootOverlay(page)).toBeHidden();
      await expect(page.getByRole("heading", { name: "YoRHa GARDEN" })).toBeVisible();
    });
  });
});
