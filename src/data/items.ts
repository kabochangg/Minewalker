export type ItemId =
  | "item.ironOre"
  | "item.copperOre"
  | "item.blueCrystal"
  | "item.emeraldOre"
  | "item.minePart"
  | "item.slimeCore";

export interface ItemDefinition {
  readonly id: ItemId;
  readonly name: string;
  readonly rarity: "common" | "uncommon" | "rare";
}

export const ITEMS: readonly ItemDefinition[] = [
  { id: "item.ironOre", name: "鉄鉱石", rarity: "common" },
  { id: "item.copperOre", name: "銅鉱石", rarity: "common" },
  { id: "item.blueCrystal", name: "青水晶", rarity: "uncommon" },
  { id: "item.emeraldOre", name: "エメラルド鉱石", rarity: "rare" },
  { id: "item.minePart", name: "地雷部品", rarity: "uncommon" },
  { id: "item.slimeCore", name: "スライム核", rarity: "common" }
];

export function getItemName(itemId: ItemId): string {
  return ITEMS.find((item) => item.id === itemId)?.name ?? itemId;
}
