import { describe, expect, it } from "vitest";
import { createInitialInventory } from "../game/systems/InventorySystem";
import { createSaveData, loadGame, saveGame, validateSaveData } from "../save/SaveSystem";

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

    expect(validateSaveData(saveData).version).toBe(1);
  });

  it("loads a backup when primary save is corrupt", () => {
    const storage = new MemoryStorage();
    const saveData = createSaveData(createInitialInventory());
    saveGame(saveData, storage);
    saveGame({ ...saveData, lastSavedAt: "later" }, storage);
    storage.setItem("minewalker.save.v1", "{broken");

    expect(loadGame(storage)?.lastSavedAt).toBe(saveData.lastSavedAt);
  });
});
