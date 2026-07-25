import { z } from "zod";
import type { AreaId } from "../data/areas";
import type { DifficultyId } from "../data/difficulties";
import {
  getEquipment,
  STARTER_EQUIPMENT_IDS,
  type EquipmentId,
} from "../data/equipment";
import { isItemId, type ItemId } from "../data/items";
import type { MonsterId } from "../data/monsters";
import type { UpgradeId } from "../data/upgrades";
import type {
  DeathCache,
  TerritoryState,
} from "../game/components/progressionComponents";
import {
  createDefaultInputProfile,
  type InputProfile,
  type ToolConditionComponent,
} from "../game/components/toolComponents";
import {
  createInitialInventory,
  normalizeInventory,
  type InventoryState,
} from "../game/systems/InventorySystem";

export const SAVE_KEY = "minewalker.save.v3";
export const SAVE_BACKUP_KEY = "minewalker.save.v3.backup";
export const PREVIOUS_SAVE_KEY = "minewalker.save.v2";
export const PREVIOUS_SAVE_BACKUP_KEY = "minewalker.save.v2.backup";
const LEGACY_SAVE_KEY = "minewalker.save.v1";
const LEGACY_SAVE_BACKUP_KEY = "minewalker.save.v1.backup";

const itemRecordSchema = z.record(z.number().int().nonnegative());
const inventorySchema = z.object({
  capacity: z.number().int().positive(),
  items: itemRecordSchema,
  coolants: z.number().int().nonnegative(),
  disablers: z.number().int().nonnegative(),
  potions: z.number().int().nonnegative(),
  maps: z.number().int().nonnegative(),
});
const persistentPlayerSchema = z.object({
  level: z.number().int().positive(),
  exp: z.number().int().nonnegative(),
  hp: z.number().int().nonnegative(),
  maxHp: z.number().int().positive(),
  stamina: z.number().int().nonnegative(),
  maxStamina: z.number().int().positive(),
  attack: z.number().int().nonnegative(),
  defense: z.number().int().nonnegative(),
  coins: z.number().int().nonnegative(),
});
const equipmentSchema = z.object({
  owned: z.array(z.string()),
  equipped: z.object({
    pickaxe: z.string(),
    weapon: z.string(),
    armor: z.string(),
  }),
});
const settingsSchema = z.object({
  sound: z.boolean(),
  volume: z.number().min(0).max(1).default(0.8),
  vibration: z.boolean(),
  reducedMotion: z.boolean(),
  tutorialSeen: z.boolean(),
  textSize: z.enum(["normal", "large"]),
});
const statisticsSchema = z.object({
  runs: z.number().int().nonnegative(),
  clears: z.number().int().nonnegative(),
  deepestDepth: z.number().int().nonnegative(),
  monstersDefeated: z.record(z.number().int().nonnegative()),
  bossDefeated: z.boolean(),
});
const commonV2Fields = {
  player: persistentPlayerSchema,
  inventory: inventorySchema,
  equipment: equipmentSchema,
  base: z.object({ levels: z.record(z.number().int().positive()) }),
  unlockedAreas: z.array(z.string()),
  collection: z.object({
    items: z.array(z.string()),
    monsters: z.array(z.string()),
    equipment: z.array(z.string()),
  }),
  settings: settingsSchema,
  statistics: statisticsSchema,
  lastSavedAt: z.string(),
};
const SaveDataV1Schema = z.object({
  version: z.literal(1),
  player: z.object({
    level: z.number().int().positive(),
    exp: z.number().int().nonnegative(),
    hp: z.number().int().nonnegative(),
    stamina: z.number().int().nonnegative(),
  }),
  inventory: inventorySchema,
  unlockedAreas: z.array(z.string()),
  settings: z.object({ sound: z.boolean(), vibration: z.boolean() }),
  lastSavedAt: z.string(),
});
export const SaveDataV2Schema = z.object({
  version: z.literal(2),
  ...commonV2Fields,
});

