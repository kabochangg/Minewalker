import { AREAS, type AreaId } from "../../data/areas";
import {
  getEquipment,
  type EquipmentId,
  type EquipmentSlot,
} from "../../data/equipment";
import type { ItemId } from "../../data/items";
import { getMonster, type MonsterId } from "../../data/monsters";
import { getUpgrade, type UpgradeId } from "../../data/upgrades";
import {
  createSaveData,
  loadGame,
  saveGame,
  type SaveData,
} from "../../save/SaveSystem";
import {
  addItem,
  hasItems,
  removeItems,
  type InventoryState,
} from "../systems/InventorySystem";
import { repairTool, upgradeTool } from "../systems/ToolSystem";

export interface ExplorationReward {
  readonly success: boolean;
  readonly depth: number;
  readonly inventory: InventoryState;
  readonly defeatedMonsters: readonly MonsterId[];
  readonly bossDefeated: boolean;
}

export interface SpendResult {
  readonly ok: boolean;
  readonly message: string;
  readonly state: SaveData;
}

let cachedState: SaveData | undefined;

export function getGameState(): SaveData {
  cachedState ??= loadGame() ?? createSaveData();
  return cachedState;
}

export function setGameState(next: SaveData): SaveData {
  cachedState = next;
  saveGame(next);
  return next;
}

export function resetGameStateForTests(next?: SaveData): void {
  cachedState = next;
}

export function applyExplorationReward(reward: ExplorationReward): SaveData {
  const current = getGameState();
  let inventory = current.inventory;
  const foundItems = new Set(current.collection.items);
  for (const [itemId, amount] of Object.entries(reward.inventory.items) as [
    ItemId,
    number,
  ][]) {
    if (amount <= 0) {
      continue;
    }
    const result = addItem(inventory, itemId, amount);
    inventory = result.inventory;
    if (result.added) {
      foundItems.add(itemId);
    }
  }
  inventory = {
    ...inventory,
    coolants: reward.inventory.coolants,
    disablers: reward.inventory.disablers,
    potions: reward.inventory.potions,
    maps: reward.inventory.maps,
  };

  const defeated = { ...current.statistics.monstersDefeated };
  const foundMonsters = new Set(current.collection.monsters);
  for (const monsterId of reward.defeatedMonsters) {
    defeated[monsterId] = (defeated[monsterId] ?? 0) + 1;
    foundMonsters.add(monsterId);
  }

  const gainedExp =
    reward.defeatedMonsters.reduce(
      (total, monsterId) => total + getMonster(monsterId).exp,
      0,
    ) +
    Math.floor(reward.depth / 2) +
    (reward.success ? 12 : 0);
  const gainedCoins = Math.max(
    6,
    reward.depth * 2 +
      (reward.success ? 30 : 0) +
      (reward.bossDefeated ? 200 : 0),
  );
  const nextPlayer = levelUp({
    ...current.player,
    coins: current.player.coins + gainedCoins,
    exp: current.player.exp + gainedExp,
  });

  const next: SaveData = {
    ...current,
    player: nextPlayer,
    inventory,
    unlockedAreas: resolveUnlockedAreas(
      current.unlockedAreas,
      nextPlayer.level,
      current.base.levels["upgrade.base"],
    ),
    collection: {
      ...current.collection,
      items: Array.from(foundItems),
      monsters: Array.from(foundMonsters),
    },
    statistics: {
      runs: current.statistics.runs + 1,
      clears: current.statistics.clears + (reward.success ? 1 : 0),
      deepestDepth: Math.max(current.statistics.deepestDepth, reward.depth),
      monstersDefeated: defeated,
      bossDefeated: current.statistics.bossDefeated || reward.bossDefeated,
    },
    lastSavedAt: new Date().toISOString(),
  };
  return setGameState(next);
}

