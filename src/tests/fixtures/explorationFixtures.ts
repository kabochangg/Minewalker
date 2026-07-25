import { STARTER_EQUIPMENT_IDS } from "../../data/equipment";
import { createInitialInventory } from "../../game/systems/InventorySystem";
import { generateMinefield } from "../../game/systems/MinefieldSystem";
import type { ExplorationState } from "../../game/state/ExplorationState";

/** テスト用の決定的な探索状態を生成する。 */
export function createExplorationFixture(
  seed = "fixture.exploration",
): ExplorationState {
  const field = generateMinefield({
    width: 7,
    height: 7,
    mineCount: 0,
    safeRadius: 1,
    seed,
    startX: 3,
    startY: 3,
  });
  const checkpoint = {
    id: "checkpoint.fixture.final",
    position: { x: 3, y: 0 },
    status: "locked" as const,
    objectives: [{ id: "reach", kind: "reach" as const, required: 1 as const }],
    progress: { reach: 0 },
    isFinal: true,
  };
  const inventory = createInitialInventory();
  return {
    version: 2,
    status: "active",
    areaId: "area.beginnerMine",
    difficultyId: "normal",
    dungeon: {
      config: {
        seed,
        areaId: "area.beginnerMine",
        difficultyId: "normal",
        width: 7,
        height: 7,
        entrance: { x: 3, y: 3 },
        safeRadius: 1,
        checkpointCount: 1,
        generatorVersion: 1,
      },
      field,
      hazards: [],
      rooms: [{ id: "room.fixture", x: 2, y: 2, width: 3, height: 3 }],
      chestPositions: [],
      monsterSpawns: [],
      checkpoints: [checkpoint],
      generationAttempt: 0,
    },
    player: {
      position: { x: 3.5, y: 3.5 },
      gridPosition: { x: 3, y: 3 },
      hp: 100,
      maxHp: 100,
      stamina: 50,
      maxStamina: 50,
      actionState: "idle",
      locomotion: "walk",
      statusEffects: [],
      equipment: { ...STARTER_EQUIPMENT_IDS },
    },
    inventory: {
      capacity: inventory.capacity,
      items: inventory.items,
      acquiredThisRun: {},
      consumables: {
        coolants: inventory.coolants,
        disablers: inventory.disablers,
        potions: inventory.potions,
        maps: inventory.maps,
      },
    },
    tools: [
      {
        equipmentId: STARTER_EQUIPMENT_IDS.pickaxe,
        currentDurability: 20,
        maxDurability: 20,
        tier: 1,
        repairCount: 0,
      },
    ],
    monsters: [],
    checkpoints: [checkpoint],
    objectiveProgress: { reach: 0 },
    deathCaches: [],
    elapsedActiveMs: 0,
    savedAt: "2026-01-01T00:00:00.000Z",
  };
}
