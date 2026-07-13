import { describe, expect, it } from "vitest";
import {
  generateMinefield,
  validateMinefield,
} from "../game/systems/MinefieldSystem";
import { getTile } from "../game/map/types";

describe("generateMinefield", () => {
  it("creates a board with zero mines", () => {
    const field = generateMinefield({
      width: 4,
      height: 4,
      mineCount: 0,
      safeRadius: 1,
      seed: "zero",
      startX: 1,
      startY: 1,
    });

    expect(field.tiles.every((tile) => !tile.hasMine)).toBe(true);
    expect(field.tiles.every((tile) => tile.adjacentMineCount === 0)).toBe(
      true,
    );
  });

  it("keeps the start area safe", () => {
    const field = generateMinefield({
      width: 8,
      height: 8,
      mineCount: 10,
      safeRadius: 1,
      seed: "safe",
      startX: 4,
      startY: 4,
    });

    for (let y = 3; y <= 5; y += 1) {
      for (let x = 3; x <= 5; x += 1) {
        expect(getTile(field, x, y)?.hasMine).toBe(false);
      }
    }
  });

  it("produces the same board for the same seed", () => {
    const config = {
      width: 8,
      height: 8,
      mineCount: 10,
      safeRadius: 1,
      seed: "repeatable",
      startX: 4,
      startY: 4,
    };

    const first = generateMinefield(config);
    const second = generateMinefield(config);

    expect(first.tiles.map((tile) => tile.hasMine)).toEqual(
      second.tiles.map((tile) => tile.hasMine),
    );
    expect(first.tiles.map((tile) => tile.adjacentMineCount)).toEqual(
      second.tiles.map((tile) => tile.adjacentMineCount),
    );
  });

  it("validates all adjacent mine counts", () => {
    const field = generateMinefield({
      width: 10,
      height: 10,
      mineCount: 18,
      safeRadius: 1,
      seed: "counts",
      startX: 4,
      startY: 7,
    });

    expect(() => validateMinefield(field)).not.toThrow();
  });
});
