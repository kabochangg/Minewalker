import { describe, expect, it } from "vitest";
import { createInitialInventory } from "../game/systems/InventorySystem";
import { createSaveData, loadGame, migrateV1ToV2, saveGame, validateSaveData } from "../save/SaveSystem";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("SaveSystem", () => {
  it("validates current save data", () => {
    const saveData = createSaveData(createInitialInventory());

    expect(validateSaveData(saveData).version).toBe(2);
    expect(validateSaveData(saveData).equipment.equipped.pickaxe).toBe("equipment.pickaxe.wood");
  });

  it("migrates v1 saves to v2", () => {
    const v1 = {
      version: 1 as const,
      player: { level: 3, exp: 12, hp: 80, stamina: 31 },
      inventory: createInitialInventory(),
      unlockedAreas: ["area.beginnerMine", "area.crystalCave"],
      settings: { sound: false, vibration: true },
      lastSavedAt: "legacy"
    };

    const migrated = migrateV1ToV2(v1);

    expect(migrated.version).toBe(2);
    expect(migrated.player.level).toBe(3);
    expect(migrated.unlockedAreas).toContain("area.crystalCave");
    expect(migrated.settings.sound).toBe(false);
  });

  it("loads a backup when primary save is corrupt", () => {
    const storage = new MemoryStorage();
    const saveData = createSaveData(createInitialInventory());
    saveGame(saveData, storage);
    saveGame({ ...saveData, player: { ...saveData.player, coins: 20 } }, storage);
    storage.setItem("minewalker.save.v2", "{broken");

    expect(loadGame(storage)?.version).toBe(2);
    expect(loadGame(storage)?.player.coins).toBe(0);
  });

  it("loads a legacy save when no v2 save exists", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "minewalker.save.v1",
      JSON.stringify({
        version: 1,
        player: { level: 2, exp: 4, hp: 90, stamina: 40 },
        inventory: createInitialInventory(),
        unlockedAreas: ["area.beginnerMine"],
        settings: { sound: true, vibration: false },
        lastSavedAt: "legacy"
      })
    );

    expect(loadGame(storage)?.player.level).toBe(2);
  });
});
