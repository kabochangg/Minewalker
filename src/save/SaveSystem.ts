import { z } from "zod";
import type { InventoryState } from "../game/systems/InventorySystem";

const SAVE_KEY = "minewalker.save.v1";
const SAVE_BACKUP_KEY = "minewalker.save.v1.backup";

export const SaveDataSchema = z.object({
  version: z.literal(1),
  player: z.object({
    level: z.number().int().positive(),
    exp: z.number().int().nonnegative(),
    hp: z.number().int().nonnegative(),
    stamina: z.number().int().nonnegative()
  }),
  inventory: z.object({
    capacity: z.number().int().positive(),
    items: z.record(z.number().int().nonnegative()),
    coolants: z.number().int().nonnegative(),
    disablers: z.number().int().nonnegative(),
    potions: z.number().int().nonnegative(),
    maps: z.number().int().nonnegative()
  }),
  unlockedAreas: z.array(z.string()),
  settings: z.object({
    sound: z.boolean(),
    vibration: z.boolean()
  }),
  lastSavedAt: z.string()
});

export type SaveData = z.infer<typeof SaveDataSchema>;

export function createSaveData(inventory: InventoryState): SaveData {
  return {
    version: 1,
    player: {
      level: 1,
      exp: 0,
      hp: 100,
      stamina: 50
    },
    inventory,
    unlockedAreas: ["area.beginnerMine"],
    settings: {
      sound: true,
      vibration: true
    },
    lastSavedAt: new Date().toISOString()
  };
}

export function validateSaveData(input: unknown): SaveData {
  return SaveDataSchema.parse(input);
}

export function saveGame(data: SaveData, storage: Storage = localStorage): void {
  const serialized = JSON.stringify(data);
  const existing = storage.getItem(SAVE_KEY);
  if (existing) {
    storage.setItem(SAVE_BACKUP_KEY, existing);
  }
  storage.setItem(SAVE_KEY, serialized);
}

export function loadGame(storage: Storage = localStorage): SaveData | undefined {
  const primary = storage.getItem(SAVE_KEY);
  const backup = storage.getItem(SAVE_BACKUP_KEY);
  for (const serialized of [primary, backup]) {
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
