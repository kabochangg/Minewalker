import type { ItemId } from "./items";

export type UpgradeId = "upgrade.base" | "upgrade.player" | "upgrade.weaponBench" | "upgrade.armorBench";

export interface UpgradeCost {
  readonly coins: number;
  readonly items: Readonly<Partial<Record<ItemId, number>>>;
}

export interface UpgradeDefinition {
  readonly id: UpgradeId;
  readonly name: string;
  readonly maxLevel: number;
  readonly costs: readonly UpgradeCost[];
}

export const UPGRADES: readonly UpgradeDefinition[] = [
  {
    id: "upgrade.base",
    name: "拠点",
    maxLevel: 5,
    costs: [
      { coins: 40, items: { "item.stone": 6, "item.ironOre": 4 } },
      { coins: 120, items: { "item.ironOre": 8, "item.blueCrystal": 2 } },
      { coins: 260, items: { "item.silverOre": 8, "item.greenCrystal": 3 } },
      { coins: 520, items: { "item.goldOre": 8, "item.redCrystal": 4 } }
    ]
  },
  {
    id: "upgrade.player",
    name: "プレイヤー",
    maxLevel: 10,
    costs: [
      { coins: 30, items: { "item.slimeCore": 2 } },
      { coins: 80, items: { "item.ironOre": 4, "item.herb": 2 } },
      { coins: 140, items: { "item.blueCrystal": 2, "item.batWing": 2 } },
      { coins: 220, items: { "item.silverOre": 5, "item.greenCrystal": 2 } },
      { coins: 320, items: { "item.golemShard": 2, "item.obsidian": 3 } },
      { coins: 460, items: { "item.redCrystal": 3, "item.flameGel": 2 } },
      { coins: 620, items: { "item.guardianGear": 2, "item.ancientCrystal": 1 } },
      { coins: 800, items: { "item.guardianGear": 3, "item.ancientCrystal": 2 } },
      { coins: 1000, items: { "item.bossRelic": 1 } }
    ]
  },
  {
    id: "upgrade.weaponBench",
    name: "武器工房",
    maxLevel: 5,
    costs: [
      { coins: 50, items: { "item.copperOre": 6 } },
      { coins: 150, items: { "item.ironOre": 10, "item.minePart": 3 } },
      { coins: 320, items: { "item.silverOre": 8, "item.fuseCore": 2 } },
      { coins: 700, items: { "item.guardianGear": 3, "item.ancientCrystal": 2 } }
    ]
  },
  {
    id: "upgrade.armorBench",
    name: "防具工房",
    maxLevel: 5,
    costs: [
      { coins: 50, items: { "item.slimeCore": 4, "item.copperOre": 3 } },
      { coins: 150, items: { "item.ironOre": 8, "item.batWing": 3 } },
      { coins: 320, items: { "item.obsidian": 5, "item.golemShard": 2 } },
      { coins: 700, items: { "item.guardianGear": 3, "item.ancientCrystal": 2 } }
    ]
  }
];

export function getUpgrade(id: UpgradeId): UpgradeDefinition {
  const upgrade = UPGRADES.find((candidate) => candidate.id === id);
  if (!upgrade) {
    throw new Error(`Unknown upgrade id: ${id}`);
  }
  return upgrade;
}
