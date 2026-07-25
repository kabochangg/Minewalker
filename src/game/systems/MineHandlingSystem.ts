import type { Minefield, Tile } from "../map/types";
import { replaceTile } from "../map/types";
import type { InventoryState } from "./InventorySystem";
import { consumeCoolant, consumeDisabler } from "./InventorySystem";

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
    mark: tile.mark === "flag" ? "none" : "flag",
  });
}

export function coolMine(
  field: Minefield,
  inventory: InventoryState,
  tile: Tile,
): MineActionResult {
  if (tile.mark !== "flag") {
    return {
      field,
      inventory,
      message: "危険マークを付けてから処理してください",
      success: false,
    };
  }
  if (!tile.hasMine || tile.state === "disabledMine") {
    return {
      field,
      inventory,
      message: "ここに冷却できる地雷はありません",
      success: false,
    };
  }
  const nextInventory = consumeCoolant(inventory);
  if (!nextInventory) {
    return { field, inventory, message: "冷却剤が足りません", success: false };
  }
  return {
    field: rebuildActiveMineCounts(
      replaceTile(field, {
        ...tile,
        state: "cooledMine",
        mark: "none",
      }),
    ),
    inventory: nextInventory,
    message: "地雷を冷却しました",
    success: true,
  };
}

export function disableMine(
  field: Minefield,
  inventory: InventoryState,
  tile: Tile,
): MineActionResult {
  if (tile.mark !== "flag") {
    return {
      field,
      inventory,
      message: "危険マークを付けてから処理してください",
      success: false,
    };
  }
  if (!tile.hasMine) {
    return {
      field,
      inventory,
      message: "ここに解除できる地雷はありません",
      success: false,
    };
  }
  const nextInventory = consumeDisabler(inventory);
  if (!nextInventory) {
    return {
      field,
      inventory,
      message: "解除装置が足りません",
      success: false,
    };
  }
  return {
    field: rebuildActiveMineCounts(
      replaceTile(field, {
        ...tile,
        state: "disabledMine",
        mark: "none",
      }),
    ),
    inventory: nextInventory,
    message: "地雷を解除しました",
    success: true,
  };
}

/** 未処理地雷だけを対象に周囲8マスの数字を再計算する。 */
export function rebuildActiveMineCounts(field: Minefield): Minefield {
  const active = new Set(
    field.tiles
      .filter(
        (tile) =>
          tile.hasMine &&
          tile.state !== "cooledMine" &&
          tile.state !== "disabledMine" &&
          tile.state !== "revealedFloor",
      )
      .map((tile) => `${tile.x},${tile.y}`),
  );
  return {
    ...field,
    tiles: field.tiles.map((tile) => {
      let count = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (
            (dx !== 0 || dy !== 0) &&
            active.has(`${tile.x + dx},${tile.y + dy}`)
          ) {
            count += 1;
          }
        }
      }
      return { ...tile, adjacentMineCount: count, adjacentHazardCount: count };
    }),
  };
}
