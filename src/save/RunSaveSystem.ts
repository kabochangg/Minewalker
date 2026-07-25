import { z } from "zod";
import type { AreaId } from "../data/areas";
import { DIFFICULTIES, type DifficultyId } from "../data/difficulties";
import { STARTER_EQUIPMENT_IDS } from "../data/equipment";
import type { MonsterId } from "../data/monsters";
import type { DeathCache } from "../game/components/progressionComponents";
import type { ToolConditionComponent } from "../game/components/toolComponents";
import type { PlayerState } from "../game/entities/player";
import type { Minefield, Tile } from "../game/map/types";
import { tileKey } from "../game/map/types";
import {
  validateExplorationState,
  type ExplorationState,
} from "../game/state/ExplorationState";
import type { CombatantState } from "../game/systems/CombatSystem";
import type { InventoryState } from "../game/systems/InventorySystem";

export const RUN_SAVE_KEY = "minewalker.run.v2";
export const RUN_SAVE_BACKUP_KEY = "minewalker.run.v2.backup";
export const PREVIOUS_RUN_SAVE_KEY = "minewalker.run.v1";
export const PREVIOUS_RUN_SAVE_BACKUP_KEY = "minewalker.run.v1.backup";

/** 旧探索セーブ内のモンスター状態を表す。 */
export interface SavedMonsterRuntime {
  readonly id: MonsterId;
  readonly tileX: number;
  readonly tileY: number;
  readonly combatant: CombatantState;
}

/** 既存Scene向けの探索セーブ互換ビュー。 */
export interface RunSaveData {
  readonly version: 2;
  readonly areaId: AreaId;
  readonly field: Minefield;
  readonly player: PlayerState;
  readonly playerPosition?: { readonly x: number; readonly y: number };
  readonly inventory: InventoryState;
  readonly monsters: readonly SavedMonsterRuntime[];
  readonly defeatedMonsters: readonly MonsterId[];
  readonly bossDefeated: boolean;
  readonly savedAt: string;
  readonly exploration: ExplorationState;
}

/** 旧Sceneが保存時に渡すデータを表す。 */
export interface LegacyRunInput {
  readonly areaId: AreaId;
  readonly field: Minefield;
  readonly player: PlayerState;
  readonly playerPosition?: { readonly x: number; readonly y: number };
  readonly inventory: InventoryState;
  readonly monsters: readonly SavedMonsterRuntime[];
  readonly defeatedMonsters: readonly MonsterId[];
  readonly bossDefeated: boolean;
  readonly difficultyId?: DifficultyId;
  readonly tools?: readonly ToolConditionComponent[];
  readonly deathCaches?: readonly DeathCache[];
}

const coordinateSchema = z.number().int().nonnegative();
const tileSchema = z.object({
  x: coordinateSchema,
  y: coordinateSchema,
  state: z.enum([
    "hiddenWall",
    "revealedFloor",
    "mineWall",
    "cooledMine",
    "disabledMine",
    "item",
    "monster",
    "exit",
    "blocked",
  ]),
  mark: z.enum(["none", "flag"]),
  hasMine: z.boolean(),
  adjacentMineCount: z.number().int().min(0).max(8),
  adjacentHazardCount: z.number().int().min(0).max(8).optional(),
  mineId: z.string().optional(),
  hazardId: z.string().optional(),
  itemId: z.string().optional(),
  monsterId: z.string().optional(),
  checkpointId: z.string().optional(),
  terrain: z.enum(["wall", "floor", "blocked"]).optional(),
  discovery: z.enum(["hidden", "revealed"]).optional(),
  breakCost: z.number().int().positive(),
  durability: z.number().int().nonnegative(),
  isWalkable: z.boolean(),
  isRevealed: z.boolean(),
});
const fieldSchema = z
  .object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    tiles: z.array(tileSchema),
    seed: z.string().min(1),
    startX: coordinateSchema,
    startY: coordinateSchema,
  })
  .superRefine((field, context) => {
    if (field.tiles.length !== field.width * field.height) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "盤面サイズとタイル数が一致しません",
        path: ["tiles"],
      });
    }
  });
