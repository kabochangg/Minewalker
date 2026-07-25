import { describe, expect, it } from "vitest";
import { DIFFICULTIES, validateDifficulty } from "../data/difficulties";
import { resolveDifficulty } from "../game/systems/DifficultySystem";

describe("difficulty definitions", () => {
  it("easy・normal・hardの全定義が有効で段階的に難しくなる", () => {
    expect(Object.values(DIFFICULTIES).every(validateDifficulty)).toBe(true);
    expect(DIFFICULTIES.easy.hazardDensity).toBeLessThan(
      DIFFICULTIES.normal.hazardDensity,
    );
    expect(DIFFICULTIES.normal.hazardDensity).toBeLessThan(
      DIFFICULTIES.hard.hazardDensity,
    );
    expect(DIFFICULTIES.easy.rewardMultiplier).toBeLessThan(
      DIFFICULTIES.hard.rewardMultiplier,
    );
  });

  it("不正な範囲と密度を拒否する", () => {
    expect(
      validateDifficulty({
        ...DIFFICULTIES.normal,
        widthRange: [4, 3],
        hazardDensity: 1,
      }),
    ).toBe(false);
  });

  it("要求寸法を検証し難易度定義と共に返す", () => {
    expect(
      resolveDifficulty("normal", { width: 18, height: 28 }),
    ).toMatchObject({
      width: 18,
      height: 28,
    });
    expect(() => resolveDifficulty("easy", { width: 100 })).toThrow("範囲外");
  });
});
