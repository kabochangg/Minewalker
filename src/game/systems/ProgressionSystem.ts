import { AREAS, type AreaId } from "../../data/areas";
import { getUpgrade, type UpgradeId } from "../../data/upgrades";
import type { SaveData } from "../../save/SaveSystem";
import { hasItems } from "./InventorySystem";

export function canUnlockArea(state: SaveData, areaId: AreaId): boolean {
  const area = AREAS.find((candidate) => candidate.id === areaId);
  if (!area) {
    return false;
  }
  if (state.unlockedAreas.includes(areaId)) {
    return true;
  }
  const requirement = area.unlockRequirement;
  if (!requirement) {
    return true;
  }
  return (
    state.player.level >= requirement.playerLevel &&
    state.base.levels["upgrade.base"] >= requirement.baseLevel &&
    state.player.coins >= requirement.coins &&
    hasItems(state.inventory, requirement.items)
  );
}

export function getUpgradeCostLabel(state: SaveData, upgradeId: UpgradeId): string {
  const upgrade = getUpgrade(upgradeId);
  const level = state.base.levels[upgradeId] ?? 1;
  if (level >= upgrade.maxLevel) {
    return "最大";
  }
  const cost = upgrade.costs[level - 1];
  const items = Object.entries(cost.items)
    .map(([itemId, amount]) => `${itemId.replace("item.", "")}x${amount}`)
    .join(" ");
  return `${cost.coins}C ${items}`;
}

export function getNextUnlockHint(state: SaveData): string {
  const next = AREAS.find((area) => !state.unlockedAreas.includes(area.id));
  if (!next?.unlockRequirement) {
    return "すべての探索先を解放済み";
  }
  return `${next.name}: Lv${next.unlockRequirement.playerLevel} / 拠点Lv${next.unlockRequirement.baseLevel}`;
}
