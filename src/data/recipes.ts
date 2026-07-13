import type { EquipmentId } from "./equipment";
import type { ItemId } from "./items";

export type RecipeId = (typeof RECIPE_DEFINITIONS)[number]["id"];

export interface RecipeDefinition {
  readonly id: string;
  readonly name: string;
  readonly output:
    | { readonly kind: "equipment"; readonly equipmentId: EquipmentId }
    | {
        readonly kind: "consumable";
        readonly consumable: "coolants" | "disablers" | "potions" | "maps";
        readonly amount: number;
      };
  readonly cost: {
    readonly coins: number;
    readonly items: Readonly<Partial<Record<ItemId, number>>>;
  };
}

export const RECIPE_DEFINITIONS = [
  {
    id: "recipe.coolant.basic",
    name: "冷却剤",
    output: { kind: "consumable", consumable: "coolants", amount: 2 },
    cost: { coins: 20, items: { "item.coolantGel": 1, "item.coal": 1 } },
  },
  {
    id: "recipe.disabler.basic",
    name: "解除装置",
    output: { kind: "consumable", consumable: "disablers", amount: 1 },
    cost: { coins: 35, items: { "item.minePart": 2, "item.copperOre": 1 } },
  },
  {
    id: "recipe.potion.small",
    name: "回復薬",
    output: { kind: "consumable", consumable: "potions", amount: 2 },
    cost: { coins: 25, items: { "item.herb": 2, "item.slimeCore": 1 } },
  },
  {
    id: "recipe.map.basic",
    name: "地図",
    output: { kind: "consumable", consumable: "maps", amount: 1 },
    cost: { coins: 40, items: { "item.coal": 2, "item.blueCrystal": 1 } },
  },
  {
    id: "recipe.pickaxe.copper",
    name: "銅のツルハシ",
    output: { kind: "equipment", equipmentId: "equipment.pickaxe.copper" },
    cost: { coins: 60, items: { "item.copperOre": 8, "item.stone": 4 } },
  },
  {
    id: "recipe.pickaxe.iron",
    name: "鉄のツルハシ",
    output: { kind: "equipment", equipmentId: "equipment.pickaxe.iron" },
    cost: { coins: 140, items: { "item.ironOre": 12, "item.coal": 4 } },
  },
  {
    id: "recipe.weapon.ironSword",
    name: "鉄の剣",
    output: { kind: "equipment", equipmentId: "equipment.weapon.ironSword" },
    cost: { coins: 90, items: { "item.ironOre": 8, "item.coal": 3 } },
  },
  {
    id: "recipe.armor.leather",
    name: "革の防具",
    output: { kind: "equipment", equipmentId: "equipment.armor.leather" },
    cost: { coins: 80, items: { "item.slimeCore": 4, "item.copperOre": 4 } },
  },
  {
    id: "recipe.weapon.flameHammer",
    name: "火炎槌",
    output: { kind: "equipment", equipmentId: "equipment.weapon.flameHammer" },
    cost: { coins: 480, items: { "item.redCrystal": 5, "item.flameGel": 4 } },
  },
  {
    id: "recipe.armor.guardian",
    name: "守護兵装甲",
    output: { kind: "equipment", equipmentId: "equipment.armor.guardian" },
    cost: {
      coins: 860,
      items: { "item.guardianGear": 4, "item.ancientCrystal": 3 },
    },
  },
] as const;

export const RECIPES: readonly RecipeDefinition[] = RECIPE_DEFINITIONS;
