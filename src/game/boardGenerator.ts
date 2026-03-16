import { GOAL_STATE, TILE_KIND, type Tile } from './types';

export interface BoardGenerationConfig {
  width: number;
  height: number;
  mineCount: number;
}

export interface GeneratedBoard {
  grid: Tile[][];
  start: { x: number; y: number };
  goal: { x: number; y: number };
  safeZoneSize: number;
}

const SAFE_ZONE_AREA_MIN = 66;
const SAFE_ZONE_AREA_MAX = 96;
const SAFE_ZONE_AREA_TARGET = 81;
const BOARD_GENERATION_RETRY_LIMIT = 50;

const GOAL_FORBIDDEN_DX_MIN = -9;
const GOAL_FORBIDDEN_DX_MAX = 8;
const GOAL_FORBIDDEN_DY_MIN = -9;
const GOAL_FORBIDDEN_DY_MAX = 8;

export function generateBoard(config: BoardGenerationConfig): GeneratedBoard {
  for (let attempt = 0; attempt < BOARD_GENERATION_RETRY_LIMIT; attempt += 1) {
    const generated = tryGenerateBoard(config);
    if (generated !== null) {
      return generated;
    }
  }

  throw new Error('Failed to generate a valid board within retry limit');
}

function tryGenerateBoard(config: BoardGenerationConfig): GeneratedBoard | null {
  const { width, height, mineCount } = config;
  const start = { x: randomInt(0, width - 1), y: randomInt(0, height - 1) };

  const safeZone = generateConnectedSafeZone(width, height, start);
  if (!isSafeZoneAreaValid(safeZone.size)) return null;
  if (isRectangleFillShape(safeZone, width)) return null;

  const goalCandidates = collectGoalCandidates(width, height, safeZone, start);
  if (goalCandidates.length === 0) return null;
  const goal = goalCandidates[randomInt(0, goalCandidates.length - 1)];

  const mineCandidates = collectMineCandidates(width, height, safeZone, goal);
  if (mineCandidates.length < mineCount) return null;

  const selectedMineKeys = pickUniqueCells(mineCandidates, mineCount);

  const grid: Tile[][] = createEmptyGrid(width, height);

  for (const key of safeZone) {
    const { x, y } = parseKey(key, width);
    const tile = grid[y][x];
    tile.isOpen = true;
    tile.tileKind = TILE_KIND.FLOOR;
  }

  grid[start.y][start.x].tileKind = TILE_KIND.START;

  const goalTile = grid[goal.y][goal.x];
  goalTile.goalState = GOAL_STATE.HIDDEN;
  goalTile.hasMine = false;

  for (const key of selectedMineKeys) {
    const { x, y } = parseKey(key, width);
    grid[y][x].hasMine = true;
  }

  computeAdjacentMineCounts(grid, width, height);

  return {
    grid,
    start,
    goal,
    safeZoneSize: safeZone.size
  };
}

function createEmptyGrid(width: number, height: number): Tile[][] {
  const grid: Tile[][] = [];
  for (let y = 0; y < height; y += 1) {
    grid[y] = [];
    for (let x = 0; x < width; x += 1) {
      grid[y][x] = {
        tileKind: TILE_KIND.WALL,
        isOpen: false,
        hasMine: false,
        adjacentMineCount: 0,
        goalState: GOAL_STATE.NONE,
        flagged: false
      };
    }
  }
  return grid;
}

function generateConnectedSafeZone(width: number, height: number, start: { x: number; y: number }): Set<number> {
  const safeZone = new Set<number>([toKey(start.x, start.y, width)]);
  const frontier = [start];
  const targetArea = randomInt(SAFE_ZONE_AREA_MIN, SAFE_ZONE_AREA_MAX);

  while (safeZone.size < targetArea) {
    const pivot = frontier[randomInt(0, frontier.length - 1)];
    const next = randomCardinalNeighbor(pivot);
    if (!isInBounds(next.x, next.y, width, height)) continue;

    const key = toKey(next.x, next.y, width);
    if (safeZone.has(key)) continue;

    safeZone.add(key);
    frontier.push(next);
  }

  if (safeZone.size < SAFE_ZONE_AREA_TARGET) {
    // keep shape irregular while nudging toward target range
    const extraSteps = SAFE_ZONE_AREA_TARGET - safeZone.size;
    for (let i = 0; i < extraSteps && safeZone.size < SAFE_ZONE_AREA_MAX; i += 1) {
      const pivot = frontier[randomInt(0, frontier.length - 1)];
      const next = randomCardinalNeighbor(pivot);
      if (!isInBounds(next.x, next.y, width, height)) continue;
      const key = toKey(next.x, next.y, width);
      if (safeZone.has(key)) continue;
      safeZone.add(key);
      frontier.push(next);
    }
  }

  return safeZone;
}

function collectGoalCandidates(
  width: number,
  height: number,
  safeZone: Set<number>,
  start: { x: number; y: number }
): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const key = toKey(x, y, width);
      if (safeZone.has(key)) continue;
      if (isInGoalForbiddenArea(x, y, start.x, start.y)) continue;
      out.push({ x, y });
    }
  }
  return out;
}

