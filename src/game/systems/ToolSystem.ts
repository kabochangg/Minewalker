import { BALANCE } from "../../data/balance";
import type { ToolConditionComponent } from "../components/toolComponents";

/** 道具を正しく使用したときだけ耐久値を1減らす。 */
export function useTool(
  tool: ToolConditionComponent,
  correctUse: boolean,
  requiredTier = 1,
): ToolConditionComponent | undefined {
  if (tool.currentDurability <= 0 || tool.tier < requiredTier) return undefined;
  if (!correctUse) return tool;
  return {
    ...tool,
    currentDurability: Math.max(0, tool.currentDurability - 1),
  };
}

/** 拠点で道具を全回復し、必要コインを返す。 */
export function repairTool(tool: ToolConditionComponent): {
  readonly tool: ToolConditionComponent;
  readonly coinCost: number;
} {
  const missing = tool.maxDurability - tool.currentDurability;
  return {
    tool: {
      ...tool,
      currentDurability: tool.maxDurability,
      repairCount: tool.repairCount + (missing > 0 ? 1 : 0),
    },
    coinCost: missing * BALANCE.tool.repairCoinPerPoint,
  };
}

/** 道具Tierと最大耐久を1段階強化する。 */
export function upgradeTool(tool: ToolConditionComponent): {
  readonly tool: ToolConditionComponent;
  readonly coinCost: number;
} {
  const maxDurability = tool.maxDurability + BALANCE.tool.durabilityPerTier;
  return {
    tool: {
      ...tool,
      tier: tool.tier + 1,
      maxDurability,
      currentDurability: maxDurability,
    },
    coinCost: BALANCE.tool.upgradeCoinBase * tool.tier,
  };
}
