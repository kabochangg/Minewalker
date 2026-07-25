import { describe, expect, it } from "vitest";
import {
  getRouteState,
  restoreRouteState,
  setRouteState,
} from "../app/routeState";
import { createDefaultInputProfile } from "../game/components/toolComponents";
import { TransactionalMemoryStorage } from "./fixtures/TransactionalMemoryStorage";

describe("routeState", () => {
  it("エリア・難易度・入力・開始方式を保存して復元する", () => {
    const storage = new TransactionalMemoryStorage();
    setRouteState(
      {
        selectedAreaId: "area.crystalCave",
        selectedDifficulty: "hard",
        inputProfile: createDefaultInputProfile(),
        requestedStartMode: "continue",
      },
      storage,
    );
    expect(restoreRouteState(storage)).toEqual(getRouteState());
  });

  it("破損データでは現在の安全な状態を維持する", () => {
    const storage = new TransactionalMemoryStorage({
      "minewalker.route.v1": "{broken",
    });
    expect(restoreRouteState(storage)).toEqual(getRouteState());
  });
});
