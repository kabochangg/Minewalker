import type { ItemId } from "./items";

export interface DropEntry {
  readonly itemId: ItemId;
  readonly weight: number;
  readonly min: number;
  readonly max: number;
}

export type MonsterId =
  | "monster.slime"
  | "monster.bat"
  | "monster.rockGolem"
  | "monster.flameSlime"
  | "monster.ancientGuardian"
  | "monster.mineKing";

export interface MonsterDefinition {
  readonly id: MonsterId;
  readonly name: string;
  readonly hp: number;
  readonly attack: number;
  readonly defense: number;
  readonly exp: number;
  readonly boss: boolean;
  readonly drops: readonly DropEntry[];
}

export const MONSTERS: readonly MonsterDefinition[] = [
  {
    id: "monster.slime",
    name: "スライム",
    hp: 18,
    attack: 6,
    defense: 1,
    exp: 6,
    boss: false,
    drops: [
      { itemId: "item.slimeCore", weight: 5, min: 1, max: 2 },
      { itemId: "item.copperOre", weight: 2, min: 1, max: 1 },
    ],
  },
  {
    id: "monster.bat",
    name: "コウモリ",
    hp: 24,
    attack: 8,
    defense: 2,
    exp: 10,
    boss: false,
    drops: [
      { itemId: "item.batWing", weight: 5, min: 1, max: 2 },
      { itemId: "item.blueCrystal", weight: 2, min: 1, max: 1 },
    ],
  },
  {
    id: "monster.rockGolem",
    name: "岩ゴーレム",
    hp: 42,
    attack: 12,
    defense: 5,
    exp: 22,
    boss: false,
    drops: [
      { itemId: "item.golemShard", weight: 4, min: 1, max: 2 },
      { itemId: "item.obsidian", weight: 2, min: 1, max: 1 },
    ],
  },
  {
    id: "monster.flameSlime",
    name: "火炎スライム",
    hp: 36,
    attack: 14,
    defense: 3,
    exp: 20,
    boss: false,
    drops: [
      { itemId: "item.flameGel", weight: 4, min: 1, max: 2 },
      { itemId: "item.redCrystal", weight: 2, min: 1, max: 1 },
    ],
  },
  {
    id: "monster.ancientGuardian",
    name: "古代守護兵",
    hp: 68,
    attack: 18,
    defense: 7,
    exp: 42,
    boss: false,
    drops: [
      { itemId: "item.guardianGear", weight: 4, min: 1, max: 2 },
      { itemId: "item.ancientCrystal", weight: 2, min: 1, max: 1 },
    ],
  },
  {
    id: "monster.mineKing",
    name: "地下王マインロード",
    hp: 110,
    attack: 24,
    defense: 9,
    exp: 120,
    boss: true,
    drops: [
      { itemId: "item.bossRelic", weight: 5, min: 1, max: 1 },
      { itemId: "item.guardianGear", weight: 2, min: 2, max: 4 },
    ],
  },
];

export function getMonster(id: MonsterId): MonsterDefinition {
  const monster = MONSTERS.find((candidate) => candidate.id === id);
  if (!monster) {
    throw new Error(`Unknown monster id: ${id}`);
  }
  return monster;
}
