import { BALANCE } from "../../data/balance";
import type { HazardComponent } from "../components/hazardComponents";
import type { ToolConditionComponent } from "../components/toolComponents";
import type { Minefield, Tile } from "../map/types";
import { replaceTile, tileKey } from "../map/types";
import type { StaminaState } from "./StaminaSystem";
import { spendStamina } from "./StaminaSystem";
import { useTool } from "./ToolSystem";

/** 危険物操作の結果を表す。 */
export interface HazardActionResult {
  readonly field: Minefield;
  readonly hazards: readonly HazardComponent[];
  readonly stamina: StaminaState;
  readonly tool: ToolConditionComponent;
  readonly accepted: boolean;
  readonly correct: boolean;
  readonly message: string;
  readonly hazard?: HazardComponent;
}

/** 未開放壁の危険マークを切り替える。 */
export function toggleDangerMark(
  field: Minefield,
  tile: Tile,
): { readonly field: Minefield; readonly accepted: boolean } {
  if (tile.isRevealed || tile.isWalkable || tile.state === "blocked") {
    return { field, accepted: false };
  }
  return {
    field: replaceTile(field, {
      ...tile,
      mark: tile.mark === "flag" ? "none" : "flag",
    }),
    accepted: true,
  };
}

/** マーク済み壁へ危険物処理を行う。誤処理では耐久を減らさない。 */
export function disposeHazard(
  field: Minefield,
  hazards: readonly HazardComponent[],
  tile: Tile,
  stamina: StaminaState,
  tool: ToolConditionComponent,
): HazardActionResult {
  if (tile.mark !== "flag") {
    return rejected(field, hazards, stamina, tool, "危険マークが必要です");
  }
  const spent = spendStamina(stamina, BALANCE.hazard.disposalStaminaCost);
  if (!spent)
    return rejected(field, hazards, stamina, tool, "スタミナが足りません");
  const hazard = hazards.find(
    (candidate) =>
      candidate.id === tile.hazardId && candidate.state === "armed",
  );
  if (!hazard) {
    return {
      field,
      hazards,
      stamina: spent,
      tool,
      accepted: true,
      correct: false,
      message: "危険物はありませんでした",
    };
  }
  const nextTool = useTool(tool, true, hazard.requiredToolTier);
  if (!nextTool) {
    return rejected(field, hazards, stamina, tool, "道具を使用できません");
  }
  const disposed = { ...hazard, state: "disposed" as const };
  const nextHazards = hazards.map((candidate) =>
    candidate.id === disposed.id ? disposed : candidate,
  );
  return {
    field: rebuildAdjacentHazardCounts(
      replaceTile(field, { ...tile, mark: "none" }),
      nextHazards,
    ),
    hazards: nextHazards,
    stamina: spent,
    tool: nextTool,
    accepted: true,
    correct: true,
    message: "危険物を安全に処理しました",
    hazard: disposed,
  };
}

/** armed危険物を作動済みにして周囲数字を再構築する。 */
export function triggerHazard(
  field: Minefield,
  hazards: readonly HazardComponent[],
  hazardId: string,
): { readonly field: Minefield; readonly hazards: readonly HazardComponent[] } {
  const nextHazards = hazards.map((hazard) =>
    hazard.id === hazardId && hazard.state === "armed"
      ? { ...hazard, state: "triggered" as const }
      : hazard,
  );
  return {
    field: rebuildAdjacentHazardCounts(field, nextHazards),
    hazards: nextHazards,
  };
}

/** armed危険物だけを数え、全タイルの周囲数字を再計算する。 */
export function rebuildAdjacentHazardCounts(
  field: Minefield,
  hazards: readonly HazardComponent[],
): Minefield {
  const armed = new Set(
    hazards
      .filter((hazard) => hazard.state === "armed")
      .map((hazard) => tileKey(hazard.position.x, hazard.position.y)),
  );
  return {
    ...field,
    tiles: field.tiles.map((tile) => {
      let count = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (
            (dx !== 0 || dy !== 0) &&
            armed.has(tileKey(tile.x + dx, tile.y + dy))
          )
            count += 1;
        }
      }
      return { ...tile, adjacentMineCount: count, adjacentHazardCount: count };
    }),
  };
}

function rejected(
  field: Minefield,
  hazards: readonly HazardComponent[],
  stamina: StaminaState,
  tool: ToolConditionComponent,
  message: string,
): HazardActionResult {
  return {
    field,
    hazards,
    stamina,
    tool,
    accepted: false,
    correct: false,
    message,
  };
}
