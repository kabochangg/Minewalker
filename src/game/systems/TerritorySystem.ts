import type { AreaId } from "../../data/areas";
import type { TerritoryState } from "../components/progressionComponents";
import type { Minefield, Tile } from "../map/types";
import { getTile, tileKey } from "../map/types";

const DIRECTIONS = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
] as const;

/** 入口から移動規則と同じ角抜け制限で連結する安全マスを返す。 */
export function calculateConnectedTerritory(
  field: Minefield,
  anchors: readonly { readonly x: number; readonly y: number }[],
): readonly string[] {
  const visited = new Set<string>();
  const queue = anchors.filter((position) =>
    isSafe(getTile(field, position.x, position.y)),
  );
  for (const position of queue) visited.add(tileKey(position.x, position.y));
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    for (const [dx, dy] of DIRECTIONS) {
      const target = getTile(field, current.x + dx, current.y + dy);
      if (!isSafe(target) || visited.has(tileKey(target.x, target.y))) continue;
      if (dx !== 0 && dy !== 0) {
        const horizontal = getTile(field, current.x + dx, current.y);
        const vertical = getTile(field, current.x, current.y + dy);
        if (!isSafe(horizontal) || !isSafe(vertical)) continue;
      }
      visited.add(tileKey(target.x, target.y));
      queue.push(target);
    }
  }
  return Array.from(visited).sort();
}

/** チェックポイント確保結果を既存領域へ重複なく統合する。 */
export function expandTerritory(
  areaId: AreaId,
  checkpointId: string,
  tileKeys: readonly string[],
  previous: TerritoryState | undefined,
  updatedAt: string,
): TerritoryState {
  return {
    id: previous?.id ?? `territory.${areaId}`,
    areaId,
    claimedCheckpointIds: Array.from(
      new Set([...(previous?.claimedCheckpointIds ?? []), checkpointId]),
    ),
    tileKeys: Array.from(
      new Set([...(previous?.tileKeys ?? []), ...tileKeys]),
    ).sort(),
    legacyEntranceClaimed: previous?.legacyEntranceClaimed ?? false,
    updatedAt,
  };
}

function isSafe(tile: Tile | undefined): tile is Tile {
  return Boolean(tile?.isWalkable && tile.isRevealed && !tile.hasMine);
}
