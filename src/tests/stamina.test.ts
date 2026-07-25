import { describe, expect, it } from "vitest";
import {
  applyLocomotionCost,
  recoverStamina,
  spendStamina,
} from "../game/systems/StaminaSystem";

describe("StaminaSystem", () => {
  it("歩行は消費せず走行だけアクティブ時間に比例して消費する", () => {
    const state = { stamina: 10, maxStamina: 20 };
    expect(applyLocomotionCost(state, "walk", 1_000).state.stamina).toBe(10);
    expect(applyLocomotionCost(state, "run", 1_000).state.stamina).toBe(5);
  });

  it("不足時は走行を歩行へ戻して負数にしない", () => {
    const result = applyLocomotionCost(
      { stamina: 1, maxStamina: 20 },
      "run",
      1_000,
    );
    expect(result.locomotion).toBe("walk");
    expect(result.state.stamina).toBe(1);
  });

  it("アクティブ時だけ回復し最大値へclampする", () => {
    expect(
      recoverStamina({ stamina: 18, maxStamina: 20 }, 1_000, true).stamina,
    ).toBe(20);
    expect(
      recoverStamina({ stamina: 10, maxStamina: 20 }, 1_000, false).stamina,
    ).toBe(10);
  });

  it("固定コスト不足を拒否する", () => {
    expect(spendStamina({ stamina: 1, maxStamina: 10 }, 2)).toBeUndefined();
  });
});
