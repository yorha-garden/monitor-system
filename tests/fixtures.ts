import { expect, test as base, type Page } from "@playwright/test";

type Fixtures = {
  // Console errors, uncaught page errors and hydration warnings seen during the test.
  consoleProblems: string[];
};

// Every test fails if the page logs an error or a hydration warning, not just the dedicated one.
export const test = base.extend<Fixtures>({
  consoleProblems: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on("console", (msg) => {
        const text = msg.text();
        if (msg.type() === "error" || /hydrat/i.test(text)) problems.push(`${msg.type()}: ${text}`);
      });
      page.on("pageerror", (err) => problems.push(`pageerror: ${err.message}`));
      await use(problems);
      expect(problems, "console errors or hydration warnings").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
export type { Page };

export function bootOverlay(page: Page) {
  return page.locator("#boot");
}

// Marks the boot sequence as already seen this session, so the page loads straight to the content.
export async function skipBoot(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem("yg-boot", "1"));
}

// The clock only starts ticking once React has hydrated the page and run its effects.
export async function waitForHydration(page: Page) {
  await expect(page.locator("time")).toHaveText(/^\d{2}:\d{2}:\d{2}$/);
}
