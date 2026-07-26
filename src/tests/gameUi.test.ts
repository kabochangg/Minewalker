import { describe, expect, it, vi } from "vitest";
import {
  advanceTutorialStep,
  dispatchUiIntent,
  publishGameUiState,
  subscribeGameUiState,
  subscribeUiIntent,
  type GameUiState,
} from "../ui/gameUi";

describe("game UI contract", () => {
  it("publishes typed presentation state without mutating domain state", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeGameUiState(listener);
    const state: GameUiState = {
      screen: "exploration",
      exploration: {
        areaName: "初心者鉱山",
        depth: 2,
        maximumDepth: 10,
        hp: { current: 80, maximum: 100 },
        stamina: { current: 42, maximum: 50 },
        coins: 20,
        bagUsed: 3,
        bagCapacity: 30,
        toolDurability: 29,
        toolMaximumDurability: 30,
        selectedAction: "mine",
        running: false,
        message: "安全な壁を採掘",
        objectiveExpanded: false,
        tutorialStep: "read",
        coolants: 3,
        disablers: 2,
        potions: 3,
      },
    };

    publishGameUiState(state);

    expect(listener).toHaveBeenLastCalledWith(state);
    expect(state.exploration?.hp.current).toBe(80);
    unsubscribe();
  });

  it("normalizes DOM actions into typed UI intents", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeUiIntent(listener);

    dispatchUiIntent({ type: "selectExplorationAction", action: "cool" });
    dispatchUiIntent({ type: "toggleObjective" });

    expect(listener).toHaveBeenNthCalledWith(1, {
      type: "selectExplorationAction",
      action: "cool",
    });
    expect(listener).toHaveBeenNthCalledWith(2, { type: "toggleObjective" });
    unsubscribe();
  });

  it("advances contextual tutorial only after the matching player verb", () => {
    expect(advanceTutorialStep("move", "read")).toBe("move");
    expect(advanceTutorialStep("move", "move")).toBe("read");
    expect(advanceTutorialStep("read", "read")).toBe("mark");
    expect(advanceTutorialStep("mark", "mark")).toBe("treat");
    expect(advanceTutorialStep("treat", "treat")).toBe("complete");
  });
});