const coordinateSchema = z.object({
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
});
const territorySchema = z.object({
  id: z.string().min(1),
  areaId: z.string().min(1),
  claimedCheckpointIds: z.array(z.string()),
  tileKeys: z.array(z.string()),
  legacyEntranceClaimed: z.boolean(),
  updatedAt: z.string(),
});
const toolConditionSchema = z.object({
  equipmentId: z.string().min(1),
  currentDurability: z.number().int().nonnegative(),
  maxDurability: z.number().int().positive(),
  tier: z.number().int().positive(),
  repairCount: z.number().int().nonnegative(),
});
const deathCacheSchema = z.object({
  id: z.string().min(1),
  areaId: z.string().min(1),
  dungeonSeed: z.string().min(1),
  position: coordinateSchema,
  equipment: z.array(z.string()),
  items: itemRecordSchema,
  status: z.enum(["active", "recovered"]),
  createdAt: z.string(),
});
const inputProfileSchema = z.object({
  mode: z.enum(["touchJoystick", "touchTap", "keyboard"]),
  keyBindings: z.record(z.string()),
  runBehavior: z.enum(["hold", "toggle"]),
  markBehavior: z.enum(["longPress", "actionButton"]),
});

export const SaveDataSchema = z.object({
  version: z.literal(3),
  ...commonV2Fields,
  territories: z.record(territorySchema),
  toolConditions: z.record(toolConditionSchema),
  deathCaches: z.array(deathCacheSchema),
  selectedDifficulty: z.enum(["easy", "normal", "hard"]),
  controlScheme: inputProfileSchema,
  lastTransactionId: z.string().optional(),
  nextOperationSequence: z.number().int().positive(),
});

type ParsedSaveData = z.infer<typeof SaveDataSchema>;
export type SaveData = Omit<
  ParsedSaveData,
  | "territories"
  | "toolConditions"
  | "deathCaches"
  | "selectedDifficulty"
  | "controlScheme"
> & {
  readonly territories: Readonly<Record<string, TerritoryState>>;
  readonly toolConditions: Readonly<Record<string, ToolConditionComponent>>;
  readonly deathCaches: readonly DeathCache[];
  readonly selectedDifficulty: DifficultyId;
  readonly controlScheme: InputProfile;
};
export type SaveDataV2 = z.infer<typeof SaveDataV2Schema>;
type SaveDataV1 = z.infer<typeof SaveDataV1Schema>;

/** 新しい永続セーブデータを作成する。 */
export function createSaveData(
  inventory: InventoryState = createInitialInventory(),
): SaveData {
  const now = new Date().toISOString();
  const base: SaveDataV2 = {
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
      coins: 0,
    },
    inventory: normalizeInventory(inventory),
    equipment: {
      owned: Object.values(STARTER_EQUIPMENT_IDS),
      equipped: { ...STARTER_EQUIPMENT_IDS },
    },
    base: {
      levels: {
        "upgrade.base": 1,
        "upgrade.player": 1,
        "upgrade.weaponBench": 1,
        "upgrade.armorBench": 1,
      },
    },
    unlockedAreas: ["area.beginnerMine"],
    collection: {
      items: [],
      monsters: [],
      equipment: Object.values(STARTER_EQUIPMENT_IDS),
    },
    settings: {
      sound: true,
      volume: 0.8,
      vibration: true,
      reducedMotion: false,
      tutorialSeen: false,
      textSize: "normal",
    },
    statistics: {
      runs: 0,
      clears: 0,
      deepestDepth: 0,
      monstersDefeated: {},
      bossDefeated: false,
    },
    lastSavedAt: now,
  };
  return migrateV2ToV3(base);
}

/** 未知の入力を現行セーブ形式へ検証・移行する。 */
export function validateSaveData(input: unknown): SaveData {
  const versioned = z
    .object({ version: z.number() })
    .passthrough()
    .parse(input);
  if (versioned.version === 1) {
    return migrateV2ToV3(migrateV1ToV2(SaveDataV1Schema.parse(input)));
  }
  if (versioned.version === 2) {
    return migrateV2ToV3(SaveDataV2Schema.parse(input));
  }
  return normalizeSaveData(SaveDataSchema.parse(input) as SaveData);
}

/** v1データを既存値を保持したv2へ移行する。 */
export function migrateV1ToV2(v1: SaveDataV1): SaveDataV2 {
  const next = createV2Defaults(
    normalizeInventory(v1.inventory as InventoryState),
  );
  return {
    ...next,
    player: {
      ...next.player,
      level: v1.player.level,
      exp: v1.player.exp,
      hp: v1.player.hp,
      stamina: v1.player.stamina,
    },
    unlockedAreas: normalizeAreaIds(v1.unlockedAreas),
    settings: {
      ...next.settings,
      sound: v1.settings.sound,
      vibration: v1.settings.vibration,
    },
    lastSavedAt: v1.lastSavedAt,
  };
}

