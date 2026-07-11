import { z } from "zod";
import type { AreaId } from "../data/areas";
import type { EquipmentId } from "../data/equipment";
import { STARTER_EQUIPMENT_IDS } from "../data/equipment";
import { isItemId, type ItemId } from "../data/items";
import type { MonsterId } from "../data/monsters";
import type { UpgradeId } from "../data/upgrades";
import { createInitialInventory, normalizeInventory, type InventoryState } from "../game/systems/InventorySystem";

const SAVE_KEY = "minewalker.save.v2";
const SAVE_BACKUP_KEY = "minewalker.save.v2.backup";
const LEGACY_SAVE_KEY = "minewalker.save.v1";
const LEGACY_SAVE_BACKUP_KEY = "minewalker.save.v1.backup";

const itemRecordSchema = z.record(z.number().int().nonnegative());

const inventorySchema = z.object({
  capacity: z.number().int().positive(),
  items: itemRecordSchema,
  coolants: z.number().int().nonnegative(),
  disablers: z.number().int().nonnegative(),
  potions: z.number().int().nonnegative(),
  maps: z.number().int().nonnegative()
});

const SaveDataV1Schema = z.object({
  version: z.literal(1),
  player: z.object({
    level: z.number().int().positive(),
    exp: z.number().int().nonnegative(),
    hp: z.number().int().nonnegative(),
    stamina: z.number().int().nonnegative()
  }),
  inventory: inventorySchema,
  unlockedAreas: z.array(z.string()),
  settings: z.object({
    sound: z.boolean(),
    vibration: z.boolean()
  }),
  lastSavedAt: z.string()
});

export const SaveDataSchema = z.object({
  version: z.literal(2),
  player: z.object({
    level: z.number().int().positive(),
    exp: z.number().int().nonnegative(),
    hp: z.number().int().nonnegative(),
    maxHp: z.number().int().positive(),
    stamina: z.number().int().nonnegative(),
    maxStamina: z.number().int().positive(),
    attack: z.number().int().nonnegative(),
    defense: z.number().int().nonnegative(),
    coins: z.number().int().nonnegative()
  }),
  inventory: inventorySchema,
  equipment: z.object({
    owned: z.array(z.string()),
    equipped: z.object({
      pickaxe: z.string(),
      weapon: z.string(),
      armor: z.string()
    })
  }),
  base: z.object({
    levels: z.record(z.number().int().positive())
  }),
  unlockedAreas: z.array(z.string()),
  collection: z.object({
    items: z.array(z.string()),
    monsters: z.array(z.string()),
    equipment: z.array(z.string())
  }),
  settings: z.object({
    sound: z.boolean(),
    vibration: z.boolean(),
    reducedMotion: z.boolean(),
    tutorialSeen: z.boolean(),
    textSize: z.enum(["normal", "large"])
  }),
  statistics: z.object({
    runs: z.number().int().nonnegative(),
    clears: z.number().int().nonnegative(),
    deepestDepth: z.number().int().nonnegative(),
    monstersDefeated: z.record(z.number().int().nonnegative()),
    bossDefeated: z.boolean()
  }),
  lastSavedAt: z.string()
});

export type SaveData = z.infer<typeof SaveDataSchema>;
type SaveDataV1 = z.infer<typeof SaveDataV1Schema>;

export function createSaveData(inventory: InventoryState = createInitialInventory()): SaveData {
  return {
    version: 2,
    player: {
      level: 1,
      exp: 0,
      hp: 100,
      maxHp: 100,
      stamina: 50,
      maxStamina: 50,
      attack: 6,
      defense: 2,
      coins: 0
    },
    inventory: normalizeInventory(inventory),
    equipment: {
      owned: Object.values(STARTER_EQUIPMENT_IDS),
      equipped: { ...STARTER_EQUIPMENT_IDS }
    },
    base: {
      levels: {
        "upgrade.base": 1,
        "upgrade.player": 1,
        "upgrade.weaponBench": 1,
        "upgrade.armorBench": 1
      }
    },
    unlockedAreas: ["area.beginnerMine"],
    collection: {
      items: [],
      monsters: [],
      equipment: Object.values(STARTER_EQUIPMENT_IDS)
    },
    settings: {
      sound: true,
      vibration: true,
      reducedMotion: false,
      tutorialSeen: false,
      textSize: "normal"
    },
    statistics: {
      runs: 0,
      clears: 0,
      deepestDepth: 0,
      monstersDefeated: {},
      bossDefeated: false
    },
    lastSavedAt: new Date().toISOString()
  };
}

