import type { ItemId } from "../../data/items";
import type { MonsterId } from "../../data/monsters";

export type TileState =
  | "hiddenWall"
  | "revealedFloor"
  | "mineWall"
  | "cooledMine"
  | "disabledMine"
  | "item"
  | "monster"
  | "exit"
  | "blocked";

export type TileMark = "none" | "flag";

export interface Tile {
  readonly x: number;
  readonly y: number;
  readonly state: TileState;
  readonly mark: TileMark;
  readonly hasMine: boolean;
  readonly adjacentMineCount: number;
  readonly mineId?: string;
  readonly itemId?: ItemId;
  readonly monsterId?: MonsterId;
  readonly breakCost: number;
  readonly durability: number;
  readonly isWalkable: boolean;
  readonly isRevealed: boolean;
}

export interface Minefield {
  readonly width: number;
  readonly height: number;
  readonly tiles: readonly Tile[];
  readonly seed: string;
  readonly startX: number;
  readonly startY: number;
}

export interface MinefieldConfig {
  readonly width: number;
  readonly height: number;
  readonly mineCount: number;
  readonly safeRadius: number;
  readonly seed: string;
  readonly startX: number;
  readonly startY: number;
}

export function tileKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function getTile(field: Minefield, x: number, y: number): Tile | undefined {
  if (x < 0 || y < 0 || x >= field.width || y >= field.height) {
    return undefined;
  }
  return field.tiles[y * field.width + x];
}

export function replaceTile(field: Minefield, nextTile: Tile): Minefield {
  return {
    ...field,
    tiles: field.tiles.map((tile) =>
      tile.x === nextTile.x && tile.y === nextTile.y ? nextTile : tile
    )
  };
}
