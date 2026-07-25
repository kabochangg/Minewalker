/** ゲーム内で使用する日本語フォントファミリー名。 */
export const GAME_FONT_FAMILY = '"MinewalkerJP", "Noto Sans JP", sans-serif';

/** フォントの読み込み確認に使用する代表文字列。 */
export const FONT_PROBE_TEXT = "鉱山 危険 処理 0123456789";

/** ゲームが保証するフォントウェイト。 */
export const GAME_FONT_WEIGHTS = [400, 700] as const;

/** 自己ホストするフォント資産。 */
export const FONT_ASSETS = [
  {
    weight: 400,
    url: new URL("./fonts/minewalker-jp-regular.woff2", import.meta.url).href,
  },
  {
    weight: 700,
    url: new URL("./fonts/minewalker-jp-bold.woff2", import.meta.url).href,
  },
] as const;

/** 同梱フォントのライセンスURL。 */
export const FONT_LICENSE_URL = new URL("./fonts/OFL.txt", import.meta.url)
  .href;

/** Phaser Textへ渡す共通スタイル。 */
export const GAME_TEXT_STYLE = {
  fontFamily: GAME_FONT_FAMILY,
  color: "#f4ead7",
} as const;

/** ブラウザーで日本語フォントを事前読み込みする。 */
export async function loadGameFonts(
  fontSet: FontFaceSet | undefined = globalThis.document?.fonts,
): Promise<boolean> {
  if (!fontSet) return false;
  await Promise.all(
    GAME_FONT_WEIGHTS.map((weight) =>
      fontSet.load(`${weight} 16px MinewalkerJP`, FONT_PROBE_TEXT),
    ),
  );
  await fontSet.ready;
  return GAME_FONT_WEIGHTS.every((weight) =>
    fontSet.check(`${weight} 16px MinewalkerJP`, FONT_PROBE_TEXT),
  );
}