export function tryUpgrade(upgradeId: UpgradeId): SpendResult {
  const state = getGameState();
  const upgrade = getUpgrade(upgradeId);
  const level = state.base.levels[upgradeId] ?? 1;
  if (level >= upgrade.maxLevel) {
    return { ok: false, message: `${upgrade.name}は最大レベルです`, state };
  }
  const cost = upgrade.costs[level - 1];
  if (
    state.player.coins < cost.coins ||
    !hasItems(state.inventory, cost.items)
  ) {
    return { ok: false, message: `${upgrade.name}の素材が足りません`, state };
  }
  const inventory = removeItems(state.inventory, cost.items);
  if (!inventory) {
    return { ok: false, message: `${upgrade.name}の素材が足りません`, state };
  }
  const nextBase = {
    ...state.base,
    levels: {
      ...state.base.levels,
      [upgradeId]: level + 1,
    },
  };
  const nextPlayer = applyBaseStats(
    {
      ...state.player,
      coins: state.player.coins - cost.coins,
    },
    upgradeId,
  );
  const next: SaveData = {
    ...state,
    player: nextPlayer,
    inventory,
    base: nextBase,
    unlockedAreas: resolveUnlockedAreas(
      state.unlockedAreas,
      nextPlayer.level,
      nextBase.levels["upgrade.base"],
    ),
    lastSavedAt: new Date().toISOString(),
  };
  return {
    ok: true,
    message: `${upgrade.name}をLv.${level + 1}へ強化しました`,
    state: setGameState(next),
  };
}

export function tryUnlockArea(areaId: AreaId): SpendResult {
  const state = getGameState();
  const area = AREAS.find((candidate) => candidate.id === areaId);
  if (!area) {
    return { ok: false, message: "不明な探索先です", state };
  }
  if (state.unlockedAreas.includes(areaId)) {
    return { ok: true, message: `${area.name}は解放済みです`, state };
  }
  const requirement = area.unlockRequirement;
  if (!requirement) {
    return { ok: false, message: "この探索先はまだ解放できません", state };
  }
  if (
    state.player.level < requirement.playerLevel ||
    state.base.levels["upgrade.base"] < requirement.baseLevel ||
    state.player.coins < requirement.coins ||
    !hasItems(state.inventory, requirement.items)
  ) {
    return {
      ok: false,
      message: `${area.name}の解放条件を満たしていません`,
      state,
    };
  }
  const inventory = removeItems(state.inventory, requirement.items);
  if (!inventory) {
    return { ok: false, message: `${area.name}の素材が足りません`, state };
  }
  const next = {
    ...state,
    player: { ...state.player, coins: state.player.coins - requirement.coins },
    inventory,
    unlockedAreas: [...state.unlockedAreas, areaId],
    lastSavedAt: new Date().toISOString(),
  };
  return {
    ok: true,
    message: `${area.name}を解放しました`,
    state: setGameState(next),
  };
}

export function getEquippedStats(state: SaveData = getGameState()): {
  miningPower: number;
  attack: number;
  defense: number;
} {
  const equipped = Object.values(state.equipment.equipped).map((id) =>
    getEquipment(id as EquipmentId),
  );
  return equipped.reduce(
    (total, equipment) => ({
      miningPower: total.miningPower + equipment.miningPower,
      attack: total.attack + equipment.attack,
      defense: total.defense + equipment.defense,
    }),
    { miningPower: 0, attack: 0, defense: 0 },
  );
}

export function equipItem(equipmentId: EquipmentId): SpendResult {
  const state = getGameState();
  if (!state.equipment.owned.includes(equipmentId)) {
    return { ok: false, message: "未所持の装備です", state };
  }
  const equipment = getEquipment(equipmentId);
  const next = {
    ...state,
    equipment: {
      ...state.equipment,
      equipped: {
        ...state.equipment.equipped,
        [equipment.slot]: equipmentId,
      } as Record<EquipmentSlot, EquipmentId>,
    },
    lastSavedAt: new Date().toISOString(),
  };
  return {
    ok: true,
    message: `${equipment.name}を装備しました`,
    state: setGameState(next),
  };
}

