import { describe, expect, it } from "vitest";
import { createInitialPlayer } from "../game/entities/player";
import { getTile, replaceTile } from "../game/map/types";
import { generateMinefield, isAdjacent } from "../game/systems/MinefieldSystem";
import {
  canMoveTo,
  directionFromAngle,
  MOVE_VECTORS,
  tryMove,
  type MoveDirection,
} from "../game/systems/MovementSystem";

function createOpenField() {
  const field = generateMinefield({
    width: 5,
    height: 5,
    mineCount: 0,
    safeRadius: 5,
    seed: "movement",
    startX: 2,
    startY: 2,
  });
  return field;
}

describe("eight-direction movement", () => {
  it("maps joystick angles to all eight directions", () => {
    const expected: readonly MoveDirection[] = [
      "right",
      "downRight",
      "down",
      "downLeft",
      "left",
      "upLeft",
      "up",
      "upRight",
    ];
    expected.forEach((direction, index) => {
      expect(directionFromAngle(index * 45)).toBe(direction);
      expect(MOVE_VECTORS[direction]).toBeDefined();
    });
  });

  it("treats all eight surrounding tiles as adjacent", () => {
    const center = { x: 2, y: 2 };
    for (const vector of Object.values(MOVE_VECTORS)) {
      expect(
        isAdjacent(center, {
          x: center.x + vector.x,
          y: center.y + vector.y,
        }),
      ).toBe(true);
    }
    expect(isAdjacent(center, { x: 2, y: 2 })).toBe(false);
    expect(isAdjacent(center, { x: 4, y: 2 })).toBe(false);
  });

  it("allows a diagonal move only when both corner tiles are walkable", () => {
    const field = createOpenField();
    const target = getTile(field, 3, 3);
    if (!target) throw new Error("Expected target tile");
    expect(canMoveTo(field, { x: 2, y: 2 }, target)).toBe(true);

    const corner = getTile(field, 3, 2);
    if (!corner) throw new Error("Expected corner tile");
    const blocked = replaceTile(field, { ...corner, isWalkable: false });
    expect(canMoveTo(blocked, { x: 2, y: 2 }, target)).toBe(false);
  });

  it("blocks occupied targets and occupied diagonal corners", () => {
    const field = createOpenField();
    const player = { ...createInitialPlayer(), x: 2, y: 2 };
    const target = getTile(field, 3, 3);
    if (!target) throw new Error("Expected target tile");
    expect(tryMove(field, player, target, [{ x: 3, y: 3 }])).toEqual(player);
    expect(canMoveTo(field, player, target, [{ x: 3, y: 2 }])).toBe(false);
  });
});
