import { expect, type Page } from "@playwright/test";

/** 自己ホスト日本語フォントの読み込みと不正文字不在を確認する。 */
export async function expectJapaneseFontReady(page: Page): Promise<void> {
  await page.waitForFunction(() =>
    document.fonts.check('400 16px "MinewalkerJP"', "鉱山 危険 処理"),
  );
  const status = await page.evaluate(() => {
    const bodyFont = getComputedStyle(document.body).fontFamily;
    const text = document.body.textContent ?? "";
    return {
      bodyFont,
      hasReplacementCharacter: text.includes("\uFFFD"),
      loaded: document.fonts.check(
        '700 16px "MinewalkerJP"',
        "探索 危険 処理 0123456789",
      ),
    };
  });
  expect(status.bodyFont).toContain("MinewalkerJP");
  expect(status.hasReplacementCharacter).toBe(false);
  expect(status.loaded).toBe(true);
}