export function discardItem(itemId: ItemId, amount = 1): SpendResult {
  const state = getGameState();
  if (itemId === "item.bossRelic") {
    return { ok: false, message: "地下王の遺物は捨てられません", state };
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    return { ok: false, message: "破棄数が正しくありません", state };
  }
  const inventory = removeItems(state.inventory, { [itemId]: amount });
  if (!inventory) {
    return { ok: false, message: `${amount}個は破棄できません`, state };
  }
  const next: SaveData = {
    ...state,
    inventory,
    lastSavedAt: new Date().toISOString(),
  };
  return {
    ok: true,
    message: `${amount}個破棄しました`,
    state: setGameState(next),
  };
}

/** 拠点で指定道具を修理し、自動保存する。 */
export function tryRepairTool(equipmentId: EquipmentId): SpendResult {
  const state = getGameState();
  const condition = state.toolConditions[equipmentId];
  if (!condition)
    return { ok: false, message: "修理できる道具がありません", state };
  const result = repairTool(condition);
  if (state.player.coins < result.coinCost) {
    return { ok: false, message: "修理コインが足りません", state };
  }
  const next: SaveData = {
    ...state,
    player: { ...state.player, coins: state.player.coins - result.coinCost },
    toolConditions: { ...state.toolConditions, [equipmentId]: result.tool },
    lastSavedAt: new Date().toISOString(),
  };
  return { ok: true, message: "道具を修理しました", state: setGameState(next) };
}

/** 拠点で指定道具を1段階強化し、自動保存する。 */
export function tryUpgradeTool(equipmentId: EquipmentId): SpendResult {
  const state = getGameState();
  const condition = state.toolConditions[equipmentId];
  if (!condition)
    return { ok: false, message: "強化できる道具がありません", state };
  const result = upgradeTool(condition);
  if (state.player.coins < result.coinCost) {
    return { ok: false, message: "強化コインが足りません", state };
  }
  const next: SaveData = {
    ...state,
    player: { ...state.player, coins: state.player.coins - result.coinCost },
    toolConditions: { ...state.toolConditions, [equipmentId]: result.tool },
    lastSavedAt: new Date().toISOString(),
  };
  return { ok: true, message: "道具を強化しました", state: setGameState(next) };
}

function resolveUnlockedAreas(
  current: readonly string[],
  playerLevel: number,
  baseLevel: number,
): AreaId[] {
  const unlocked = new Set(current as AreaId[]);
  for (const area of AREAS) {
    const requirement = area.unlockRequirement;
    if (
      !requirement ||
      (playerLevel >= requirement.playerLevel &&
        baseLevel >= requirement.baseLevel)
    ) {
      unlocked.add(area.id);
    }
  }
  return Array.from(unlocked);
}

function levelUp(player: SaveData["player"]): SaveData["player"] {
  let level = player.level;
  let exp = player.exp;
  let maxHp = player.maxHp;
  let maxStamina = player.maxStamina;
  let attack = player.attack;
  let defense = player.defense;
  while (exp >= level * 35) {
    exp -= level * 35;
    level += 1;
    maxHp += 8;
    maxStamina += 3;
    attack += 1;
    defense += level % 2 === 0 ? 1 : 0;
  }
  return {
    ...player,
    level,
    exp,
    maxHp,
    maxStamina,
    hp: maxHp,
    stamina: maxStamina,
    attack,
    defense,
  };
}

function applyBaseStats(
  player: SaveData["player"],
  upgradeId: UpgradeId,
): SaveData["player"] {
  if (upgradeId === "upgrade.player") {
    return {
      ...player,
      maxHp: player.maxHp + 10,
      hp: player.maxHp + 10,
      maxStamina: player.maxStamina + 4,
      stamina: player.maxStamina + 4,
      attack: player.attack + 1,
      defense: player.defense + 1,
    };
  }
  return player;
}