function collectMineCandidates(
  width: number,
  height: number,
  safeZone: Set<number>,
  goal: { x: number; y: number }
): number[] {
  const goalKey = toKey(goal.x, goal.y, width);
  const out: number[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const key = toKey(x, y, width);
      if (key === goalKey) continue;
      if (safeZone.has(key)) continue;
      out.push(key);
    }
  }
  return out;
}

function computeAdjacentMineCounts(grid: Tile[][], width: number, height: number): void {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let count = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (!isInBounds(nx, ny, width, height)) continue;
          if (grid[ny][nx].hasMine) count += 1;
        }
      }
      grid[y][x].adjacentMineCount = count;
    }
  }
}

export function validateGeneratedBoard(board: GeneratedBoard, config: BoardGenerationConfig): boolean {
  const { width, height, mineCount } = config;
  const { grid, start, goal, safeZoneSize } = board;

  if (!isSafeZoneAreaValid(safeZoneSize)) return false;

  const openCells = collectOpenCells(grid, width, height);
  if (openCells.size !== safeZoneSize) return false;
  if (!openCells.has(toKey(start.x, start.y, width))) return false;
  if (!isConnected(openCells, width, height)) return false;
  if (isRectangleFillShape(openCells, width)) return false;

  const startTile = grid[start.y][start.x];
  if (!startTile.isOpen || startTile.hasMine || startTile.tileKind !== TILE_KIND.START) return false;

  const mineTotal = grid.flat().filter((tile) => tile.hasMine).length;
  if (mineTotal !== mineCount) return false;

  const goalKey = toKey(goal.x, goal.y, width);
  const goalTile = grid[goal.y][goal.x];
  if (openCells.has(goalKey)) return false;
  if (goalTile.hasMine || goalTile.goalState !== GOAL_STATE.HIDDEN) return false;
  if (isInGoalForbiddenArea(goal.x, goal.y, start.x, start.y)) return false;

  for (const key of openCells) {
    const { x, y } = parseKey(key, width);
    const tile = grid[y][x];
    if (tile.hasMine) return false;
    if (tile.tileKind !== TILE_KIND.FLOOR && tile.tileKind !== TILE_KIND.START) return false;
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const tile = grid[y][x];
      if (tile.hasMine && tile.isOpen) return false;
      if (tile.hasMine && tile.goalState !== GOAL_STATE.NONE) return false;
    }
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let expected = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (!isInBounds(nx, ny, width, height)) continue;
          if (grid[ny][nx].hasMine) expected += 1;
        }
      }
      if (grid[y][x].adjacentMineCount !== expected) return false;
    }
  }

  return true;
}

function isSafeZoneAreaValid(size: number): boolean {
  return size >= SAFE_ZONE_AREA_MIN && size <= SAFE_ZONE_AREA_MAX;
}

function isRectangleFillShape(cells: Set<number>, width: number): boolean {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const key of cells) {
    const { x, y } = parseKey(key, width);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  const boundingArea = (maxX - minX + 1) * (maxY - minY + 1);
  return boundingArea === cells.size;
}

function isInGoalForbiddenArea(x: number, y: number, sx: number, sy: number): boolean {
  const dx = x - sx;
  const dy = y - sy;
  return dx >= GOAL_FORBIDDEN_DX_MIN && dx <= GOAL_FORBIDDEN_DX_MAX && dy >= GOAL_FORBIDDEN_DY_MIN && dy <= GOAL_FORBIDDEN_DY_MAX;
}

function collectOpenCells(grid: Tile[][], width: number, height: number): Set<number> {
  const out = new Set<number>();
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (grid[y][x].isOpen) out.add(toKey(x, y, width));
    }
  }
  return out;
}

function isConnected(cells: Set<number>, width: number, height: number): boolean {
  const first = cells.values().next().value;
  if (first === undefined) return false;

  const queue = [first as number];
  const visited = new Set<number>();

  while (queue.length > 0) {
    const key = queue.shift()!;
    if (visited.has(key)) continue;
    visited.add(key);

    const { x, y } = parseKey(key, width);
    const around = [
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 }
    ];

    for (const n of around) {
      if (!isInBounds(n.x, n.y, width, height)) continue;
      const nKey = toKey(n.x, n.y, width);
      if (cells.has(nKey) && !visited.has(nKey)) {
        queue.push(nKey);
      }
    }
  }

  return visited.size === cells.size;
}

function randomCardinalNeighbor(origin: { x: number; y: number }): { x: number; y: number } {
  const direction = randomInt(0, 3);
  if (direction === 0) return { x: origin.x + 1, y: origin.y };
  if (direction === 1) return { x: origin.x - 1, y: origin.y };
  if (direction === 2) return { x: origin.x, y: origin.y + 1 };
  return { x: origin.x, y: origin.y - 1 };
}

function pickUniqueCells(candidates: number[], pickCount: number): Set<number> {
  const pool = [...candidates];
  const picked = new Set<number>();
  for (let i = 0; i < pickCount; i += 1) {
    const index = randomInt(0, pool.length - 1);
    const [value] = pool.splice(index, 1);
    picked.add(value);
  }
  return picked;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isInBounds(x: number, y: number, width: number, height: number): boolean {
  return x >= 0 && x < width && y >= 0 && y < height;
}

function toKey(x: number, y: number, width: number): number {
  return y * width + x;
}

function parseKey(key: number, width: number): { x: number; y: number } {
  return { x: key % width, y: Math.floor(key / width) };
}