const playerSchema = z.object({
  x: coordinateSchema,
  y: coordinateSchema,
  hp: z.number().int().nonnegative(),
  maxHp: z.number().int().positive(),
  stamina: z.number().nonnegative(),
  maxStamina: z.number().positive(),
  attack: z.number().int().nonnegative(),
  defense: z.number().int().nonnegative(),
  coins: z.number().int().nonnegative(),
  depth: z.number().int().nonnegative(),
  actionState: z.enum([
    "idle",
    "moving",
    "mining",
    "attacking",
    "damaged",
    "usingItem",
    "dead",
  ]),
});
const inventorySchema = z.object({
  capacity: z.number().int().positive(),
  items: z.record(z.number().int().nonnegative()),
  coolants: z.number().int().nonnegative(),
  disablers: z.number().int().nonnegative(),
  potions: z.number().int().nonnegative(),
  maps: z.number().int().nonnegative(),
});
const monsterSchema = z.object({
  id: z.string().min(1),
  tileX: coordinateSchema,
  tileY: coordinateSchema,
  combatant: z.object({
    hp: z.number().int().nonnegative(),
    maxHp: z.number().int().positive(),
  }),
});
const legacyRunSchema = z.object({
  version: z.literal(1),
  areaId: z.enum([
    "area.beginnerMine",
    "area.crystalCave",
    "area.volcanoMine",
    "area.ancientSite",
  ]),
  field: fieldSchema,
  player: playerSchema,
  playerPosition: z
    .object({ x: z.number().nonnegative(), y: z.number().nonnegative() })
    .optional(),
  inventory: inventorySchema,
  monsters: z.array(monsterSchema),
  defeatedMonsters: z.array(z.string().min(1)),
  bossDefeated: z.boolean(),
  difficultyId: z.enum(["easy", "normal", "hard"]).optional(),
  tools: z.array(z.unknown()).optional(),
  deathCaches: z.array(z.unknown()).optional(),
  savedAt: z.string(),
});
const currentRunEnvelopeSchema = z.object({
  version: z.literal(2),
  exploration: z.unknown(),
});

interface LegacyRunData extends LegacyRunInput {
  readonly version: 1;
  readonly savedAt: string;
}

