import { expect, test } from "@playwright/test";

test("title to exploration smoke flow", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();

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
  await page.goto("/");
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
