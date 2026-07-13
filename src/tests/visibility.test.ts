import { describe, expect, it } from "vitest";
import { getTile, replaceTile } from "../game/map/types";
import { generateMinefield } from "../game/systems/MinefieldSystem";
import { isPositionDiscovered } from "../game/systems/VisibilitySystem";

function createHiddenField() {
  return generateMinefield({
    width: 7,
    height: 7,
    mineCount: 0,
    safeRadius: 0,
    seed: "visibility",
    startX: 0,
    startY: 0,
  });
}

describe("exploration visibility", () => {
  it("keeps distant monsters hidden on unopened tiles", () => {
    const field = createHiddenField();
    expect(isPositionDiscovered(field, { x: 0, y: 0 }, { x: 5, y: 5 })).toBe(
      false,
    );
  });

  it("discovers monsters when adjacent or when their tile is revealed", () => {
    const field = createHiddenField();
    expect(isPositionDiscovered(field, { x: 2, y: 2 }, { x: 3, y: 3 })).toBe(
      true,
    );

    const target = getTile(field, 5, 5);
    if (!target) throw new Error("Expected visibility test tile");
    const revealed = replaceTile(field, { ...target, isRevealed: true });
    expect(isPositionDiscovered(revealed, { x: 0, y: 0 }, { x: 5, y: 5 })).toBe(
      true,
    );
  });
});
