import type { AreaId } from "../../data/areas";
import type { MonsterId } from "../../data/monsters";
import type { DifficultyId } from "../../data/difficulties";
import type {
  DungeonRoom,
  ExplorationInventoryComponent,
  MonsterRuntimeComponent,
  PlayerRuntimeComponent,
} from "../components/explorationComponents";
import type { HazardComponent } from "../components/hazardComponents";
import type {
  CheckpointComponent,
  DeathCache,
} from "../components/progressionComponents";
import type { ToolConditionComponent } from "../components/toolComponents";
import type { Minefield } from "../map/types";

/** 自動生成に使用した設定を表す。 */
export interface DungeonGenerationConfig {
  readonly seed: string;
  readonly areaId: AreaId;
  readonly difficultyId: DifficultyId;
  readonly width: number;
  readonly height: number;
  readonly entrance: { readonly x: number; readonly y: number };
  readonly safeRadius: number;
  readonly checkpointCount: number;
  readonly generatorVersion: number;
}

/** 検証済みダンジョン集約を表す。 */
export interface DungeonState {
  readonly config: DungeonGenerationConfig;
  readonly field: Minefield;
  readonly hazards: readonly HazardComponent[];
  readonly rooms: readonly DungeonRoom[];
  readonly chestPositions: readonly {
    readonly x: number;
    readonly y: number;
  }[];
  readonly monsterSpawns: readonly {
    readonly id: MonsterId;
    readonly x: number;
    readonly y: number;
  }[];
  readonly checkpoints: readonly CheckpointComponent[];
  readonly generationAttempt: number;
}

/** 探索状態のライフサイクルを表す。 */
export type ExplorationStatus = "active" | "paused" | "cleared" | "failed";

/** 保存可能な探索状態を表す。 */
export interface ExplorationState {
  readonly version: 2;
  readonly status: ExplorationStatus;
  readonly areaId: AreaId;
  readonly difficultyId: DifficultyId;
  readonly dungeon: DungeonState;
  readonly player: PlayerRuntimeComponent;
  readonly inventory: ExplorationInventoryComponent;
  readonly tools: readonly ToolConditionComponent[];
  readonly monsters: readonly MonsterRuntimeComponent[];
  readonly checkpoints: readonly CheckpointComponent[];
  readonly objectiveProgress: Readonly<Record<string, number>>;
  readonly deathCaches: readonly DeathCache[];
  readonly elapsedActiveMs: number;
  readonly lastTransactionId?: string;
  readonly savedAt: string;
}

/** UI入力をドメイン操作へ正規化したコマンドを表す。 */
export type ExplorationCommand =
  | {
      readonly type: "move";
      readonly direction: { readonly x: number; readonly y: number };
      readonly elapsedMs: number;
      readonly locomotion: "walk" | "run";
    }
  | { readonly type: "mine"; readonly x: number; readonly y: number }
  | {
      readonly type: "toggleDangerMark";
      readonly x: number;
      readonly y: number;
    }
  | { readonly type: "disposeHazard"; readonly x: number; readonly y: number }
  | { readonly type: "attack"; readonly x: number; readonly y: number }
  | { readonly type: "claimCheckpoint"; readonly checkpointId: string }
  | { readonly type: "recoverDeathCache"; readonly cacheId: string }
  | { readonly type: "tick"; readonly elapsedActiveMs: number }
  | { readonly type: "pause" }
  | { readonly type: "resume" };

/** システムが発行し画面と保存処理が購読するイベントを表す。 */
export type DomainEvent =
  | { readonly type: "playerMoved" }
  | { readonly type: "wallMined"; readonly x: number; readonly y: number }
  | { readonly type: "hazardDisposed"; readonly hazardId: string }
  | { readonly type: "hazardTriggered"; readonly hazardId: string }
  | { readonly type: "checkpointClaimed"; readonly checkpointId: string }
  | { readonly type: "playerDied"; readonly cacheId: string }
  | { readonly type: "deathCacheRecovered"; readonly cacheId: string }
  | { readonly type: "feedback"; readonly message: string };

/** 1コマンドを処理した結果を表す。 */
export interface SystemResult {
  readonly state: ExplorationState;
  readonly events: readonly DomainEvent[];
  readonly accepted: boolean;
  readonly reason?: string;
  readonly requiresSave?: boolean;
}

/** 探索状態の値域と主な参照整合性を検証する。 */
export function validateExplorationState(
  state: ExplorationState,
): readonly string[] {
  const errors: string[] = [];
  const { dungeon, player, inventory } = state;
  if (state.version !== 2)
    errors.push("探索状態のversionは2である必要があります");
  if (
    dungeon.field.tiles.length !==
    dungeon.config.width * dungeon.config.height
  ) {
    errors.push("盤面サイズとタイル数が一致しません");
  }
  if (player.hp < 0 || player.hp > player.maxHp) errors.push("HPが範囲外です");
  if (player.stamina < 0 || player.stamina > player.maxStamina) {
    errors.push("スタミナが範囲外です");
  }
  if (inventory.capacity < 1) errors.push("バッグ容量が不正です");
  const itemCount = Object.values(inventory.items).reduce(
    (sum, amount) => sum + (amount ?? 0),
    0,
  );
  if (itemCount > inventory.capacity) errors.push("バッグ容量を超えています");
  const hazardIds = new Set<string>();
  for (const hazard of dungeon.hazards) {
    if (hazardIds.has(hazard.id))
      errors.push(`危険物IDが重複しています: ${hazard.id}`);
    hazardIds.add(hazard.id);
    const tile = dungeon.field.tiles.find(
      (candidate) =>
        candidate.x === hazard.position.x && candidate.y === hazard.position.y,
    );
    if (!tile || tile.hazardId !== hazard.id) {
      errors.push(`危険物とタイルが一致しません: ${hazard.id}`);
    }
  }
  if (!Number.isInteger(state.elapsedActiveMs) || state.elapsedActiveMs < 0) {
    errors.push("有効経過時間が不正です");
  }
  return errors;
}
