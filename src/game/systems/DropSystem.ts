import type { DropEntry } from "../../data/monsters";
import { createRandom, type RandomSource } from "../../utils/random";

export interface DropResult {
  readonly itemId: DropEntry["itemId"];
  readonly amount: number;
}

export function rollWeightedDrop(
  entries: readonly DropEntry[],
  seed: string,
  multiplier = 1
): DropResult | undefined {
  return rollWeightedDropWithRandom(entries, createRandom(seed), multiplier);
}

export function rollWeightedDropWithRandom(
  entries: readonly DropEntry[],
  rng: RandomSource,
  multiplier = 1
): DropResult | undefined {
  if (entries.length === 0) {
    return undefined;
  }
  const totalWeight = entries.reduce((total, entry) => total + entry.weight * multiplier, 0);
  if (totalWeight <= 0) {
    return undefined;
  }
  let cursor = rng.next() * totalWeight;
  for (const entry of entries) {
    cursor -= entry.weight * multiplier;
    if (cursor <= 0) {
      return {
        itemId: entry.itemId,
        amount: rng.int(entry.min, entry.max)
      };
    }
  }
  const fallback = entries[entries.length - 1];
  return {
    itemId: fallback.itemId,
    amount: rng.int(fallback.min, fallback.max)
  };
}

export const WALL_DROPS: readonly DropEntry[] = [
  { itemId: "item.ironOre", weight: 6, min: 1, max: 2 },
  { itemId: "item.copperOre", weight: 3, min: 1, max: 1 },
  { itemId: "item.blueCrystal", weight: 1, min: 1, max: 1 }
];

export const MINE_DROPS: readonly DropEntry[] = [
  { itemId: "item.minePart", weight: 5, min: 1, max: 2 },
  { itemId: "item.emeraldOre", weight: 1, min: 1, max: 1 }
];
