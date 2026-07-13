import { z } from "zod";
import type { AreaId } from "../data/areas";
import type { MonsterId } from "../data/monsters";
import type { PlayerState } from "../game/entities/player";
import type { Minefield } from "../game/map/types";
import type { CombatantState } from "../game/systems/CombatSystem";
import type { InventoryState } from "../game/systems/InventorySystem";

const RUN_SAVE_KEY = "minewalker.run.v1";
const RUN_SAVE_BACKUP_KEY = "minewalker.run.v1.backup";

export interface SavedMonsterRuntime {
  readonly id: MonsterId;
  readonly tileX: number;
  readonly tileY: number;
  readonly combatant: CombatantState;
}

export interface RunSaveData {
  readonly version: 1;
  readonly areaId: AreaId;
  readonly field: Minefield;
  readonly player: PlayerState;
  readonly inventory: InventoryState;
  readonly monsters: readonly SavedMonsterRuntime[];
  readonly defeatedMonsters: readonly MonsterId[];
  readonly bossDefeated: boolean;
  readonly savedAt: string;
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
  mineId: z.string().optional(),
  itemId: z.string().optional(),
  monsterId: z.string().optional(),
  breakCost: z.number().int().positive(),
  durability: z.number().int().nonnegative(),
  isWalkable: z.boolean(),
  isRevealed: z.boolean(),
});

const runSaveSchema = z
  .object({
    version: z.literal(1),
    areaId: z.enum([
      "area.beginnerMine",
      "area.crystalCave",
      "area.volcanoMine",
      "area.ancientSite",
    ]),
    field: z.object({
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      tiles: z.array(tileSchema),
      seed: z.string().min(1),
      startX: coordinateSchema,
      startY: coordinateSchema,
    }),
    player: z.object({
      x: coordinateSchema,
      y: coordinateSchema,
      hp: z.number().int().nonnegative(),
      maxHp: z.number().int().positive(),
      stamina: z.number().int().nonnegative(),
      maxStamina: z.number().int().positive(),
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
    }),
    inventory: z.object({
      capacity: z.number().int().positive(),
      items: z.record(z.number().int().nonnegative()),
      coolants: z.number().int().nonnegative(),
      disablers: z.number().int().nonnegative(),
      potions: z.number().int().nonnegative(),
      maps: z.number().int().nonnegative(),
    }),
    monsters: z.array(
      z.object({
        id: z.string().min(1),
        tileX: coordinateSchema,
        tileY: coordinateSchema,
        combatant: z.object({
          hp: z.number().int().nonnegative(),
          maxHp: z.number().int().positive(),
        }),
      }),
    ),
    defeatedMonsters: z.array(z.string().min(1)),
    bossDefeated: z.boolean(),
    savedAt: z.string().datetime(),
  })
  .superRefine((data, context) => {
    if (data.field.tiles.length !== data.field.width * data.field.height) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Run save tile count does not match board size",
        path: ["field", "tiles"],
      });
    }
  });

export function saveRun(
  data: Omit<RunSaveData, "version" | "savedAt">,
  storage: Storage | undefined = getBrowserStorage(),
): void {
  if (!storage) return;
  const serialized = JSON.stringify({
    ...data,
    version: 1,
    savedAt: new Date().toISOString(),
  });
  const existing = storage.getItem(RUN_SAVE_KEY);
  if (existing) storage.setItem(RUN_SAVE_BACKUP_KEY, existing);
  storage.setItem(RUN_SAVE_KEY, serialized);
}

export function loadRun(
  storage: Storage | undefined = getBrowserStorage(),
): RunSaveData | undefined {
  if (!storage) return undefined;
  for (const serialized of [
    storage.getItem(RUN_SAVE_KEY),
    storage.getItem(RUN_SAVE_BACKUP_KEY),
  ]) {
    if (!serialized) continue;
    try {
      return runSaveSchema.parse(JSON.parse(serialized)) as RunSaveData;
    } catch {
      continue;
    }
  }
  return undefined;
}

export function clearRun(
  storage: Storage | undefined = getBrowserStorage(),
): void {
  storage?.removeItem(RUN_SAVE_KEY);
  storage?.removeItem(RUN_SAVE_BACKUP_KEY);
}

function getBrowserStorage(): Storage | undefined {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}
