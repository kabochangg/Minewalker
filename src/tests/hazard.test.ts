import { describe, expect, it } from "vitest";
import { createHazardId } from "../game/components/hazardComponents";
import {
  disposeHazard,
  rebuildAdjacentHazardCounts,
  toggleDangerMark,
  triggerHazard,
} from "../game/systems/HazardSystem";
import { generateMinefield } from "../game/systems/MinefieldSystem";
import { getTile } from "../game/map/types";

function fixture() {
  const base = generateMinefield({
    width: 5,
    height: 5,
    mineCount: 0,
    safeRadius: 1,
    seed: "hazard",
    startX: 2,
    startY: 2,
  });
  const id = createHazardId({ x: 0, y: 0 }, "explosive");
  const field = {
    ...base,
    tiles: base.tiles.map((tile) =>
      tile.x === 0 && tile.y === 0
        ? {
            ...tile,
            hasMine: true,
            hazardId: id,
            state: "mineWall" as const,
            mark: "flag" as const,
          }
        : tile,
    ),
  };
  return {
    field,
    hazards: [
      {
        id,
        position: { x: 0, y: 0 },
        type: "explosive" as const,
        state: "armed" as const,
        damage: 25,
        rewardTableId: "reward.hazard.explosive",
        requiredToolTier: 1,
      },
    ],
    tool: {
      equipmentId: "equipment.pickaxe.wood" as const,
      currentDurability: 2,
      maxDurability: 2,
      tier: 1,
      repairCount: 0,
    },
  };
}

describe("HazardSystem", () => {
  it("角・中央・端の周囲8マスだけarmed危険物を数える", () => {
    const data = fixture();
    const rebuilt = rebuildAdjacentHazardCounts(data.field, data.hazards);
    expect(getTile(rebuilt, 1, 1)?.adjacentHazardCount).toBe(1);
    expect(getTile(rebuilt, 2, 2)?.adjacentHazardCount).toBe(0);
  });

  it("中央の複数危険物と0件マスを正確に数える", () => {
    const data = fixture();
    const second = {
      ...data.hazards[0],
      id: createHazardId({ x: 2, y: 1 }, "gas"),
      position: { x: 2, y: 1 },
      type: "gas" as const,
    };
    const field = {
      ...data.field,
      tiles: data.field.tiles.map((tile) =>
        tile.x === 2 && tile.y === 1
          ? { ...tile, hazardId: second.id, hasMine: true }
          : tile,
      ),
    };
    const rebuilt = rebuildAdjacentHazardCounts(field, [
      ...data.hazards,
      second,
    ]);
    expect(getTile(rebuilt, 1, 1)?.adjacentHazardCount).toBe(2);
    expect(getTile(rebuilt, 4, 4)?.adjacentHazardCount).toBe(0);
  });

  it("正しい処理でdisposedとなり数字と耐久を更新する", () => {
    const data = fixture();
    const tile = getTile(data.field, 0, 0);
    if (!tile) throw new Error("hazard tile should exist");
    const result = disposeHazard(
      data.field,
      data.hazards,
      tile,
      { stamina: 10, maxStamina: 10 },
      data.tool,
    );
    expect(result.correct).toBe(true);
    expect(result.hazards[0].state).toBe("disposed");
    expect(result.tool.currentDurability).toBe(1);
    expect(getTile(result.field, 1, 1)?.adjacentHazardCount).toBe(0);
  });

  it("誤処理はスタミナだけを消費する", () => {
    const data = fixture();
    const emptyTile = getTile(data.field, 4, 4);
    if (!emptyTile) throw new Error("empty tile should exist");
    const empty = { ...emptyTile, mark: "flag" as const };
    const result = disposeHazard(
      data.field,
      data.hazards,
      empty,
      { stamina: 10, maxStamina: 10 },
      data.tool,
    );
    expect(result.correct).toBe(false);
    expect(result.stamina.stamina).toBe(8);
    expect(result.tool).toEqual(data.tool);
  });

  it("危険マークを切替え、作動済み危険物を再作動させない", () => {
    const data = fixture();
    const tile = getTile(data.field, 0, 0);
    if (!tile) throw new Error("hazard tile should exist");
    expect(toggleDangerMark(data.field, tile).accepted).toBe(true);
    const once = triggerHazard(data.field, data.hazards, data.hazards[0].id);
    const twice = triggerHazard(once.field, once.hazards, data.hazards[0].id);
    expect(twice.hazards[0].state).toBe("triggered");
  });
});
