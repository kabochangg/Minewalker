export type ItemRarity = "common" | "uncommon" | "rare" | "epic";

export interface ItemDefinition {
  readonly id: ItemId;
  readonly name: string;
  readonly rarity: ItemRarity;
  readonly category:
    "ore" | "crystal" | "monster" | "mine" | "ancient" | "consumable";
}

export const ITEM_DEFINITIONS = [
  { id: "item.stone", name: "石材", rarity: "common", category: "ore" },
  { id: "item.coal", name: "石炭", rarity: "common", category: "ore" },
  { id: "item.ironOre", name: "鉄鉱石", rarity: "common", category: "ore" },
  { id: "item.copperOre", name: "銅鉱石", rarity: "common", category: "ore" },
  { id: "item.silverOre", name: "銀鉱石", rarity: "uncommon", category: "ore" },
  { id: "item.goldOre", name: "金鉱石", rarity: "rare", category: "ore" },
  {
    id: "item.emeraldOre",
    name: "エメラルド鉱石",
    rarity: "rare",
    category: "ore",
  },
  { id: "item.obsidian", name: "黒曜石", rarity: "rare", category: "ore" },
  {
    id: "item.blueCrystal",
    name: "青水晶",
    rarity: "uncommon",
    category: "crystal",
  },
  {
    id: "item.redCrystal",
    name: "赤熱水晶",
    rarity: "rare",
    category: "crystal",
  },
  {
    id: "item.greenCrystal",
    name: "翠水晶",
    rarity: "rare",
    category: "crystal",
  },
  {
    id: "item.ancientCrystal",
    name: "古代水晶",
    rarity: "epic",
    category: "ancient",
  },
  {
    id: "item.minePart",
    name: "地雷部品",
    rarity: "uncommon",
    category: "mine",
  },
  {
    id: "item.coolantGel",
    name: "冷却ジェル",
    rarity: "uncommon",
    category: "mine",
  },
  { id: "item.fuseCore", name: "信管コア", rarity: "rare", category: "mine" },
  {
    id: "item.slimeCore",
    name: "スライム核",
    rarity: "common",
    category: "monster",
  },
  {
    id: "item.batWing",
    name: "コウモリの羽",
    rarity: "uncommon",
    category: "monster",
  },
  {
    id: "item.golemShard",
    name: "ゴーレム片",
    rarity: "rare",
    category: "monster",
  },
  {
    id: "item.flameGel",
    name: "火炎ジェル",
    rarity: "rare",
    category: "monster",
  },
  {
    id: "item.guardianGear",
    name: "守護兵の歯車",
    rarity: "epic",
    category: "ancient",
  },
  {
    id: "item.bossRelic",
    name: "地下王の遺物",
    rarity: "epic",
    category: "ancient",
  },
  {
    id: "item.herb",
    name: "地下薬草",
    rarity: "common",
    category: "consumable",
  },
] as const;

export type ItemId = (typeof ITEM_DEFINITIONS)[number]["id"];

export const ITEMS: readonly ItemDefinition[] = ITEM_DEFINITIONS;
export const ALL_ITEM_IDS: readonly ItemId[] = ITEM_DEFINITIONS.map(
  (item) => item.id,
);

export function getItemName(itemId: ItemId): string {
  return ITEMS.find((item) => item.id === itemId)?.name ?? itemId;
}

export function isItemId(input: string): input is ItemId {
  return ALL_ITEM_IDS.includes(input as ItemId);
}