/** v1探索データを数字再計算済みのExplorationState v2へ移行する。 */
export function migrateRunV1ToV2(
  input: LegacyRunData | ExplorationState,
): ExplorationState {
  if (input.version === 2) return input;
  const legacy = legacyRunSchema.parse(input) as unknown as LegacyRunData;
  const hazards = legacy.field.tiles
    .filter((tile) => tile.hasMine)
    .map((tile) => ({
      id: `hazard.${tile.x}.${tile.y}.explosive` as const,
      position: { x: tile.x, y: tile.y },
      type: "explosive" as const,
      state: (tile.state === "disabledMine"
        ? "disposed"
        : tile.isRevealed
          ? "triggered"
          : "armed") as "armed" | "disposed" | "triggered",
      damage: 25,
      rewardTableId: "reward.hazard.explosive",
      requiredToolTier: 1,
    }));
  const armed = new Set(
    hazards
      .filter((hazard) => hazard.state === "armed")
      .map((hazard) => tileKey(hazard.position.x, hazard.position.y)),
  );
  const tiles: Tile[] = legacy.field.tiles.map((tile): Tile => {
    const hazard = hazards.find(
      (candidate) =>
        candidate.position.x === tile.x && candidate.position.y === tile.y,
    );
    let adjacentHazardCount = 0;
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (
          (dx !== 0 || dy !== 0) &&
          armed.has(tileKey(tile.x + dx, tile.y + dy))
        )
          adjacentHazardCount += 1;
      }
    }
    return {
      ...tile,
      hazardId: hazard?.id,
      adjacentMineCount: adjacentHazardCount,
      adjacentHazardCount,
      terrain:
        tile.state === "blocked"
          ? "blocked"
          : tile.isWalkable
            ? "floor"
            : "wall",
      discovery: tile.isRevealed ? "revealed" : "hidden",
    };
  });
  const field = { ...legacy.field, tiles };
  const exit =
    tiles.find((tile) => tile.state === "exit") ?? tiles[tiles.length - 1];
  const checkpoint = {
    id: `checkpoint.legacy.${exit.x}.${exit.y}`,
    position: { x: exit.x, y: exit.y },
    status: (legacy.player.x === exit.x && legacy.player.y === exit.y
      ? "eligible"
      : "locked") as "eligible" | "locked",
    objectives: [{ id: "reach", kind: "reach" as const, required: 1 as const }],
    progress: {
      reach: legacy.player.x === exit.x && legacy.player.y === exit.y ? 1 : 0,
    },
    isFinal: true,
  };
  const continuous = legacy.playerPosition ?? {
    x: legacy.player.x + 0.5,
    y: legacy.player.y + 0.5,
  };
  return {
    version: 2,
    status: legacy.player.hp === 0 ? "failed" : "active",
    areaId: legacy.areaId,
    difficultyId: legacy.difficultyId ?? "normal",
    dungeon: {
      config: {
        seed:
          field.seed ||
          `legacy.${field.width}x${field.height}.${field.startX}.${field.startY}`,
        areaId: legacy.areaId,
        difficultyId: legacy.difficultyId ?? "normal",
        width: field.width,
        height: field.height,
        entrance: { x: field.startX, y: field.startY },
        safeRadius: inferSafeRadius(field),
        checkpointCount: 1,
        generatorVersion: 1,
      },
      field,
      hazards,
      rooms: [],
      chestPositions: [],
      monsterSpawns: legacy.monsters.map((monster) => ({
        id: monster.id,
        x: monster.tileX,
        y: monster.tileY,
      })),
      checkpoints: [checkpoint],
      generationAttempt: 0,
    },
    player: {
      position: continuous,
      gridPosition: { x: legacy.player.x, y: legacy.player.y },
      hp: legacy.player.hp,
      maxHp: legacy.player.maxHp,
      stamina: legacy.player.stamina,
      maxStamina: legacy.player.maxStamina,
      actionState: legacy.player.actionState,
      locomotion: "walk",
      statusEffects: [],
      equipment: { ...STARTER_EQUIPMENT_IDS },
    },
    inventory: {
      capacity: legacy.inventory.capacity,
      items: legacy.inventory.items,
      acquiredThisRun: legacy.inventory.items,
      consumables: {
        coolants: legacy.inventory.coolants,
        disablers: legacy.inventory.disablers,
        potions: legacy.inventory.potions,
        maps: legacy.inventory.maps,
      },
    },
    tools: legacy.tools ?? [
      {
        equipmentId: STARTER_EQUIPMENT_IDS.pickaxe,
        currentDurability: 30,
        maxDurability: 30,
        tier: 1,
        repairCount: 0,
      },
    ],
    monsters: legacy.monsters.map((monster) => ({
      id: monster.id as MonsterId,
      position: { x: monster.tileX, y: monster.tileY },
      hp: monster.combatant.hp,
      maxHp: monster.combatant.maxHp,
      defeated: monster.combatant.hp === 0,
    })),
    checkpoints: [checkpoint],
    objectiveProgress: checkpoint.progress,
    deathCaches: legacy.deathCaches ?? [],
    elapsedActiveMs: 0,
    savedAt: legacy.savedAt,
  };
}

/** 現行ExplorationStateを検証して中断領域へ保存する。 */
export function saveExplorationState(
  exploration: ExplorationState,
  storage: Storage | undefined = getBrowserStorage(),
): void {
  if (!storage) return;
  const errors = validateExplorationState(exploration);
  if (errors.length > 0) {
    throw new Error(`探索中断データが不正です: ${errors.join(" / ")}`);
  }
  const serialized = JSON.stringify({ version: 2, exploration });
  const existing = storage.getItem(RUN_SAVE_KEY);
  if (existing) storage.setItem(RUN_SAVE_BACKUP_KEY, existing);
  storage.setItem(RUN_SAVE_KEY, serialized);
  const readBack = storage.getItem(RUN_SAVE_KEY);
  if (
    !readBack ||
    currentRunEnvelopeSchema.parse(JSON.parse(readBack)).version !== 2
  ) {
    throw new Error("探索中断データの読み戻しに失敗しました");
  }
}

