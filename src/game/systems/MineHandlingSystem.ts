import type { InventoryState } from "./InventorySystem";
import { consumeCoolant, consumeDisabler } from "./InventorySystem";
import type { Minefield, Tile } from "../map/types";
import { replaceTile } from "../map/types";

export interface MineActionResult {
  readonly field: Minefield;
  readonly inventory: InventoryState;
  readonly message: string;
  readonly success: boolean;
}

export function toggleFlag(field: Minefield, tile: Tile): Minefield {
  if (tile.isRevealed || tile.state === "revealedFloor") {
    return field;
  }
  return replaceTile(field, {
    ...tile,
    mark: tile.mark === "flag" ? "none" : "flag"
  });
}

export function coolMine(
  field: Minefield,
  inventory: InventoryState,
  tile: Tile
): MineActionResult {
  if (!tile.hasMine || tile.state === "disabledMine") {
    return { field, inventory, message: "ここに冷却する地雷はない", success: false };
  }
  const nextInventory = consumeCoolant(inventory);
  if (!nextInventory) {
    return { field, inventory, message: "冷却剤が足りない", success: false };
  }
  return {
    field: replaceTile(field, {
      ...tile,
      state: "cooledMine",
      mark: "none"
    }),
    inventory: nextInventory,
    message: "冷却して壊せるようになった",
    success: true
  };
}

export function disableMine(
  field: Minefield,
  inventory: InventoryState,
  tile: Tile
): MineActionResult {
  if (!tile.hasMine) {
    return { field, inventory, message: "ここに解除する地雷はない", success: false };
  }
  const nextInventory = consumeDisabler(inventory);
  if (!nextInventory) {
    return { field, inventory, message: "解除装置が足りない", success: false };
  }
  return {
    field: replaceTile(field, {
      ...tile,
      state: "disabledMine",
      mark: "none"
    }),
    inventory: nextInventory,
    message: "地雷を解除した",
    success: true
  };
}
