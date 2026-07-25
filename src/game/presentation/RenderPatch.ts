import type { DomainEvent } from "../state/ExplorationState";

/** タイルを一意に識別するキー。 */
export type TileKey = `${number},${number}`;

/** 全再描画を許可する限定理由。 */
export type FullRebuildReason =
  "initial" | "resume" | "theme" | "contextRestore";

/** 差分更新するHUD項目。 */
export type HudField =
  "hp" | "stamina" | "inventory" | "tool" | "locomotion" | "objective";

/** 1コマンド分の表示差分。 */
export interface RenderPatch {
  readonly revision: number;
  readonly fullRebuild?: FullRebuildReason;
  readonly changedTiles: readonly TileKey[];
  readonly changedHudFields: readonly HudField[];
  readonly playerChanged: boolean;
  readonly cameraChanged: boolean;
  readonly lightingChanged: boolean;
  readonly changedMonsterIds: readonly string[];
  readonly removedMonsterIds: readonly string[];
  readonly events: readonly DomainEvent[];
  readonly inputReceiptId?: string;
}

/** 空の差分を生成する。 */
export function createEmptyRenderPatch(revision: number): RenderPatch {
  return {
    revision,
    changedTiles: [],
    changedHudFields: [],
    playerChanged: false,
    cameraChanged: false,
    lightingChanged: false,
    changedMonsterIds: [],
    removedMonsterIds: [],
    events: [],
  };
}

/** 座標から安定したタイルキーを生成する。 */
export function toTileKey(x: number, y: number): TileKey {
  return `${x},${y}`;
}