/** 現行または旧キーからExplorationStateを復元する。 */
export function loadExplorationState(
  storage: Storage | undefined = getBrowserStorage(),
): ExplorationState | undefined {
  if (!storage) return undefined;
  for (const serialized of [
    storage.getItem(RUN_SAVE_KEY),
    storage.getItem(RUN_SAVE_BACKUP_KEY),
    storage.getItem(PREVIOUS_RUN_SAVE_KEY),
    storage.getItem(PREVIOUS_RUN_SAVE_BACKUP_KEY),
  ]) {
    if (!serialized) continue;
    try {
      const parsed: unknown = JSON.parse(serialized);
      const version = z
        .object({ version: z.number() })
        .passthrough()
        .parse(parsed).version;
      if (version === 2) {
        const exploration = currentRunEnvelopeSchema.parse(parsed)
          .exploration as ExplorationState;
        if (validateExplorationState(exploration).length > 0) continue;
        return exploration;
      }
      return migrateRunV1ToV2(
        legacyRunSchema.parse(parsed) as unknown as LegacyRunData,
      );
    } catch {
      // 次の候補を試す。
    }
  }
  return undefined;
}

/** 既存Scene入力をv2へ移行して保存する。 */
export function saveRun(
  data: LegacyRunInput,
  storage: Storage | undefined = getBrowserStorage(),
): void {
  const savedAt = new Date().toISOString();
  const legacy: LegacyRunData = { ...data, version: 1, savedAt };
  saveExplorationState(migrateRunV1ToV2(legacy), storage);
}

/** 既存Sceneが利用する互換ビューで中断探索を読み込む。 */
export function loadRun(
  storage: Storage | undefined = getBrowserStorage(),
): RunSaveData | undefined {
  const exploration = loadExplorationState(storage);
  if (!exploration) return undefined;
  return toCompatibilityView(exploration);
}

/** 新旧の探索中断領域をすべて消去する。 */
export function clearRun(
  storage: Storage | undefined = getBrowserStorage(),
): void {
  storage?.removeItem(RUN_SAVE_KEY);
  storage?.removeItem(RUN_SAVE_BACKUP_KEY);
  storage?.removeItem(PREVIOUS_RUN_SAVE_KEY);
  storage?.removeItem(PREVIOUS_RUN_SAVE_BACKUP_KEY);
}

function toCompatibilityView(exploration: ExplorationState): RunSaveData {
  const player = exploration.player;
  return {
    version: 2,
    areaId: exploration.areaId,
    field: exploration.dungeon.field,
    player: {
      x: player.gridPosition.x,
      y: player.gridPosition.y,
      hp: player.hp,
      maxHp: player.maxHp,
      stamina: Math.floor(player.stamina),
      maxStamina: Math.floor(player.maxStamina),
      attack: 10,
      defense: 3,
      coins: 0,
      depth: 0,
      actionState:
        player.actionState === "disposing" ? "usingItem" : player.actionState,
    },
    playerPosition: player.position,
    inventory: {
      capacity: exploration.inventory.capacity,
      items: exploration.inventory.items as InventoryState["items"],
      ...exploration.inventory.consumables,
    },
    monsters: exploration.monsters
      .filter((monster) => !monster.defeated)
      .map((monster) => ({
        id: monster.id,
        tileX: monster.position.x,
        tileY: monster.position.y,
        combatant: { hp: monster.hp, maxHp: monster.maxHp },
      })),
    defeatedMonsters: exploration.monsters
      .filter((monster) => monster.defeated)
      .map((monster) => monster.id),
    bossDefeated: false,
    savedAt: exploration.savedAt,
    exploration,
  };
}

function inferSafeRadius(field: Minefield): number {
  let radius = 0;
  const maximum = Math.min(field.width, field.height);
  for (let candidate = 1; candidate < maximum; candidate += 1) {
    const safe = field.tiles
      .filter(
        (tile) =>
          Math.max(
            Math.abs(tile.x - field.startX),
            Math.abs(tile.y - field.startY),
          ) <= candidate,
      )
      .every((tile) => tile.isRevealed && !tile.hasMine);
    if (!safe) break;
    radius = candidate;
  }
  return Math.max(radius, DIFFICULTIES.normal.safeRadius);
}

function getBrowserStorage(): Storage | undefined {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}
