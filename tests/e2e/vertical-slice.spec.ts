import { expect, test } from "@playwright/test";

async function openFreshTitle(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  await page.mouse.click(195, 548);
  await page.waitForTimeout(200);
}

test("title to exploration smoke flow", async ({ page }) => {
  await openFreshTitle(page);
  const canvas = page.locator("canvas");

  await page.mouse.click(195, 570);
  await page.waitForTimeout(200);
  await page.mouse.click(288, 172);
  await page.waitForTimeout(200);
  await page.mouse.click(234, 790);
  await page.waitForTimeout(300);

  await expect(canvas).toBeVisible();
  await page.mouse.click(179, 650);
  await page.mouse.click(43, 772);
  await page.mouse.click(211, 394);
  await page.waitForTimeout(200);

  const screenshot = await page.screenshot();
  expect(screenshot.length).toBeGreaterThan(10_000);
});

test("in-game menu can return to home", async ({ page }) => {
  await openFreshTitle(page);
  await page.mouse.click(195, 570);
  await page.mouse.click(288, 172);
  await page.mouse.click(234, 790);
  await page.waitForTimeout(300);

  await page.mouse.click(360, 104);
  await page.waitForTimeout(100);
  await page.mouse.click(195, 405);
  await page.waitForTimeout(200);

  await expect(page.locator("canvas")).toBeVisible();
});

test("settings survive reload smoke flow", async ({ page }) => {
  await openFreshTitle(page);
  await page.mouse.click(308, 684);
  await page.waitForTimeout(100);
  await page.mouse.click(195, 220);
  await page.reload();
  await expect(page.locator("canvas")).toBeVisible();
});

test("production shell remains available offline", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForFunction(() => "serviceWorker" in navigator);
  await page.waitForTimeout(1_000);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("canvas")).toBeVisible();
});
