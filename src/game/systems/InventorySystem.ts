import { BALANCE } from "../../data/balance";
import { ALL_ITEM_IDS, type ItemId } from "../../data/items";

export interface InventoryState {
  readonly capacity: number;
  readonly items: Readonly<Record<string, number>>;
  readonly coolants: number;
  readonly disablers: number;
  readonly potions: number;
  readonly maps: number;
}

export interface RunInventoryState extends InventoryState {
  readonly acquiredThisRun: Readonly<Partial<Record<ItemId, number>>>;
}

export interface AddItemResult {
  readonly inventory: InventoryState;
  readonly added: boolean;
}

export function createEmptyItemBag(
  seed?: Readonly<Partial<Record<ItemId, number>>>,
): Record<ItemId, number> {
  const bag = Object.fromEntries(
    ALL_ITEM_IDS.map((itemId) => [itemId, 0]),
  ) as Record<ItemId, number>;
  for (const itemId of ALL_ITEM_IDS) {
    bag[itemId] = seed?.[itemId] ?? 0;
  }
  return bag;
}

export function createInitialInventory(): InventoryState {
  return {
    capacity: BALANCE.player.bagCapacity,
    items: createEmptyItemBag(),
    coolants: BALANCE.mining.initialCoolants,
    disablers: BALANCE.mining.initialDisablers,
    potions: BALANCE.mining.initialPotions,
    maps: 1,
  };
}

export function normalizeInventory(inventory: InventoryState): InventoryState {
  return {
    ...inventory,
    items: createEmptyItemBag(inventory.items),
  };
}

export function getUsedCapacity(inventory: InventoryState): number {
  return ALL_ITEM_IDS.reduce(
    (total, itemId) => total + inventory.items[itemId],
    0,
  );
}

export function addItem(
  inventory: InventoryState,
  itemId: ItemId,
  amount: number,
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
        [itemId]: (inventory.items[itemId] ?? 0) + amount,
      },
    },
  };
}

/** 今回入手分を追跡しながら素材を追加する。 */
export function addRunItem(
  inventory: RunInventoryState,
  itemId: ItemId,
  amount: number,
): { readonly inventory: RunInventoryState; readonly added: boolean } {
  const result = addItem(inventory, itemId, amount);
  if (!result.added) return { inventory, added: false };
  return {
    added: true,
    inventory: {
      ...result.inventory,
      acquiredThisRun: {
        ...inventory.acquiredThisRun,
        [itemId]: (inventory.acquiredThisRun[itemId] ?? 0) + amount,
      },
    },
  };
}

export function addItems(
  inventory: InventoryState,
  items: Readonly<Partial<Record<ItemId, number>>>,
): AddItemResult {
  let next = inventory;
  for (const [itemId, amount] of Object.entries(items) as [ItemId, number][]) {
    const result = addItem(next, itemId, amount);
    if (!result.added) {
      return { inventory, added: false };
    }
    next = result.inventory;
  }
  return { inventory: next, added: true };
}

export function hasItems(
  inventory: InventoryState,
  required: Readonly<Partial<Record<ItemId, number>>>,
): boolean {
  return (Object.entries(required) as [ItemId, number][]).every(
    ([itemId, amount]) => (inventory.items[itemId] ?? 0) >= amount,
  );
}

export function removeItems(
  inventory: InventoryState,
  required: Readonly<Partial<Record<ItemId, number>>>,
): InventoryState | undefined {
  if (!hasItems(inventory, required)) {
    return undefined;
  }
  const nextItems = { ...inventory.items };
  for (const [itemId, amount] of Object.entries(required) as [
    ItemId,
    number,
  ][]) {
    nextItems[itemId] = (nextItems[itemId] ?? 0) - amount;
  }
  return { ...inventory, items: nextItems };
}

export function consumeCoolant(
  inventory: InventoryState,
): InventoryState | undefined {
  if (inventory.coolants <= 0) {
    return undefined;
  }
  return { ...inventory, coolants: inventory.coolants - 1 };
}

export function consumeDisabler(
  inventory: InventoryState,
): InventoryState | undefined {
  if (inventory.disablers <= 0) {
    return undefined;
  }
  return { ...inventory, disablers: inventory.disablers - 1 };
}

export function consumePotion(
  inventory: InventoryState,
): InventoryState | undefined {
  if (inventory.potions <= 0) {
    return undefined;
  }
  return { ...inventory, potions: inventory.potions - 1 };
}
