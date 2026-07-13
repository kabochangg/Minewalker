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

function isOccupied(
  position: GridPosition,
  occupied: readonly GridPosition[],
): boolean {
  return occupied.some(
    (candidate) => candidate.x === position.x && candidate.y === position.y,
  );
}
