import { BALANCE } from "../../data/balance";
import type { ItemId } from "../../data/items";

export interface InventoryState {
  readonly capacity: number;
  readonly items: Readonly<Record<ItemId, number>>;
  readonly coolants: number;
  readonly disablers: number;
  readonly potions: number;
  readonly maps: number;
}

export interface AddItemResult {
  readonly inventory: InventoryState;
  readonly added: boolean;
}

export function createInitialInventory(): InventoryState {
  return {
    capacity: BALANCE.player.bagCapacity,
    items: {
      "item.ironOre": 0,
      "item.copperOre": 0,
      "item.blueCrystal": 0,
      "item.emeraldOre": 0,
      "item.minePart": 0,
      "item.slimeCore": 0
    },
    coolants: BALANCE.mining.initialCoolants,
    disablers: BALANCE.mining.initialDisablers,
    potions: BALANCE.mining.initialPotions,
    maps: 1
  };
}

export function getUsedCapacity(inventory: InventoryState): number {
  return Object.values(inventory.items).reduce((total, amount) => total + amount, 0);
}

export function addItem(
  inventory: InventoryState,
  itemId: ItemId,
  amount: number
): AddItemResult {
  if (amount <= 0) {
    return { inventory, added: false };
  }
  if (getUsedCapacity(inventory) + amount > inventory.capacity) {
    return { inventory, added: false };
  }
  return {
    added: true,
    inventory: {
      ...inventory,
      items: {
        ...inventory.items,
        [itemId]: inventory.items[itemId] + amount
      }
    }
  };
}

export function consumeCoolant(inventory: InventoryState): InventoryState | undefined {
  if (inventory.coolants <= 0) {
    return undefined;
  }
  return { ...inventory, coolants: inventory.coolants - 1 };
}

export function consumeDisabler(inventory: InventoryState): InventoryState | undefined {
  if (inventory.disablers <= 0) {
    return undefined;
  }
  return { ...inventory, disablers: inventory.disablers - 1 };
}
