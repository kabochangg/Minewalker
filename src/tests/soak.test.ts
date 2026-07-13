import { describe, expect, it } from "vitest";
import {
  generateMinefield,
  validateMinefield,
} from "../game/systems/MinefieldSystem";

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
});
