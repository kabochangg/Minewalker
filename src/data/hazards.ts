import type { DropEntry } from "./monsters";
import type {
  HazardStatusEffect,
  HazardType,
} from "../game/components/hazardComponents";

/** 危険物の固定定義を表す。 */
export interface HazardDefinition {
  readonly type: HazardType;
  readonly label: string;
  readonly damage: number;
  readonly requiredToolTier: number;
  readonly statusEffect?: HazardStatusEffect;
  readonly rewards: readonly DropEntry[];
}

/** 危険物ごとの効果と高価値報酬。 */
export const HAZARD_DEFINITIONS: Readonly<
  Record<HazardType, HazardDefinition>
> = {
  explosive: {
    type: "explosive",
    label: "爆発物",
    damage: 25,
    requiredToolTier: 1,
    rewards: [
      { itemId: "item.minePart", weight: 4, min: 1, max: 2 },
      { itemId: "item.fuseCore", weight: 2, min: 1, max: 1 },
    ],
  },
  poison: {
    type: "poison",
    label: "毒胞子",
    damage: 8,
    requiredToolTier: 1,
    statusEffect: { kind: "poison", durationActiveMs: 5_000, magnitude: 2 },
    rewards: [
      { itemId: "item.herb", weight: 4, min: 2, max: 3 },
      { itemId: "item.greenCrystal", weight: 1, min: 1, max: 1 },
    ],
  },
  gas: {
    type: "gas",
    label: "ガス溜まり",
    damage: 12,
    requiredToolTier: 2,
    statusEffect: { kind: "weakness", durationActiveMs: 4_000, magnitude: 2 },
    rewards: [
      { itemId: "item.coolantGel", weight: 3, min: 1, max: 2 },
      { itemId: "item.silverOre", weight: 1, min: 1, max: 1 },
    ],
  },
  rockfall: {
    type: "rockfall",
    label: "落石",
    damage: 20,
    requiredToolTier: 3,
    statusEffect: { kind: "slow", durationActiveMs: 3_000, magnitude: 1 },
    rewards: [
      { itemId: "item.obsidian", weight: 2, min: 1, max: 2 },
      { itemId: "item.goldOre", weight: 1, min: 1, max: 1 },
    ],
  },
};
