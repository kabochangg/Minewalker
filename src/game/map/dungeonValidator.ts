import type { DungeonState } from "../state/ExplorationState";
import { getTile, tileKey } from "./types";

/** ダンジョンの安全性・ID・数字・到達性を検証する。 */
export function validateDungeon(dungeon: DungeonState): readonly string[] {
  const errors: string[] = [];
  const { config, field, hazards, checkpoints } = dungeon;
  if (field.tiles.length !== config.width * config.height)
    errors.push("タイル数が盤面サイズと一致しません");
  const hazardIds = new Set<string>();
  const armed = new Set<string>();
  for (const hazard of hazards) {
    if (hazardIds.has(hazard.id))
      errors.push(`危険物IDが重複しています: ${hazard.id}`);
    hazardIds.add(hazard.id);
    if (hazard.state === "armed")
      armed.add(tileKey(hazard.position.x, hazard.position.y));
    if (
      getTile(field, hazard.position.x, hazard.position.y)?.hazardId !==
      hazard.id
    ) {
      errors.push(`危険物とタイルが不一致です: ${hazard.id}`);
    }
  }
  for (const tile of field.tiles) {
    let count = 0;
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (
          (dx !== 0 || dy !== 0) &&
          armed.has(tileKey(tile.x + dx, tile.y + dy))
        )
          count += 1;
      }
    }
    if ((tile.adjacentHazardCount ?? tile.adjacentMineCount) !== count) {
      errors.push(`周囲数字が不一致です: ${tileKey(tile.x, tile.y)}`);
    }
    const withinSafeRadius =
      Math.max(
        Math.abs(tile.x - config.entrance.x),
        Math.abs(tile.y - config.entrance.y),
      ) <= config.safeRadius;
    if (withinSafeRadius && tile.hasMine)
      errors.push("開始安全域に危険物があります");
  }
  const checkpointIds = checkpoints.map((checkpoint) => checkpoint.id);
  if (new Set(checkpointIds).size !== checkpointIds.length)
    errors.push("checkpoint IDが重複しています");
  if (checkpoints.filter((checkpoint) => checkpoint.isFinal).length > 1)
    errors.push("最終checkpointが複数あります");
  const roomIds = new Set<string>();
  for (const room of dungeon.rooms) {
    if (roomIds.has(room.id)) errors.push(`部屋IDが重複しています: ${room.id}`);
    roomIds.add(room.id);
    if (
      room.x < 0 ||
      room.y < 0 ||
      room.width < 1 ||
      room.height < 1 ||
      room.x + room.width > config.width ||
      room.y + room.height > config.height
    ) {
      errors.push(`部屋が盤面外です: ${room.id}`);
    }
    if (!isStructurallyReachable(dungeon, { x: room.x, y: room.y })) {
      errors.push(`部屋が入口経路と接続していません: ${room.id}`);
    }
  }
  if (
    !checkpoints.every((checkpoint) =>
      isStructurallyReachable(dungeon, checkpoint.position),
    )
  ) {
    errors.push("checkpointへ到達可能な経路がありません");
  }
  return errors;
}

function isStructurallyReachable(
  dungeon: DungeonState,
  destination: { readonly x: number; readonly y: number },
): boolean {
  const queue = [dungeon.config.entrance];
  const visited = new Set([tileKey(queue[0].x, queue[0].y)]);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    if (current.x === destination.x && current.y === destination.y) return true;
    for (const [dx, dy] of [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ] as const) {
      const tile = getTile(dungeon.field, current.x + dx, current.y + dy);
      if (
        !tile ||
        tile.state === "blocked" ||
        visited.has(tileKey(tile.x, tile.y))
      )
        continue;
      visited.add(tileKey(tile.x, tile.y));
      queue.push(tile);
    }
  }
  return false;
}
