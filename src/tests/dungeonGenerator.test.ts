import { describe, expect, it } from "vitest";
import {
  canonicalDungeonSeed,
  generateDungeon,
} from "../game/map/DungeonGenerator";

describe("DungeonGenerator", () => {
  it("正規tupleと同一seedから同一盤面を生成する", () => {
    const required = {
      seed: "same",
      areaId: "area.beginnerMine" as const,
      difficultyId: "normal" as const,
      width: 16,
      height: 24,
      entrance: { x: 2, y: 2 },
    };
    expect(canonicalDungeonSeed(required, 0)).toContain("attempt:0");
    expect(generateDungeon(required)).toEqual(generateDungeon(required));
  });

  it.each(["easy", "normal", "hard"] as const)(
    "%sで開始地点周辺を安全にし、部屋・危険物・checkpointを生成する",
    (difficultyId) => {
      const dungeon = generateDungeon({
        seed: `safe.${difficultyId}`,
        areaId: "area.beginnerMine",
        difficultyId,
      });
      const entrance = dungeon.config.entrance;
      const safe = dungeon.field.tiles.filter(
        (tile) =>
          Math.max(
            Math.abs(tile.x - entrance.x),
            Math.abs(tile.y - entrance.y),
          ) <= dungeon.config.safeRadius,
      );
      expect(safe.every((tile) => !tile.hasMine)).toBe(true);
      expect(dungeon.rooms.length).toBeGreaterThan(0);
      expect(dungeon.hazards.length).toBeGreaterThan(0);
      expect(dungeon.chestPositions.length).toBeGreaterThan(0);
      expect(dungeon.monsterSpawns.length).toBeGreaterThan(0);
      expect(dungeon.checkpoints).toHaveLength(1);
    },
  );

  it("空seedと範囲外サイズを明確に拒否する", () => {
    expect(() =>
      generateDungeon({
        seed: "",
        areaId: "area.beginnerMine",
        difficultyId: "normal",
      }),
    ).toThrow();
    expect(() =>
      generateDungeon({
        seed: "bad",
        areaId: "area.beginnerMine",
        difficultyId: "easy",
        width: 100,
      }),
    ).toThrow();
  });

  it("検証失敗時にattempt 0〜31を試して生成エラーにする", () => {
    let attempts = 0;
    expect(() =>
      generateDungeon(
        { seed: "retry", areaId: "area.beginnerMine", difficultyId: "easy" },
        () => {
          attempts += 1;
          return ["forced"];
        },
      ),
    ).toThrow("32回");
    expect(attempts).toBe(32);
  });
});