/** v2データを領域・道具・操作設定を持つv3へ決定的に移行する。 */
export function migrateV2ToV3(v2: SaveDataV2 | SaveData): SaveData {
  if (v2.version === 3) return normalizeSaveData(v2);
  const unlockedAreas = normalizeAreaIds(v2.unlockedAreas);
  const territories = Object.fromEntries(
    unlockedAreas.map((areaId) => [
      areaId,
      {
        id: `territory.legacy.${areaId}`,
        areaId,
        claimedCheckpointIds: [],
        tileKeys: [],
        legacyEntranceClaimed: true,
        updatedAt: v2.lastSavedAt,
      },
    ]),
  ) as Record<string, TerritoryState>;
  const owned = Array.from(new Set(v2.equipment.owned)) as EquipmentId[];
  const toolConditions = Object.fromEntries(
    owned.map((equipmentId) => {
      const equipment = getEquipment(equipmentId);
      const maxDurability =
        equipment.slot === "pickaxe" ? 20 + equipment.tier * 10 : 100;
      return [
        equipmentId,
        {
          equipmentId,
          currentDurability: maxDurability,
          maxDurability,
          tier: equipment.tier,
          repairCount: 0,
        },
      ];
    }),
  ) as Record<string, ToolConditionComponent>;
  return normalizeSaveData({
    ...v2,
    version: 3,
    territories,
    toolConditions,
    deathCaches: [],
    selectedDifficulty: "normal",
    controlScheme: createDefaultInputProfile(),
    nextOperationSequence: 1,
  });
}

/** 永続データをバックアップ付きで保存する。 */
export function saveGame(
  data: SaveData,
  storage: Storage | undefined = getBrowserStorage(),
): void {
  if (!storage) return;
  const validated = validateSaveData(data);
  const serialized = JSON.stringify({
    ...validated,
    lastSavedAt: new Date().toISOString(),
  });
  const existing = storage.getItem(SAVE_KEY);
  if (existing) storage.setItem(SAVE_BACKUP_KEY, existing);
  storage.setItem(SAVE_KEY, serialized);
  validateSaveData(JSON.parse(requiredStoredValue(storage, SAVE_KEY)));
}

/** 主・バックアップ・旧キーの順に永続データを復元する。 */
export function loadGame(
  storage: Storage | undefined = getBrowserStorage(),
): SaveData | undefined {
  if (!storage) return undefined;
  const candidates = [
    storage.getItem(SAVE_KEY),
    storage.getItem(SAVE_BACKUP_KEY),
    storage.getItem(PREVIOUS_SAVE_KEY),
    storage.getItem(PREVIOUS_SAVE_BACKUP_KEY),
    storage.getItem(LEGACY_SAVE_KEY),
    storage.getItem(LEGACY_SAVE_BACKUP_KEY),
  ];
  for (const serialized of candidates) {
    if (!serialized) continue;
    try {
      return validateSaveData(JSON.parse(serialized));
    } catch {
      // 次の復元候補を検証する。
    }
  }
  return undefined;
}

/** 新規開始で進行だけを消去し、設定と操作方式を保持する。 */
export function resetGamePreservingPreferences(
  current: SaveData,
  storage: Storage | undefined = getBrowserStorage(),
): SaveData {
  const fresh = createSaveData();
  const next: SaveData = {
    ...fresh,
    settings: current.settings,
    controlScheme: current.controlScheme,
  };
  if (storage) {
    for (const key of [
      SAVE_KEY,
      SAVE_BACKUP_KEY,
      PREVIOUS_SAVE_KEY,
      PREVIOUS_SAVE_BACKUP_KEY,
      LEGACY_SAVE_KEY,
      LEGACY_SAVE_BACKUP_KEY,
      "minewalker.run.v2",
      "minewalker.run.v2.backup",
      "minewalker.run.v1",
      "minewalker.run.v1.backup",
      "minewalker.tx.v1",
    ]) {
      storage.removeItem(key);
    }
    saveGame(next, storage);
  }
  return next;
}

