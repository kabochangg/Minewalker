import { expect, type Page } from "@playwright/test";

/** 指定したモバイル表示領域へ変更する。 */
export async function useMobileViewport(page: Page): Promise<void> {
  await page.setViewportSize({ width: 390, height: 844 });
}

/** タイトル画面から新規探索を開始する。 */
export async function startNewExploration(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByText("ゲーム開始").click();
  await page.getByText("はじめから").click();
}

/** Canvas中央付近をタップする。 */
export async function tapCanvas(
  page: Page,
  xRatio = 0.5,
  yRatio = 0.5,
): Promise<void> {
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error("Canvasの表示領域を取得できません");
  await page.mouse.click(
    bounds.x + bounds.width * xRatio,
    bounds.y + bounds.height * yRatio,
  );
}
