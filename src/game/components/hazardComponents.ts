import type { MonsterId } from "../../data/monsters";
import type { Coordinate } from "./explorationComponents";

/** 危険物の種類を表す。 */
export type HazardType = "explosive" | "poison" | "gas" | "rockfall";

/** 危険物のライフサイクル状態を表す。 */
export type HazardState = "armed" | "disposed" | "triggered";

/** 危険物が与える継続効果を表す。 */
export interface HazardStatusEffect {
  readonly kind: "poison" | "slow" | "weakness";
  readonly durationActiveMs: number;
  readonly magnitude: number;
}

/** 名前空間付き危険物IDを表す。 */
export type HazardId = `hazard.${string}`;

/** 盤面上の危険物を表す。 */
export interface HazardComponent {
  readonly id: HazardId;
  readonly position: Coordinate;
  readonly type: HazardType;
  readonly state: HazardState;
  readonly damage: number;
  readonly statusEffect?: HazardStatusEffect;
  readonly spawnedMonsterId?: MonsterId;
  readonly rewardTableId: string;
  readonly requiredToolTier: number;
}

/** 安定した危険物IDを生成する。 */
export function createHazardId(
  position: Coordinate,
  type: HazardType,
): HazardId {
  return `hazard.${position.x}.${position.y}.${type}`;
}
