import { expect, skipBoot, test, waitForHydration, type Page } from "./fixtures";

const LABELS = ["System", "Status", "Access", "Operator", "Monitor"];

const tab = (page: Page, label: string) => page.getByRole("tab", { name: new RegExp(`^${label}`) });

// Only the active panel is displayed, so it is the only one exposed to role queries.
async function expectActive(page: Page, label: string) {
  await expect(tab(page, label)).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toHaveCount(1);
  await expect(page.getByRole("tabpanel")).toContainText(label);
  for (const other of LABELS.filter((l) => l !== label)) {
    await expect(tab(page, other)).toHaveAttribute("aria-selected", "false");
  }
}

test.describe("section tabs", () => {
  test.beforeEach(async ({ page }) => {
    await skipBoot(page);
    await page.goto("/");
    await waitForHydration(page);
    await expectActive(page, "System");
  });

  test("switch on click", async ({ page }) => {
    await tab(page, "Status").click();
    await expectActive(page, "Status");
    await tab(page, "Operator").click();
    await expectActive(page, "Operator");
  });

  test("switch on Enter", async ({ page }) => {
    await tab(page, "Access").focus();
    await page.keyboard.press("Enter");
    await expectActive(page, "Access");
  });

  test("cycle with ArrowDown and ArrowUp, wrapping at both ends", async ({ page }) => {
    await page.keyboard.press("ArrowDown");
    await expectActive(page, "Status");
    await page.keyboard.press("ArrowUp");
    await expectActive(page, "System");
    await page.keyboard.press("ArrowUp");
    await expectActive(page, "Monitor");
    await page.keyboard.press("ArrowDown");
    await expectActive(page, "System");
  });

  test("jump with the 1–5 keys", async ({ page }) => {
    for (const [i, label] of [...LABELS.entries()].reverse()) {
      await page.keyboard.press(String(i + 1));
      await expectActive(page, label);
    }
  });
});
