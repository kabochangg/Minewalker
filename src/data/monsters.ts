import type { ItemId } from "./items";

export interface DropEntry {
  readonly itemId: ItemId;
  readonly weight: number;
  readonly min: number;
  readonly max: number;
}

export type MonsterId = "monster.slime";

export interface MonsterDefinition {
  readonly id: MonsterId;
  readonly name: string;
  readonly hp: number;
  readonly attack: number;
  readonly defense: number;
  readonly drops: readonly DropEntry[];
}

export const MONSTERS: readonly MonsterDefinition[] = [
  {
    id: "monster.slime",
    name: "スライム",
    hp: 18,
    attack: 6,
    defense: 1,
    drops: [
      { itemId: "item.slimeCore", weight: 4, min: 1, max: 2 },
      { itemId: "item.copperOre", weight: 2, min: 1, max: 1 }
    ]
  }
];

export function getMonster(id: MonsterId): MonsterDefinition {
  const monster = MONSTERS.find((candidate) => candidate.id === id);
  if (!monster) {
    throw new Error(`Unknown monster id: ${id}`);
  }
  return monster;
}
