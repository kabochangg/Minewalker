import type { ItemId } from "./items";
import type { MonsterId } from "./monsters";

export type AreaId =
  | "area.beginnerMine"
  | "area.crystalCave"
  | "area.volcanoMine"
  | "area.ancientSite";

export interface AreaUnlockRequirement {
  readonly playerLevel: number;
  readonly baseLevel: number;
  readonly coins: number;
  readonly items: Readonly<Partial<Record<ItemId, number>>>;
}

export interface AreaDefinition {
  readonly id: AreaId;
  readonly name: string;
  readonly recommendedLevel: string;
  readonly staminaCost: number;
  readonly maxDepth: number;
  readonly mineDensity: number;
  readonly difficulty: number;
  readonly theme:
    "beginnerMine" | "crystalCave" | "volcanoMine" | "ancientSite";
  readonly monsterIds: readonly MonsterId[];
  readonly materialIds: readonly ItemId[];
  readonly unlockRequirement?: AreaUnlockRequirement;
}

export const AREAS: readonly AreaDefinition[] = [
  {
    id: "area.beginnerMine",
    name: "初心者鉱山",
    recommendedLevel: "1-3",
    staminaCost: 5,
    maxDepth: 10,
    mineDensity: 0.16,
    difficulty: 1,
    theme: "beginnerMine",
    monsterIds: ["monster.slime"],
    materialIds: [
      "item.stone",
      "item.coal",
      "item.ironOre",
      "item.copperOre",
      "item.slimeCore",
    ],
  },
  {
    id: "area.crystalCave",
    name: "水晶洞窟",
    recommendedLevel: "4-8",
    staminaCost: 10,
    maxDepth: 20,
    mineDensity: 0.2,
    difficulty: 2,
    theme: "crystalCave",
    monsterIds: ["monster.slime", "monster.bat"],
    materialIds: [
      "item.silverOre",
      "item.blueCrystal",
      "item.greenCrystal",
      "item.batWing",
    ],
    unlockRequirement: {
      playerLevel: 3,
      baseLevel: 2,
      coins: 80,
      items: { "item.ironOre": 8, "item.blueCrystal": 2 },
    },
  },
  {
    id: "area.volcanoMine",
    name: "火山鉱山",
    recommendedLevel: "9-14",
    staminaCost: 15,
    maxDepth: 30,
    mineDensity: 0.24,
    difficulty: 3,
    theme: "volcanoMine",
    monsterIds: ["monster.rockGolem", "monster.flameSlime"],
    materialIds: [
      "item.goldOre",
      "item.obsidian",
      "item.redCrystal",
      "item.golemShard",
      "item.flameGel",
    ],
    unlockRequirement: {
      playerLevel: 8,
      baseLevel: 3,
      coins: 240,
      items: {
        "item.silverOre": 8,
        "item.greenCrystal": 3,
        "item.minePart": 5,
      },
    },
  },
  {
    id: "area.ancientSite",
    name: "古代採掘場",
    recommendedLevel: "15-20",
    staminaCost: 20,
    maxDepth: 50,
    mineDensity: 0.28,
    difficulty: 4,
    theme: "ancientSite",
    monsterIds: ["monster.ancientGuardian", "monster.mineKing"],
    materialIds: [
      "item.ancientCrystal",
      "item.guardianGear",
      "item.bossRelic",
      "item.fuseCore",
    ],
    unlockRequirement: {
      playerLevel: 14,
      baseLevel: 4,
      coins: 600,
      items: { "item.goldOre": 10, "item.redCrystal": 5, "item.golemShard": 3 },
    },
  },
];

export function getArea(id: AreaId): AreaDefinition {
  const area = AREAS.find((candidate) => candidate.id === id);
  if (!area) {
    throw new Error(`Unknown area id: ${id}`);
  }
  return area;
}
