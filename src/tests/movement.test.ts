import { describe, expect, it } from "vitest";
import { createInitialPlayer } from "../game/entities/player";
import { getTile, replaceTile } from "../game/map/types";
import { generateMinefield, isAdjacent } from "../game/systems/MinefieldSystem";
import {
  advanceContinuousMovement,
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

  it("moves smoothly while synchronizing the grid position after a boundary", () => {
    const field = createOpenField();
    const result = advanceContinuousMovement(
      field,
      { x: 2, y: 2 },
      { x: 2.5, y: 2.5 },
      MOVE_VECTORS.right,
      0.6,
    );
    expect(result.moved).toBe(true);
    expect(result.position.x).toBeCloseTo(3.1);
    expect(result.position.y).toBeCloseTo(2.5);
    expect(result.gridPosition).toEqual({ x: 3, y: 2 });
  });

  it("slides along a blocked wall instead of crossing into it", () => {
    const field = createOpenField();
    const blocked = getTile(field, 3, 2);
    if (!blocked) throw new Error("Expected blocked tile");
    const fieldWithWall = replaceTile(field, {
      ...blocked,
      isWalkable: false,
    });
    const result = advanceContinuousMovement(
      fieldWithWall,
      { x: 2, y: 2 },
      { x: 2.9, y: 2.5 },
      MOVE_VECTORS.downRight,
      0.8,
    );
    expect(result.gridPosition).toEqual({ x: 2, y: 3 });
    expect(result.position.x).toBeLessThan(3);
    expect(result.position.y).toBeGreaterThan(3);
  });
});
