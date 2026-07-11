import { getEquipment, type EquipmentId } from "../../data/equipment";
import { RECIPES, type RecipeDefinition } from "../../data/recipes";
import type { SaveData } from "../../save/SaveSystem";
import { hasItems, removeItems } from "./InventorySystem";

export interface CraftResult {
  readonly crafted: boolean;
  readonly message: string;
  readonly state: SaveData;
}

export function craftRecipe(state: SaveData, recipe: RecipeDefinition): CraftResult {
  if (state.player.coins < recipe.cost.coins || !hasItems(state.inventory, recipe.cost.items)) {
    return { crafted: false, message: `${recipe.name}の素材が足りません`, state };
  }

  if (recipe.output.kind === "equipment" && state.equipment.owned.includes(recipe.output.equipmentId)) {
    return { crafted: false, message: `${getEquipment(recipe.output.equipmentId).name}は所持済みです`, state };
  }

  const inventory = removeItems(state.inventory, recipe.cost.items);
  if (!inventory) {
    return { crafted: false, message: `${recipe.name}の素材が足りません`, state };
  }

  const paidState: SaveData = {
    ...state,
    player: { ...state.player, coins: state.player.coins - recipe.cost.coins },
    inventory
  };

  if (recipe.output.kind === "equipment") {
    const equipmentId = recipe.output.equipmentId as EquipmentId;
    return {
      crafted: true,
      message: `${getEquipment(equipmentId).name}を作成しました`,
      state: {
        ...paidState,
        equipment: {
          ...paidState.equipment,
          owned: [...paidState.equipment.owned, equipmentId]
        },
        collection: {
          ...paidState.collection,
          equipment: Array.from(new Set([...paidState.collection.equipment, equipmentId]))
        }
      }
    };
  }

  const key = recipe.output.consumable;
  return {
    crafted: true,
    message: `${recipe.name}を作成しました`,
    state: {
      ...paidState,
      inventory: {
        ...paidState.inventory,
        [key]: paidState.inventory[key] + recipe.output.amount
      }
    }
  };
}

export function craftFirstAvailable(state: SaveData): CraftResult {
  const recipe = RECIPES.find(
    (candidate) => state.player.coins >= candidate.cost.coins && hasItems(state.inventory, candidate.cost.items)
  );
  if (!recipe) {
    return { crafted: false, message: "作成できるレシピがありません", state };
  }
  return craftRecipe(state, recipe);
}
