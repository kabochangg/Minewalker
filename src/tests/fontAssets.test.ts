import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FONT_ASSETS,
  FONT_LICENSE_URL,
  FONT_PROBE_TEXT,
  GAME_FONT_FAMILY,
  GAME_FONT_WEIGHTS,
} from "../assets/fontCatalog";

describe("日本語フォント資産", () => {
  it("通常・太字のWOFF2とOFLライセンスを同梱する", () => {
    const fontDirectory = resolve("src/assets/fonts");
    expect(
      statSync(resolve(fontDirectory, "minewalker-jp-regular.woff2")).size,
    ).toBeGreaterThan(100_000);
    expect(
      statSync(resolve(fontDirectory, "minewalker-jp-bold.woff2")).size,
    ).toBeGreaterThan(100_000);
    expect(readFileSync(resolve(fontDirectory, "OFL.txt"), "utf8")).toContain(
      "SIL OPEN FONT LICENSE",
    );
    expect(GAME_FONT_WEIGHTS).toEqual([400, 700]);
    expect(FONT_ASSETS).toHaveLength(2);
    expect(FONT_LICENSE_URL).toContain("OFL");
  });

  it("共通ファミリーと代表日本語グリフを定義する", () => {
    expect(GAME_FONT_FAMILY).toContain("MinewalkerJP");
    expect(FONT_PROBE_TEXT).toContain("鉱山");
    expect(FONT_PROBE_TEXT).toContain("危険");
    expect(FONT_PROBE_TEXT).toContain("0123456789");
  });
});
