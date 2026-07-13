import { BALANCE } from "../../data/balance";
import type { ItemId } from "../../data/items";
import { createRandom } from "../../utils/random";
import type { PlayerState } from "../entities/player";
import { damagePlayer } from "../entities/player";
import type { Minefield, Tile } from "../map/types";
import { replaceTile } from "../map/types";
import { addItem, type InventoryState } from "./InventorySystem";
import { isAdjacent } from "./MinefieldSystem";
import {
  MINE_DROPS,
  rollWeightedDropWithRandom,
  WALL_DROPS,
} from "./DropSystem";

export interface MiningResult {
  readonly field: Minefield;
  readonly player: PlayerState;
  readonly inventory: InventoryState;
  readonly message: string;
  readonly mined: boolean;
  readonly exploded: boolean;
  readonly gainedItemId?: ItemId;
  readonly gainedAmount?: number;
}

export function mineTile(
  field: Minefield,
  player: PlayerState,
  inventory: InventoryState,
  tile: Tile,
  seedSuffix: string,
): MiningResult {
  if (!isAdjacent(player, tile)) {
    return {
      field,
      player,
      inventory,
      message: "隣の壁だけ採掘できます",
      mined: false,
      exploded: false,
    };
  }
  if (tile.isWalkable || tile.state === "blocked") {
    return {
      field,
      player,
      inventory,
      message: "ここは採掘できません",
      mined: false,
      exploded: false,
    };
  }
  if (player.stamina < BALANCE.mining.staminaCost) {
    return {
      field,
      player,
      inventory,
      message: "スタミナが足りません",
      mined: false,
      exploded: false,
    };
  }

  const nextPlayer = {
    ...player,
    stamina: player.stamina - BALANCE.mining.staminaCost,
    actionState: "mining" as const,
  };
  const nextDurability = Math.max(0, tile.durability - 1);
  if (nextDurability > 0) {
    return {
      field: replaceTile(field, { ...tile, durability: nextDurability }),
      player: nextPlayer,
      inventory,
      message: "壁にひびが入りました",
      mined: true,
      exploded: false,
    };
  }

  if (
    tile.hasMine &&
    tile.state !== "cooledMine" &&
    tile.state !== "disabledMine"
  ) {
    return {
      field: replaceTile(field, {
        ...tile,
        state: "revealedFloor",
        mark: "none",
        durability: 0,
        isWalkable: true,
        isRevealed: true,
      }),
      player: damagePlayer(nextPlayer, BALANCE.mine.normalDamage),
      inventory,
      message: "未処理地雷が爆発しました",
      mined: true,
      exploded: true,
    };
  }

  const rng = createRandom(
    `${field.seed}:mine:${tile.x}:${tile.y}:${seedSuffix}`,
  );
  const drops = tile.hasMine ? MINE_DROPS : WALL_DROPS;
  const multiplier =
    tile.state === "cooledMine" || tile.state === "disabledMine"
      ? BALANCE.mine.treatedDropMultiplier
      : 1;
  const drop = rollWeightedDropWithRandom(drops, rng, multiplier);
  const revealedTile: Tile = {
    ...tile,
    state: "revealedFloor",
    mark: "none",
    durability: 0,
    itemId: drop?.itemId,
    isWalkable: true,
    isRevealed: true,
  };

  if (!drop) {
    return {
      field: replaceTile(field, revealedTile),
      player: nextPlayer,
      inventory,
      message: "通路が開きました",
      mined: true,
      exploded: false,
    };
  }

  const addResult = addItem(inventory, drop.itemId, drop.amount);
  return {
    field: replaceTile(field, {
      ...revealedTile,
      state: addResult.added ? "revealedFloor" : "item",
    }),
    player: nextPlayer,
    inventory: addResult.inventory,
    message: addResult.added ? "素材を手に入れました" : "バッグがいっぱいです",
    mined: true,
    exploded: false,
    gainedItemId: addResult.added ? drop.itemId : undefined,
    gainedAmount: addResult.added ? drop.amount : undefined,
  };
}
