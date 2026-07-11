import { describe, expect, it } from "vitest";
import { RECIPES } from "../data/recipes";
import { createSaveData } from "../save/SaveSystem";
import { craftRecipe } from "../game/systems/CraftingSystem";
import { addItem, createInitialInventory, getUsedCapacity } from "../game/systems/InventorySystem";
import { canUnlockArea } from "../game/systems/ProgressionSystem";
import { applyExplorationReward, getEquippedStats, resetGameStateForTests, tryUpgrade } from "../game/state/GameState";

describe("progression systems", () => {
  it("enforces bag capacity", () => {
    const inventory = { ...createInitialInventory(), capacity: 1 };
    const first = addItem(inventory, "item.ironOre", 1);
    const second = addItem(first.inventory, "item.copperOre", 1);

    expect(first.added).toBe(true);
    expect(second.added).toBe(false);
    expect(getUsedCapacity(first.inventory)).toBe(1);
  });

  it("crafts consumables from recipe costs", () => {
    const initial = createSaveData();
    const recipe = RECIPES.find((candidate) => candidate.id === "recipe.coolant.basic");
    if (!recipe) {
      throw new Error("Expected coolant recipe");
    }
    const state = {
      ...initial,
      player: { ...initial.player, coins: 100 },
      inventory: {
        ...initial.inventory,
        items: { ...initial.inventory.items, "item.coolantGel": 2, "item.coal": 2 }
      }
    };

    const result = craftRecipe(state, recipe);

    expect(result.crafted).toBe(true);
    expect(result.state.inventory.coolants).toBe(initial.inventory.coolants + 2);
  });

  it("upgrades base levels when costs are paid", () => {
    const initial = createSaveData();
    resetGameStateForTests({
      ...initial,
      player: { ...initial.player, coins: 100 },
      inventory: {
        ...initial.inventory,
        items: { ...initial.inventory.items, "item.stone": 8, "item.ironOre": 6 }
      }
    });

    const result = tryUpgrade("upgrade.base");

    expect(result.ok).toBe(true);
    expect(result.state.base.levels["upgrade.base"]).toBe(2);
  });

  it("unlocks areas when requirements are met", () => {
    const initial = createSaveData();
    const state = {
      ...initial,
      player: { ...initial.player, level: 3, coins: 100 },
      base: { levels: { ...initial.base.levels, "upgrade.base": 2 } },
      inventory: {
        ...initial.inventory,
        items: { ...initial.inventory.items, "item.ironOre": 8, "item.blueCrystal": 2 }
      }
    };

    expect(canUnlockArea(state, "area.crystalCave")).toBe(true);
  });

  it("applies equipment and boss rewards", () => {
    const initial = createSaveData();
    resetGameStateForTests(initial);
    const rewardInventory = {
      ...createInitialInventory(),
      items: { ...initial.inventory.items, "item.bossRelic": 1 },
      coolants: 1,
      disablers: 1,
      potions: 1,
      maps: 0
    };

    const state = applyExplorationReward({
      success: true,
      depth: 50,
      inventory: rewardInventory,
      defeatedMonsters: ["monster.mineKing"],
      bossDefeated: true
    });

    expect(getEquippedStats(state).attack).toBeGreaterThan(0);
    expect(state.statistics.bossDefeated).toBe(true);
    expect(state.collection.items).toContain("item.bossRelic");
  });
});
