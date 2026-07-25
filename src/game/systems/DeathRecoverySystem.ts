import type { EquipmentId } from "../../data/equipment";
import type { ItemId } from "../../data/items";
import type { DeathCache } from "../components/progressionComponents";
import type { ExplorationState } from "../state/ExplorationState";
import type { SaveData } from "../../save/SaveSystem";

/** 死亡処理で同時更新する永続・探索状態を表す。 */
export interface DeathTransition {
  readonly persistent: SaveData;
  readonly exploration: ExplorationState;
  readonly cache: DeathCache;
  readonly transactionId: string;
}

/** 今回入手素材の50%を品目ごとに切り上げて死亡地点へ残す。 */
export function createDeathTransition(
  persistent: SaveData,
  exploration: ExplorationState,
  createdAt: string,
): DeathTransition {
  const sequence = persistent.nextOperationSequence;
  const cacheId = `death.${sequence}`;
  const transactionId = `tx.death.${sequence}`;
  const dropped: Partial<Record<ItemId, number>> = {};
  for (const [itemId, amount] of Object.entries(
    exploration.inventory.acquiredThisRun,
  ) as [ItemId, number][]) {
    const droppedAmount = Math.ceil(amount / 2);
    if (droppedAmount > 0) dropped[itemId] = droppedAmount;
  }
  const items = { ...exploration.inventory.items };
  for (const [itemId, amount] of Object.entries(dropped) as [
    ItemId,
    number,
  ][]) {
    items[itemId] = Math.max(0, (items[itemId] ?? 0) - amount);
  }
  const equipment = Object.values(
    exploration.player.equipment,
  ) as EquipmentId[];
  const cache: DeathCache = {
    id: cacheId,
    areaId: exploration.areaId,
    dungeonSeed: exploration.dungeon.config.seed,
    position: exploration.player.gridPosition,
    equipment,
    items: dropped,
    status: "active",
    createdAt,
  };
  return {
    transactionId,
    cache,
    persistent: {
      ...persistent,
      deathCaches: [...persistent.deathCaches, cache],
      lastTransactionId: transactionId,
      nextOperationSequence: sequence + 1,
    },
    exploration: {
      ...exploration,
      status: "failed",
      inventory: { ...exploration.inventory, items },
      deathCaches: [...exploration.deathCaches, cache],
      player: {
        ...exploration.player,
        hp: exploration.player.maxHp,
        position: {
          x: exploration.dungeon.config.entrance.x + 0.5,
          y: exploration.dungeon.config.entrance.y + 0.5,
        },
        gridPosition: exploration.dungeon.config.entrance,
        actionState: "idle",
      },
      lastTransactionId: transactionId,
    },
  };
}

/** 容量と位置を検証して死亡キャッシュを全量か無変更で回収する。 */
export function recoverDeathCache(
  persistent: SaveData,
  exploration: ExplorationState,
  cacheId: string,
): DeathTransition | undefined {
  const cache = persistent.deathCaches.find(
    (candidate) => candidate.id === cacheId && candidate.status === "active",
  );
  if (
    !cache ||
    cache.areaId !== exploration.areaId ||
    cache.dungeonSeed !== exploration.dungeon.config.seed ||
    cache.position.x !== exploration.player.gridPosition.x ||
    cache.position.y !== exploration.player.gridPosition.y
  )
    return undefined;
  const currentCount = Object.values(exploration.inventory.items).reduce(
    (sum, amount) => sum + (amount ?? 0),
    0,
  );
  const recoveryCount = Object.values(cache.items).reduce(
    (sum, amount) => sum + (amount ?? 0),
    0,
  );
  if (currentCount + recoveryCount > exploration.inventory.capacity)
    return undefined;
  const items = { ...exploration.inventory.items };
  for (const [itemId, amount] of Object.entries(cache.items) as [
    ItemId,
    number,
  ][]) {
    items[itemId] = (items[itemId] ?? 0) + amount;
  }
  const transactionId = `tx.recovery.${persistent.nextOperationSequence}`;
  const recovered = { ...cache, status: "recovered" as const };
  return {
    transactionId,
    cache: recovered,
    persistent: {
      ...persistent,
      deathCaches: persistent.deathCaches.filter(
        (candidate) => candidate.id !== cacheId,
      ),
      lastTransactionId: transactionId,
      nextOperationSequence: persistent.nextOperationSequence + 1,
    },
    exploration: {
      ...exploration,
      inventory: { ...exploration.inventory, items },
      deathCaches: exploration.deathCaches.filter(
        (candidate) => candidate.id !== cacheId,
      ),
      lastTransactionId: transactionId,
    },
  };
}
