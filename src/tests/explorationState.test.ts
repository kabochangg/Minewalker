import { describe, expect, it } from "vitest";
import { validateExplorationState } from "../game/state/ExplorationState";
import { createExplorationFixture } from "./fixtures/explorationFixtures";

describe("ExplorationState", () => {
  it("有効な状態と安定IDの関係を受理する", () => {
    expect(validateExplorationState(createExplorationFixture())).toEqual([]);
  });

  it("HP・スタミナ・容量の範囲違反を検出する", () => {
    const state = createExplorationFixture();
    const invalid = {
      ...state,
      player: { ...state.player, hp: 101, stamina: -1 },
      inventory: { ...state.inventory, capacity: 0 },
    };
    expect(validateExplorationState(invalid)).toHaveLength(3);
  });

  it("危険物とタイルの一対一関係違反を検出する", () => {
    const state = createExplorationFixture();
    const invalid = {
      ...state,
      dungeon: {
        ...state.dungeon,
        hazards: [
          {
            id: "hazard.0.0.explosive" as const,
            position: { x: 0, y: 0 },
            type: "explosive" as const,
            state: "armed" as const,
            damage: 25,
            rewardTableId: "reward.hazard.explosive",
            requiredToolTier: 1,
          },
        ],
      },
    };
    expect(validateExplorationState(invalid)).toContain(
      "危険物とタイルが一致しません: hazard.0.0.explosive",
    );
  });
});
