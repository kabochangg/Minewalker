import { describe, expect, it } from "vitest";
import {
  generateMinefield,
  validateMinefield,
} from "../game/systems/MinefieldSystem";
import { generateDungeon } from "../game/map/DungeonGenerator";
import { validateDungeon } from "../game/map/dungeonValidator";

describe("30-minute equivalent minefield soak", () => {
  it("generates and validates 1,800 consecutive seeded board states", () => {
    let checkedTiles = 0;
    for (let second = 0; second < 1_800; second += 1) {
      const field = generateMinefield({
        width: 11,
        height: 16,
        mineCount: 26,
        safeRadius: 1,
        seed: `soak:${second}`,
        startX: 4,
        startY: 7,
      });
      validateMinefield(field);
      checkedTiles += field.tiles.length;
    }

    expect(checkedTiles).toBe(316_800);
  });

  it("3難易度で合計10,000盤面の安全性・数字・ID・到達性を検証する", () => {
    const difficulties = ["easy", "normal", "hard"] as const;
    for (let index = 0; index < 10_000; index += 1) {
      const difficultyId = difficulties[index % difficulties.length];
      const dungeon = generateDungeon({
        seed: `soak.dungeon.${index}`,
        areaId: "area.beginnerMine",
        difficultyId,
      });
      expect(validateDungeon(dungeon)).toEqual([]);
    }
  }, 60_000);
});
