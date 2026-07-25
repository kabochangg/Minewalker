import { describe, expect, it } from "vitest";
import { generateDungeon } from "../game/map/DungeonGenerator";
import { validateDungeon } from "../game/map/dungeonValidator";

describe("dungeonValidator", () => {
  it("生成済み盤面の安全域・数字・ID・到達性を受理する", () => {
    expect(
      validateDungeon(
        generateDungeon({
          seed: "validator",
          areaId: "area.beginnerMine",
          difficultyId: "normal",
        }),
      ),
    ).toEqual([]);
  });

  it("数字不整合を検出する", () => {
    const dungeon = generateDungeon({
      seed: "invalid-count",
      areaId: "area.beginnerMine",
      difficultyId: "easy",
    });
    const invalid = {
      ...dungeon,
      field: {
        ...dungeon.field,
        tiles: dungeon.field.tiles.map((tile, index) =>
          index === 0 ? { ...tile, adjacentHazardCount: 8 } : tile,
        ),
      },
    };
    expect(
      validateDungeon(invalid).some((error) => error.includes("周囲数字")),
    ).toBe(true);
  });
});
