import { describe, expect, it } from "vitest";
import { repairTool, upgradeTool, useTool } from "../game/systems/ToolSystem";

const tool = {
  equipmentId: "equipment.pickaxe.wood" as const,
  currentDurability: 2,
  maxDurability: 5,
  tier: 1,
  repairCount: 0,
};

describe("ToolSystem", () => {
  it("正しい処理だけ耐久を減らす", () => {
    expect(useTool(tool, true)?.currentDurability).toBe(1);
    expect(useTool(tool, false)).toEqual(tool);
  });

  it("破損とTier不足を拒否する", () => {
    expect(useTool({ ...tool, currentDurability: 0 }, true)).toBeUndefined();
    expect(useTool(tool, true, 2)).toBeUndefined();
  });

  it("修理と強化を新しい状態として返す", () => {
    expect(repairTool(tool).tool).toMatchObject({
      currentDurability: 5,
      repairCount: 1,
    });
    expect(upgradeTool(tool).tool).toMatchObject({
      tier: 2,
      maxDurability: 15,
      currentDurability: 15,
    });
  });
});
