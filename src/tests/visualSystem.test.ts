import { describe, expect, it } from "vitest";
import type { MoveDirection } from "../game/systems/MovementSystem";
import {
  AREA_VISUAL_THEMES,
  facingFromMoveDirection,
  getMonsterVisualState,
  getTileVisualVariant,
  isForbiddenGuideMagenta,
  VISUAL_TOKENS,
} from "../game/visual/VisualSystem";

describe("visual system", () => {
  it("returns the same tile variant for the same seed and coordinate", () => {
    const first = getTileVisualVariant("field-42", 7, 11, "hiddenWall");
    const second = getTileVisualVariant("field-42", 7, 11, "hiddenWall");
    expect(second).toBe(first);
  });

  it("does not repeat the same wall variant three times in a straight line", () => {
    const horizontal = [0, 1, 2].map((x) =>
      getTileVisualVariant("field-42", x, 3, "hiddenWall"),
    );
    const vertical = [0, 1, 2].map((y) =>
      getTileVisualVariant("field-42", 3, y, "hiddenWall"),
    );
    expect(new Set(horizontal).size).toBe(3);
    expect(new Set(vertical).size).toBe(3);
  });

  it("maps all eight movement directions to the runtime facing direction", () => {
    const directions: readonly MoveDirection[] = [
      "up",
      "upRight",
      "right",
      "downRight",
      "down",
      "downLeft",
      "left",
      "upLeft",
    ];
    for (const direction of directions) {
      expect(facingFromMoveDirection(direction)).toBe(direction);
    }
  });

  it("contains no high-saturation guide magenta in tokens or area themes", () => {
    const tokenColors: number[] = Object.values(VISUAL_TOKENS.colors).flatMap(
      (color) => (typeof color === "number" ? [color] : []),
    );
    const themeColors = Object.values(AREA_VISUAL_THEMES).flatMap((theme) => [
      theme.cave,
      ...theme.wall,
      theme.wallHighlight,
      ...theme.floor,
      theme.accent,
      theme.crack,
      theme.glow,
    ]);
    expect([...tokenColors, ...themeColors].some(isForbiddenGuideMagenta)).toBe(
      false,
    );
  });

  it("hides every monster hint until the monster is discovered", () => {
    expect(getMonsterVisualState(false, 8, 10)).toEqual({
      showBody: false,
      showShadow: false,
      showHp: false,
    });
    expect(getMonsterVisualState(true, 8, 10)).toEqual({
      showBody: true,
      showShadow: true,
      showHp: true,
    });
  });
});
