import type { AreaId } from "../../data/areas";
import type { EquipmentId } from "../../data/equipment";
import type { ItemId } from "../../data/items";
import type { MonsterId } from "../../data/monsters";

/** ダンジョン内の整数グリッド座標を表す。 */
export interface Coordinate {
  readonly x: number;
  readonly y: number;
}

/** 描画と衝突判定に使う連続座標を表す。 */
export interface ContinuousCoordinate {
  readonly x: number;
  readonly y: number;
}

/** プレイヤーの現在の行動を表す。 */
export type ExplorationActionState =
  | "idle"
  | "moving"
  | "mining"
  | "disposing"
  | "attacking"
  | "damaged"
  | "usingItem"
  | "dead";

/** 探索中の移動方式を表す。 */
export type LocomotionMode = "walk" | "run";

/** プレイヤーへ付与される状態効果を表す。 */
export interface StatusEffect {
  readonly id: string;
  readonly remainingActiveMs: number;
  readonly magnitude: number;
}

/** 探索中だけ変化するプレイヤー状態を表す。 */
export interface PlayerRuntimeComponent {
  readonly position: ContinuousCoordinate;
  readonly gridPosition: Coordinate;
  readonly hp: number;
  readonly maxHp: number;
  readonly stamina: number;
  readonly maxStamina: number;
  readonly actionState: ExplorationActionState;
  readonly locomotion: LocomotionMode;
  readonly statusEffects: readonly StatusEffect[];
  readonly equipment: Readonly<
    Record<"pickaxe" | "weapon" | "armor", EquipmentId>
  >;
}

/** 探索中の所持品と今回入手分を表す。 */
export interface ExplorationInventoryComponent {
  readonly capacity: number;
  readonly items: Readonly<Partial<Record<ItemId, number>>>;
  readonly acquiredThisRun: Readonly<Partial<Record<ItemId, number>>>;
  readonly consumables: Readonly<
    Record<"coolants" | "disablers" | "potions" | "maps", number>
  >;
}

/** 探索中モンスターの保存可能な状態を表す。 */
export interface MonsterRuntimeComponent {
  readonly id: MonsterId;
  readonly position: Coordinate;
  readonly hp: number;
  readonly maxHp: number;
  readonly defeated: boolean;
}

/** 自動生成された部屋の範囲を表す。 */
export interface DungeonRoom {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** エリアと生成結果の関係を示す最小識別情報を表す。 */
export interface DungeonIdentity {
  readonly areaId: AreaId;
  readonly seed: string;
}
