import type { ExplorationState } from "../state/ExplorationState";
import type { DomainEvent } from "../state/ExplorationState";
import type { FullRebuildReason, HudField, RenderPatch } from "./RenderPatch";
import { toTileKey } from "./RenderPatch";

/** 描画差分生成時の追加情報。 */
export interface RenderPatchBuildOptions {
  readonly revision: number;
  readonly events?: readonly DomainEvent[];
  readonly fullRebuild?: FullRebuildReason;
  readonly inputReceiptId?: string;
}

/** 前後の探索状態から表示に必要な差分だけを生成する。 */
export function buildRenderPatch(
  previous: ExplorationState | undefined,
  next: ExplorationState,
  options: RenderPatchBuildOptions,
): RenderPatch {
  const fullRebuild = previous === undefined ? "initial" : options.fullRebuild;
  const changedTiles =
    previous === undefined || fullRebuild
      ? next.dungeon.field.tiles.map((tile) => toTileKey(tile.x, tile.y))
      : findChangedTiles(previous, next);
  const changedHudFields =
    previous === undefined || fullRebuild
      ? ([
          "hp",
          "stamina",
          "inventory",
          "tool",
          "locomotion",
          "objective",
        ] satisfies readonly HudField[])
      : findChangedHudFields(previous, next);
  const changedMonsterIds =
    previous === undefined || fullRebuild
      ? next.monsters.map((monster) => monster.id)
      : next.monsters
          .filter((monster) => {
            const before = previous?.monsters.find(
              (candidate) => candidate.id === monster.id,
            );
            return JSON.stringify(before) !== JSON.stringify(monster);
          })
          .map((monster) => monster.id);
  const removedMonsterIds =
    previous?.monsters
      .filter(
        (monster) =>
          !next.monsters.some((candidate) => candidate.id === monster.id),
      )
      .map((monster) => monster.id) ?? [];
  const playerChanged = previous?.player !== next.player;

  return {
    revision: options.revision,
    ...(fullRebuild ? { fullRebuild } : {}),
    changedTiles,
    changedHudFields,
    playerChanged,
    cameraChanged: playerChanged,
    lightingChanged: playerChanged,
    changedMonsterIds,
    removedMonsterIds,
    events: options.events ?? [],
    ...(options.inputReceiptId
      ? { inputReceiptId: options.inputReceiptId }
      : {}),
  };
}

function findChangedTiles(
  previous: ExplorationState,
  next: ExplorationState,
): readonly `${number},${number}`[] {
  const before = new Map(
    previous.dungeon.field.tiles.map((tile) => [
      toTileKey(tile.x, tile.y),
      tile,
    ]),
  );
  return next.dungeon.field.tiles
    .filter(
      (tile) =>
        JSON.stringify(before.get(toTileKey(tile.x, tile.y))) !==
        JSON.stringify(tile),
    )
    .map((tile) => toTileKey(tile.x, tile.y));
}

function findChangedHudFields(
  previous: ExplorationState,
  next: ExplorationState,
): readonly HudField[] {
  const fields: HudField[] = [];
  if (previous.player.hp !== next.player.hp) fields.push("hp");
  if (previous.player.stamina !== next.player.stamina) fields.push("stamina");
  if (previous.inventory !== next.inventory) fields.push("inventory");
  if (previous.tools !== next.tools) fields.push("tool");
  if (previous.player.locomotion !== next.player.locomotion)
    fields.push("locomotion");
  if (
    previous.objectiveProgress !== next.objectiveProgress ||
    previous.checkpoints !== next.checkpoints
  )
    fields.push("objective");
  return fields;
}