/** 重複IDと不正な既存参照を正規化する。 */
export function normalizeSaveData(data: SaveData): SaveData {
  const deathCacheIds = new Set<string>();
  return {
    ...data,
    inventory: normalizeInventory(data.inventory as InventoryState),
    unlockedAreas: normalizeAreaIds(data.unlockedAreas),
    collection: {
      items: normalizeItemIds(data.collection.items),
      monsters: Array.from(new Set(data.collection.monsters)) as MonsterId[],
      equipment: Array.from(
        new Set(data.collection.equipment),
      ) as EquipmentId[],
    },
    equipment: {
      owned: Array.from(new Set(data.equipment.owned)) as EquipmentId[],
      equipped: data.equipment.equipped as SaveData["equipment"]["equipped"],
    },
    base: {
      levels: {
        "upgrade.base": data.base.levels["upgrade.base"] ?? 1,
        "upgrade.player": data.base.levels["upgrade.player"] ?? 1,
        "upgrade.weaponBench": data.base.levels["upgrade.weaponBench"] ?? 1,
        "upgrade.armorBench": data.base.levels["upgrade.armorBench"] ?? 1,
      } as Record<UpgradeId, number>,
    },
    deathCaches: data.deathCaches.filter((cache) => {
      if (cache.status !== "active" || deathCacheIds.has(cache.id))
        return false;
      deathCacheIds.add(cache.id);
      return (
        Object.values(cache.items).some((amount) => (amount ?? 0) > 0) ||
        cache.equipment.length > 0
      );
    }),
  };
}

function createV2Defaults(inventory: InventoryState): SaveDataV2 {
  const source = createSaveDataWithoutMigration(inventory);
  return {
    version: 2,
    player: source.player,
    inventory: source.inventory,
    equipment: source.equipment,
    base: source.base,
    unlockedAreas: source.unlockedAreas,
    collection: source.collection,
    settings: source.settings,
    statistics: source.statistics,
    lastSavedAt: source.lastSavedAt,
  };
}

function createSaveDataWithoutMigration(inventory: InventoryState): SaveData {
  const now = new Date().toISOString();
  return {
    version: 3,
    player: {
      level: 1,
      exp: 0,
      hp: 100,
      maxHp: 100,
      stamina: 50,
      maxStamina: 50,
      attack: 6,
      defense: 2,
      coins: 0,
    },
    inventory,
    equipment: {
      owned: Object.values(STARTER_EQUIPMENT_IDS),
      equipped: { ...STARTER_EQUIPMENT_IDS },
    },
    base: {
      levels: {
        "upgrade.base": 1,
        "upgrade.player": 1,
        "upgrade.weaponBench": 1,
        "upgrade.armorBench": 1,
      },
    },
    unlockedAreas: ["area.beginnerMine"],
    collection: {
      items: [],
      monsters: [],
      equipment: Object.values(STARTER_EQUIPMENT_IDS),
    },
    settings: {
      sound: true,
      volume: 0.8,
      vibration: true,
      reducedMotion: false,
      tutorialSeen: false,
      textSize: "normal",
    },
    statistics: {
      runs: 0,
      clears: 0,
      deepestDepth: 0,
      monstersDefeated: {},
      bossDefeated: false,
    },
    lastSavedAt: now,
    territories: {},
    toolConditions: {},
    deathCaches: [],
    selectedDifficulty: "normal",
    controlScheme: createDefaultInputProfile(),
    nextOperationSequence: 1,
  };
}

function normalizeAreaIds(input: readonly string[]): AreaId[] {
  const valid: readonly AreaId[] = [
    "area.beginnerMine",
    "area.crystalCave",
    "area.volcanoMine",
    "area.ancientSite",
  ];
  return Array.from(
    new Set([
      "area.beginnerMine",
      ...input.filter((id): id is AreaId => valid.includes(id as AreaId)),
    ]),
  );
}

function normalizeItemIds(input: readonly string[]): ItemId[] {
  return Array.from(new Set(input.filter(isItemId)));
}

function requiredStoredValue(storage: Storage, key: string): string {
  const value = storage.getItem(key);
  if (!value) throw new Error(`保存後のデータを読み戻せません: ${key}`);
  return value;
}

function getBrowserStorage(): Storage | undefined {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}