export function validateSaveData(input: unknown): SaveData {
  const versioned = z.object({ version: z.number() }).passthrough().parse(input);
  if (versioned.version === 1) {
    return migrateV1ToV2(SaveDataV1Schema.parse(input));
  }
  return normalizeSaveData(SaveDataSchema.parse(input));
}

export function migrateV1ToV2(v1: SaveDataV1): SaveData {
  const next = createSaveData(normalizeInventory(v1.inventory as InventoryState));
  return {
    ...next,
    player: {
      ...next.player,
      level: v1.player.level,
      exp: v1.player.exp,
      hp: v1.player.hp,
      stamina: v1.player.stamina
    },
    unlockedAreas: normalizeAreaIds(v1.unlockedAreas),
    settings: {
      ...next.settings,
      sound: v1.settings.sound,
      vibration: v1.settings.vibration
    },
    lastSavedAt: v1.lastSavedAt
  };
}

export function saveGame(data: SaveData, storage: Storage | undefined = getBrowserStorage()): void {
  if (!storage) {
    return;
  }
  const serialized = JSON.stringify({ ...normalizeSaveData(data), lastSavedAt: new Date().toISOString() });
  const existing = storage.getItem(SAVE_KEY);
  if (existing) {
    storage.setItem(SAVE_BACKUP_KEY, existing);
  }
  storage.setItem(SAVE_KEY, serialized);
}

export function loadGame(storage: Storage | undefined = getBrowserStorage()): SaveData | undefined {
  if (!storage) {
    return undefined;
  }
  const candidates = [
    storage.getItem(SAVE_KEY),
    storage.getItem(SAVE_BACKUP_KEY),
    storage.getItem(LEGACY_SAVE_KEY),
    storage.getItem(LEGACY_SAVE_BACKUP_KEY)
  ];
  for (const serialized of candidates) {
    if (!serialized) {
      continue;
    }
    try {
      return validateSaveData(JSON.parse(serialized));
    } catch {
      continue;
    }
  }
  return undefined;
}

export function normalizeSaveData(data: SaveData): SaveData {
  return {
    ...data,
    inventory: normalizeInventory(data.inventory as InventoryState),
    unlockedAreas: normalizeAreaIds(data.unlockedAreas),
    collection: {
      items: normalizeItemIds(data.collection.items),
      monsters: Array.from(new Set(data.collection.monsters)) as MonsterId[],
      equipment: Array.from(new Set(data.collection.equipment)) as EquipmentId[]
    },
    equipment: {
      owned: Array.from(new Set(data.equipment.owned)) as EquipmentId[],
      equipped: data.equipment.equipped as SaveData["equipment"]["equipped"]
    },
    base: {
      levels: {
        "upgrade.base": data.base.levels["upgrade.base"] ?? 1,
        "upgrade.player": data.base.levels["upgrade.player"] ?? 1,
        "upgrade.weaponBench": data.base.levels["upgrade.weaponBench"] ?? 1,
        "upgrade.armorBench": data.base.levels["upgrade.armorBench"] ?? 1
      } as Record<UpgradeId, number>
    }
  };
}

function normalizeAreaIds(input: readonly string[]): AreaId[] {
  const valid: readonly AreaId[] = ["area.beginnerMine", "area.crystalCave", "area.volcanoMine", "area.ancientSite"];
  const normalized = input.filter((id): id is AreaId => valid.includes(id as AreaId));
  return Array.from(new Set(["area.beginnerMine", ...normalized]));
}

function normalizeItemIds(input: readonly string[]): ItemId[] {
  return Array.from(new Set(input.filter(isItemId)));
}

function getBrowserStorage(): Storage | undefined {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}
