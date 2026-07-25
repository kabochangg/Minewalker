import { describe, expect, it } from "vitest";
import { createInitialInventory } from "../game/systems/InventorySystem";
import {
  createSaveData,
  loadGame,
  migrateV1ToV2,
  migrateV2ToV3,
  resetGamePreservingPreferences,
  SAVE_KEY,
  saveGame,
  validateSaveData,
} from "../save/SaveSystem";
import {
  clearRun,
  loadExplorationState,
  loadRun,
  migrateRunV1ToV2,
  saveRun,
  saveExplorationState,
} from "../save/RunSaveSystem";
import { createInitialPlayer } from "../game/entities/player";
import { generateMinefield } from "../game/systems/MinefieldSystem";
import { createExplorationFixture } from "./fixtures/explorationFixtures";

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

    expect(validateSaveData(saveData).version).toBe(3);
    expect(validateSaveData(saveData).equipment.equipped.pickaxe).toBe(
      "equipment.pickaxe.wood",
    );
  });

  it("migrates v1 saves to v2", () => {
    const v1 = {
      version: 1 as const,
      player: { level: 3, exp: 12, hp: 80, stamina: 31 },
      inventory: createInitialInventory(),
      unlockedAreas: ["area.beginnerMine", "area.crystalCave"],
      settings: { sound: false, vibration: true },
      lastSavedAt: "legacy",
    };

    const migrated = migrateV1ToV2(v1);

    expect(migrated.version).toBe(2);
    expect(migrated.player.level).toBe(3);
    expect(migrated.unlockedAreas).toContain("area.crystalCave");
    expect(migrated.settings.sound).toBe(false);
  });

  it("v2を値を保持したv3へ冪等に移行する", () => {
    const v1 = {
      version: 1 as const,
      player: { level: 3, exp: 12, hp: 80, stamina: 31 },
      inventory: createInitialInventory(),
      unlockedAreas: ["area.beginnerMine", "area.crystalCave"],
      settings: { sound: false, vibration: true },
      lastSavedAt: "2026-01-01T00:00:00.000Z",
    };
    const v3 = migrateV2ToV3(migrateV1ToV2(v1));

    expect(v3.version).toBe(3);
    expect(v3.territories["area.crystalCave"]?.legacyEntranceClaimed).toBe(
      true,
    );
    expect(v3.selectedDifficulty).toBe("normal");
    expect(migrateV2ToV3(v3)).toEqual(v3);
  });

  it("loads a backup when primary save is corrupt", () => {
    const storage = new MemoryStorage();
    const saveData = createSaveData(createInitialInventory());
    saveGame(saveData, storage);
    saveGame(
      { ...saveData, player: { ...saveData.player, coins: 20 } },
      storage,
    );
    storage.setItem(SAVE_KEY, "{broken");

    expect(loadGame(storage)?.version).toBe(3);
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
        lastSavedAt: "legacy",
      }),
    );

    expect(loadGame(storage)?.player.level).toBe(2);
  });

  it("saves, validates, restores, and clears an interrupted run separately", () => {
    const storage = new MemoryStorage();
    const field = generateMinefield({
      width: 4,
      height: 4,
      mineCount: 2,
      safeRadius: 1,
      seed: "resume",
      startX: 1,
      startY: 1,
    });
    saveRun(
      {
        areaId: "area.beginnerMine",
        field,
        player: { ...createInitialPlayer(), x: 1, y: 1 },
        inventory: createInitialInventory(),
        monsters: [],
        defeatedMonsters: [],
        bossDefeated: false,
      },
      storage,
    );

    expect(loadRun(storage)?.field.seed).toBe("resume");
    expect(storage.getItem("minewalker.save.v3")).toBeNull();
    expect(storage.getItem("minewalker.run.v2")).toContain('"version":2');
    clearRun(storage);
    expect(loadRun(storage)).toBeUndefined();
  });

  it("v1探索を危険物・動的数字・最終checkpoint付きv2へ移行する", () => {
    const field = generateMinefield({
      width: 4,
      height: 4,
      mineCount: 1,
      safeRadius: 1,
      seed: "legacy-run",
      startX: 1,
      startY: 1,
    });
    const migrated = migrateRunV1ToV2({
      version: 1,
      areaId: "area.beginnerMine",
      field,
      player: { ...createInitialPlayer(), x: 1, y: 1 },
      inventory: createInitialInventory(),
      monsters: [],
      defeatedMonsters: [],
      bossDefeated: false,
      savedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(migrated.version).toBe(2);
    expect(migrated.dungeon.hazards).toHaveLength(1);
    expect(migrated.checkpoints).toHaveLength(1);
    expect(
      migrated.dungeon.field.tiles.some(
        (tile) => tile.adjacentHazardCount === 1,
      ),
    ).toBe(true);
  });

  it("v2探索の主データ破損時にbackupを復元する", () => {
    const storage = new MemoryStorage();
    const field = generateMinefield({
      width: 4,
      height: 4,
      mineCount: 0,
      safeRadius: 1,
      seed: "backup-run",
      startX: 1,
      startY: 1,
    });
    const input = {
      areaId: "area.beginnerMine" as const,
      field,
      player: { ...createInitialPlayer(), x: 1, y: 1 },
      inventory: createInitialInventory(),
      monsters: [],
      defeatedMonsters: [],
      bossDefeated: false,
    };
    saveRun(input, storage);
    saveRun(input, storage);
    storage.setItem("minewalker.run.v2", "{broken");
    expect(loadExplorationState(storage)?.dungeon.config.seed).toBe(
      "backup-run",
    );
  });

  it("新規開始で進行を消去し設定だけを保持する", () => {
    const storage = new MemoryStorage();
    const current = {
      ...createSaveData(),
      player: { ...createSaveData().player, coins: 999 },
      settings: {
        ...createSaveData().settings,
        volume: 0.5,
        reducedMotion: true,
      },
      controlScheme: {
        ...createSaveData().controlScheme,
        mode: "keyboard" as const,
      },
    };
    const next = resetGamePreservingPreferences(current, storage);
    expect(next.player.coins).toBe(0);
    expect(next.settings.volume).toBe(0.5);
    expect(next.controlScheme.mode).toBe("keyboard");
    expect(storage.getItem("minewalker.save.v2")).toBeNull();
  });

  it("v2探索の完全スナップショットを値を変えず再開する", () => {
    const storage = new MemoryStorage();
    const exploration = {
      ...createExplorationFixture("complete-resume"),
      elapsedActiveMs: 12_345,
      objectiveProgress: { reach: 1 },
      player: {
        ...createExplorationFixture().player,
        hp: 73,
        stamina: 18.5,
        locomotion: "run" as const,
      },
    };
    saveExplorationState(exploration, storage);
    expect(loadExplorationState(storage)).toEqual(exploration);
  });
});
