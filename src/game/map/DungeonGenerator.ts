import { getArea, type AreaId } from "../../data/areas";
import {
  DIFFICULTIES,
  validateDifficulty,
  type DifficultyId,
} from "../../data/difficulties";
import { HAZARD_DEFINITIONS } from "../../data/hazards";
import { createRandom } from "../../utils/random";
import { createHazardId } from "../components/hazardComponents";
import type { DungeonState } from "../state/ExplorationState";
import { rebuildAdjacentHazardCounts } from "../systems/HazardSystem";
import { generateMinefield } from "../systems/MinefieldSystem";
import { resolveDifficulty } from "../systems/DifficultySystem";
import { validateDungeon } from "./dungeonValidator";

/** 自動生成へ渡す決定的な設定を表す。 */
export interface GenerateDungeonInput {
  readonly seed: string;
  readonly areaId: AreaId;
  readonly difficultyId: DifficultyId;
  readonly width?: number;
  readonly height?: number;
  readonly entrance?: { readonly x: number; readonly y: number };
}

/** 生成条件から再現可能な正規seed文字列を作る。 */
export function canonicalDungeonSeed(
  input: Required<GenerateDungeonInput>,
  attempt: number,
): string {
  return [
    1,
    input.areaId,
    input.difficultyId,
    input.seed,
    input.width,
    input.height,
    `${input.entrance.x},${input.entrance.y}`,
    DIFFICULTIES[input.difficultyId].safeRadius,
    1,
    `attempt:${attempt}`,
  ].join("|");
}

/** 最大32回の決定的再試行で安全かつ到達可能なダンジョンを生成する。 */
export function generateDungeon(
  input: GenerateDungeonInput,
  validator: (dungeon: DungeonState) => readonly string[] = validateDungeon,
): DungeonState {
  const resolved = resolveDifficulty(input.difficultyId, {
    width: input.width,
    height: input.height,
  });
  const difficulty = resolved.definition;
  if (!validateDifficulty(difficulty) || input.seed.length === 0) {
    throw new Error("ダンジョン生成設定が不正です");
  }
  const normalized: Required<GenerateDungeonInput> = {
    ...input,
    width: resolved.width,
    height: resolved.height,
    entrance: input.entrance ?? { x: 2, y: 2 },
  };
  if (
    normalized.width < difficulty.widthRange[0] ||
    normalized.width > difficulty.widthRange[1] ||
    normalized.height < difficulty.heightRange[0] ||
    normalized.height > difficulty.heightRange[1]
  )
    throw new Error("盤面サイズが難易度の範囲外です");
  for (let attempt = 0; attempt < 32; attempt += 1) {
    const seed = canonicalDungeonSeed(normalized, attempt);
    const mineCount = Math.max(
      1,
      Math.floor(
        normalized.width * normalized.height * difficulty.hazardDensity,
      ),
    );
    const baseField = generateMinefield({
      width: normalized.width,
      height: normalized.height,
      mineCount,
      safeRadius: difficulty.safeRadius,
      seed,
      startX: normalized.entrance.x,
      startY: normalized.entrance.y,
    });
    const hazardTypes = Object.keys(
      HAZARD_DEFINITIONS,
    ) as (keyof typeof HAZARD_DEFINITIONS)[];
    const rng = createRandom(`${seed}:hazards`);
    const hazards = baseField.tiles
      .filter((tile) => tile.hasMine)
      .map((tile) => {
        const type = hazardTypes[rng.int(0, hazardTypes.length - 1)];
        const definition = HAZARD_DEFINITIONS[type];
        return {
          id: createHazardId(tile, type),
          position: { x: tile.x, y: tile.y },
          type,
          state: "armed" as const,
          damage: definition.damage,
          statusEffect: definition.statusEffect,
          rewardTableId: `reward.hazard.${type}`,
          requiredToolTier: definition.requiredToolTier,
        };
      });
    const checkpointPosition = {
      x: normalized.width - 2,
      y: normalized.height - 2,
    };
    const candidates = baseField.tiles.filter(
      (tile) =>
        !tile.hasMine &&
        Math.max(
          Math.abs(tile.x - normalized.entrance.x),
          Math.abs(tile.y - normalized.entrance.y),
        ) > difficulty.safeRadius,
    );
    const takePosition = () => {
      const index = rng.int(0, Math.max(0, candidates.length - 1));
      const [tile] = candidates.splice(index, 1);
      return tile ? { x: tile.x, y: tile.y } : checkpointPosition;
    };
    const chestCount = rng.int(
      difficulty.chestCountRange[0],
      difficulty.chestCountRange[1],
    );
    const chestPositions = Array.from({ length: chestCount }, takePosition);
    const monsterCount = rng.int(
      difficulty.monsterCountRange[0],
      difficulty.monsterCountRange[1],
    );
    const monsterIds = getArea(input.areaId).monsterIds;
    const monsterSpawns = Array.from({ length: monsterCount }, (_, index) => ({
      id: monsterIds[index % monsterIds.length],
      ...takePosition(),
    }));
    const checkpoint = {
      id: `checkpoint.${input.areaId}.1`,
      position: checkpointPosition,
      status: "locked" as const,
      objectives: [
        { id: "reach", kind: "reach" as const, required: 1 as const },
      ],
      progress: { reach: 0 },
      isFinal: true,
    };
    const field = rebuildAdjacentHazardCounts(
      {
        ...baseField,
        tiles: baseField.tiles.map((tile) => {
          const hazard = hazards.find(
            (candidate) =>
              candidate.position.x === tile.x &&
              candidate.position.y === tile.y,
          );
          const isCheckpoint =
            tile.x === checkpointPosition.x && tile.y === checkpointPosition.y;
          return {
            ...tile,
            hazardId: hazard?.id,
            checkpointId: isCheckpoint ? checkpoint.id : undefined,
            terrain:
              tile.state === "blocked"
                ? ("blocked" as const)
                : tile.isWalkable
                  ? ("floor" as const)
                  : ("wall" as const),
            discovery: tile.isRevealed
              ? ("revealed" as const)
              : ("hidden" as const),
          };
        }),
      },
      hazards,
    );
    const dungeon: DungeonState = {
      config: {
        seed: input.seed,
        areaId: input.areaId,
        difficultyId: input.difficultyId,
        width: normalized.width,
        height: normalized.height,
        entrance: normalized.entrance,
        safeRadius: difficulty.safeRadius,
        checkpointCount: 1,
        generatorVersion: 1,
      },
      field,
      hazards,
      rooms: [
        {
          id: `room.${input.areaId}.entrance`,
          x: Math.max(0, normalized.entrance.x - 1),
          y: Math.max(0, normalized.entrance.y - 1),
          width: 3,
          height: 3,
        },
      ],
      chestPositions,
      monsterSpawns,
      checkpoints: [checkpoint],
      generationAttempt: attempt,
    };
    if (validator(dungeon).length === 0) return dungeon;
  }
  throw new Error("32回の試行で有効なダンジョンを生成できませんでした");
}
