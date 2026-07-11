import { createRandom } from "../../utils/random";
import type { Minefield, MinefieldConfig, Tile } from "../map/types";
import { getTile, tileKey } from "../map/types";

const DIRECTIONS: readonly Readonly<[number, number]>[] = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1]
];

export function generateMinefield(config: MinefieldConfig): Minefield {
  validateConfig(config);
  const safeTiles = buildSafeTiles(config);
  const candidates = buildMineCandidates(config, safeTiles);
  if (config.mineCount > candidates.length) {
    throw new Error("mineCount exceeds available tiles after applying safeRadius");
  }

  const rng = createRandom(config.seed);
  const mines = new Set<string>();
  const mutableCandidates = [...candidates];

  while (mines.size < config.mineCount) {
    const index = rng.int(0, mutableCandidates.length - 1);
    const [candidate] = mutableCandidates.splice(index, 1);
    mines.add(candidate);
  }

  const tiles: Tile[] = [];
  for (let y = 0; y < config.height; y += 1) {
    for (let x = 0; x < config.width; x += 1) {
      const key = tileKey(x, y);
      const hasMine = mines.has(key);
      const isStart = x === config.startX && y === config.startY;
      const isRevealed = safeTiles.has(key);
      tiles.push({
        x,
        y,
        state: isRevealed ? "revealedFloor" : hasMine ? "mineWall" : "hiddenWall",
        mark: "none",
        hasMine,
        adjacentMineCount: countAdjacentMines(x, y, config.width, config.height, mines),
        mineId: hasMine ? "mine.normal" : undefined,
        breakCost: 1,
        durability: isStart || isRevealed ? 0 : 1,
        isWalkable: isRevealed,
        isRevealed
      });
    }
  }

  const field = {
    width: config.width,
    height: config.height,
    tiles,
    seed: config.seed,
    startX: config.startX,
    startY: config.startY
  };
  validateMinefield(field);
  return field;
}

export function neighbors(field: Minefield, x: number, y: number): readonly Tile[] {
  return DIRECTIONS.map(([dx, dy]) => getTile(field, x + dx, y + dy)).filter(
    (tile): tile is Tile => tile !== undefined
  );
}

export function isAdjacent(a: { readonly x: number; readonly y: number }, b: Tile): boolean {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

export function validateMinefield(field: Minefield): void {
  for (const tile of field.tiles) {
    const actual = neighbors(field, tile.x, tile.y).filter((neighbor) => neighbor.hasMine).length;
    if (actual !== tile.adjacentMineCount) {
      throw new Error(`Invalid adjacent mine count at ${tile.x},${tile.y}`);
    }
  }
}

function validateConfig(config: MinefieldConfig): void {
  if (config.width <= 0 || config.height <= 0) {
    throw new Error("Minefield width and height must be positive");
  }
  if (config.startX < 0 || config.startY < 0 || config.startX >= config.width || config.startY >= config.height) {
    throw new Error("Minefield start position must be inside the board");
  }
  if (config.mineCount < 0) {
    throw new Error("mineCount must be non-negative");
  }
}

function buildSafeTiles(config: MinefieldConfig): Set<string> {
  const safeTiles = new Set<string>();
  for (let y = config.startY - config.safeRadius; y <= config.startY + config.safeRadius; y += 1) {
    for (let x = config.startX - config.safeRadius; x <= config.startX + config.safeRadius; x += 1) {
      if (x >= 0 && y >= 0 && x < config.width && y < config.height) {
        safeTiles.add(tileKey(x, y));
      }
    }
  }
  return safeTiles;
}

function buildMineCandidates(config: MinefieldConfig, safeTiles: Set<string>): string[] {
  const candidates: string[] = [];
  for (let y = 0; y < config.height; y += 1) {
    for (let x = 0; x < config.width; x += 1) {
      const key = tileKey(x, y);
      if (!safeTiles.has(key)) {
        candidates.push(key);
      }
    }
  }
  return candidates;
}

function countAdjacentMines(
  x: number,
  y: number,
  width: number,
  height: number,
  mines: ReadonlySet<string>
): number {
  return DIRECTIONS.reduce((count, [dx, dy]) => {
    const nextX = x + dx;
    const nextY = y + dy;
    if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) {
      return count;
    }
    return count + (mines.has(tileKey(nextX, nextY)) ? 1 : 0);
  }, 0);
}
