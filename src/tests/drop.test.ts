import { describe, expect, it } from "vitest";
import { rollSourceDrop } from "../game/systems/DropSystem";

const entries = [{ itemId: "item.stone" as const, weight: 1, min: 2, max: 2 }];

describe("DropSystem source rewards", () => {
  it.each(["wall", "hazard", "chest", "monster"] as const)(
    "%s報酬を同一seedから決定的に返す",
    (source) => {
      expect(rollSourceDrop(source, "same", entries)).toEqual(
        rollSourceDrop(source, "same", entries),
      );
    },
  );

  it("危険物と難易度倍率を個数へ反映する", () => {
    expect(rollSourceDrop("wall", "reward", entries, 1)?.amount).toBe(2);
    expect(rollSourceDrop("hazard", "reward", entries, 1)?.amount).toBe(3);
    expect(rollSourceDrop("wall", "reward", entries, 1.5)?.amount).toBe(3);
  });

  it("空報酬表は何も返さない", () => {
    expect(rollSourceDrop("chest", "empty", [])).toBeUndefined();
  });
});
