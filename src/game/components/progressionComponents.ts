import type { AreaId } from "../../data/areas";
import type { EquipmentId } from "../../data/equipment";
import type { ItemId } from "../../data/items";
import type { Coordinate } from "./explorationComponents";

/** チェックポイントの進行状態を表す。 */
export type CheckpointStatus = "locked" | "eligible" | "claimed";

/** チェックポイントの達成条件を表す。 */
export type CheckpointObjective =
  | { readonly id: string; readonly kind: "reach"; readonly required: 1 }
  | {
      readonly id: string;
      readonly kind: "disposeHazards";
      readonly required: number;
    }
  | {
      readonly id: string;
      readonly kind: "collectMaterials";
      readonly itemId?: ItemId;
      readonly required: number;
    }
  | {
      readonly id: string;
      readonly kind: "defeatBoss";
      readonly monsterId: string;
      readonly required: 1;
    };

/** 盤面上のチェックポイントを表す。 */
export interface CheckpointComponent {
  readonly id: string;
  readonly position: Coordinate;
  readonly status: CheckpointStatus;
  readonly objectives: readonly CheckpointObjective[];
  readonly progress: Readonly<Record<string, number>>;
  readonly connectedTerritoryId?: string;
  readonly isFinal: boolean;
}

/** 永続化された自陣の接続成分を表す。 */
export interface TerritoryState {
  readonly id: string;
  readonly areaId: AreaId;
  readonly claimedCheckpointIds: readonly string[];
  readonly tileKeys: readonly string[];
  readonly legacyEntranceClaimed: boolean;
  readonly updatedAt: string;
}

/** 死亡地点へ残る回収可能な装備と素材を表す。 */
export interface DeathCache {
  readonly id: string;
  readonly areaId: AreaId;
  readonly dungeonSeed: string;
  readonly position: Coordinate;
  readonly equipment: readonly EquipmentId[];
  readonly items: Readonly<Partial<Record<ItemId, number>>>;
  readonly status: "active" | "recovered";
  readonly createdAt: string;
}
