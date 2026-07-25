import type { PlayerState } from "../entities/player";
import { movePlayer } from "../entities/player";
import type { Tile } from "../map/types";
import type { Minefield } from "../map/types";
import { getTile } from "../map/types";
import { isAdjacent } from "./MinefieldSystem";

export type MoveDirection =
  | "up"
  | "upRight"
  | "right"
  | "downRight"
  | "down"
  | "downLeft"
  | "left"
  | "upLeft";

export interface GridPosition {
  readonly x: number;
  readonly y: number;
}

export interface ContinuousPosition {
  readonly x: number;
  readonly y: number;
}

export interface ContinuousMoveResult {
  readonly position: ContinuousPosition;
  readonly gridPosition: GridPosition;
  readonly moved: boolean;
}

export const MOVE_VECTORS: Readonly<Record<MoveDirection, GridPosition>> = {
  up: { x: 0, y: -1 },
  upRight: { x: 1, y: -1 },
  right: { x: 1, y: 0 },
  downRight: { x: 1, y: 1 },
  down: { x: 0, y: 1 },
  downLeft: { x: -1, y: 1 },
  left: { x: -1, y: 0 },
  upLeft: { x: -1, y: -1 },
};

export function directionFromAngle(angle: number): MoveDirection {
  const normalized = ((angle % 360) + 360) % 360;
  const directions: readonly MoveDirection[] = [
    "right",
    "downRight",
    "down",
    "downLeft",
    "left",
    "upLeft",
    "up",
    "upRight",
  ];
  return directions[Math.round(normalized / 45) % directions.length];
}

export function canMoveTo(
  field: Minefield,
  player: GridPosition,
  tile: Tile,
  occupied: readonly GridPosition[] = [],
): boolean {
  if (
    !tile.isWalkable ||
    !isAdjacent(player, tile) ||
    isOccupied(tile, occupied)
  ) {
    return false;
  }
  const dx = tile.x - player.x;
  const dy = tile.y - player.y;
  if (dx === 0 || dy === 0) {
    return true;
  }
  const horizontal = getTile(field, player.x + dx, player.y);
  const vertical = getTile(field, player.x, player.y + dy);
  return Boolean(
    horizontal?.isWalkable &&
    vertical?.isWalkable &&
    !isOccupied(horizontal, occupied) &&
    !isOccupied(vertical, occupied),
  );
}

export function tryMove(
  field: Minefield,
  player: PlayerState,
  tile: Tile,
  occupied: readonly GridPosition[] = [],
): PlayerState {
  if (!canMoveTo(field, player, tile, occupied)) {
    return player;
  }
  return movePlayer(player, tile.x, tile.y);
}

/**
 * Advances a player smoothly through walkable tiles while preserving a grid
 * position for all game rules. Collision is evaluated in small increments so
 * diagonal input can naturally slide along a wall instead of clipping through
 * a blocked corner.
 */
export function advanceContinuousMovement(
  field: Minefield,
  gridPosition: GridPosition,
  position: ContinuousPosition,
  direction: GridPosition,
  distance: number,
  occupied: readonly GridPosition[] = [],
): ContinuousMoveResult {
  if (distance <= 0) {
    return { position, gridPosition, moved: false };
  }
  const length = Math.hypot(direction.x, direction.y);
  if (length === 0) {
    return { position, gridPosition, moved: false };
  }

  const steps = Math.max(1, Math.ceil(distance / 0.1));
  const stepDistance = distance / steps;
  const stepX = (direction.x / length) * stepDistance;
  const stepY = (direction.y / length) * stepDistance;
  let nextPosition = position;
  let nextGridPosition = gridPosition;
  let moved = false;

  for (let index = 0; index < steps; index += 1) {
    const xMove = tryAdvanceAxis(
      field,
      nextGridPosition,
      nextPosition,
      stepX,
      0,
      occupied,
    );
    nextPosition = xMove.position;
    nextGridPosition = xMove.gridPosition;
    moved ||= xMove.moved;

    const yMove = tryAdvanceAxis(
      field,
      nextGridPosition,
      nextPosition,
      0,
      stepY,
      occupied,
    );
    nextPosition = yMove.position;
    nextGridPosition = yMove.gridPosition;
    moved ||= yMove.moved;
  }

  return { position: nextPosition, gridPosition: nextGridPosition, moved };
}

function tryAdvanceAxis(
  field: Minefield,
  gridPosition: GridPosition,
  position: ContinuousPosition,
  deltaX: number,
  deltaY: number,
  occupied: readonly GridPosition[],
): ContinuousMoveResult {
  if (deltaX === 0 && deltaY === 0) {
    return { position, gridPosition, moved: false };
  }
  const candidatePosition = { x: position.x + deltaX, y: position.y + deltaY };
  const candidateGridPosition = {
    x: Math.floor(candidatePosition.x),
    y: Math.floor(candidatePosition.y),
  };
  if (
    candidateGridPosition.x === gridPosition.x &&
    candidateGridPosition.y === gridPosition.y
  ) {
    return {
      position: candidatePosition,
      gridPosition,
      moved: true,
    };
  }
  const target = getTile(
    field,
    candidateGridPosition.x,
    candidateGridPosition.y,
  );
  if (!target || !canMoveTo(field, gridPosition, target, occupied)) {
    return { position, gridPosition, moved: false };
  }
  return {
    position: candidatePosition,
    gridPosition: candidateGridPosition,
    moved: true,
  };
}

function isOccupied(
  position: GridPosition,
  occupied: readonly GridPosition[],
): boolean {
  return occupied.some(
    (candidate) => candidate.x === position.x && candidate.y === position.y,
  );
}
