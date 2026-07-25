import { describe, expect, it } from "vitest";
import {
  createDeathTransition,
  recoverDeathCache,
} from "../game/systems/DeathRecoverySystem";
import { createSaveData } from "../save/SaveSystem";
import { createExplorationFixture } from "./fixtures/explorationFixtures";

describe("DeathRecoverySystem", () => {
  it("品目ごとに今回入手分の50%を切り上げて安定IDのcacheへ残す", () => {
    const state = createExplorationFixture();
    const exploration = {
      ...state,
      inventory: {
        ...state.inventory,
        items: { "item.stone": 5, "item.coal": 2 },
        acquiredThisRun: { "item.stone": 5, "item.coal": 2 },
      },
    };
    const transition = createDeathTransition(
      createSaveData(),
      exploration,
      "2026-01-01T00:00:00.000Z",
    );
    expect(transition.cache.id).toBe("death.1");
    expect(transition.cache.items).toEqual({ "item.stone": 3, "item.coal": 1 });
    expect(transition.exploration.inventory.items).toEqual({
      "item.stone": 2,
      "item.coal": 1,
    });
    expect(transition.exploration.player.gridPosition).toEqual(
      state.dungeon.config.entrance,
    );
  });

  it("複数cacheを保持し位置一致時だけ全量回収する", () => {
    const state = createExplorationFixture();
    const first = createDeathTransition(
      createSaveData(),
      {
        ...state,
        inventory: {
          ...state.inventory,
          items: { "item.stone": 2 },
          acquiredThisRun: { "item.stone": 2 },
        },
      },
      "2026-01-01T00:00:00.000Z",
    );
    const atCache = {
      ...first.exploration,
      status: "active" as const,
      player: {
        ...first.exploration.player,
        gridPosition: first.cache.position,
        position: {
          x: first.cache.position.x + 0.5,
          y: first.cache.position.y + 0.5,
        },
      },
    };
    const recovered = recoverDeathCache(
      first.persistent,
      atCache,
      first.cache.id,
    );
    expect(recovered?.exploration.inventory.items["item.stone"]).toBe(2);
    if (!recovered) throw new Error("death cache should be recoverable");
    expect(
      recoverDeathCache(
        recovered.persistent,
        recovered.exploration,
        first.cache.id,
      ),
    ).toBeUndefined();
  });

  it("容量不足では部分回収しない", () => {
    const state = createExplorationFixture();
    const first = createDeathTransition(
      createSaveData(),
      {
        ...state,
        inventory: {
          ...state.inventory,
          items: { "item.stone": 4 },
          acquiredThisRun: { "item.stone": 4 },
        },
      },
      "2026-01-01T00:00:00.000Z",
    );
    const full = {
      ...first.exploration,
      inventory: { ...first.exploration.inventory, capacity: 1 },
      player: {
        ...first.exploration.player,
        gridPosition: first.cache.position,
      },
    };
    expect(
      recoverDeathCache(first.persistent, full, first.cache.id),
    ).toBeUndefined();
  });

  it("探索素材が空でも装備だけのcacheを作る", () => {
    const transition = createDeathTransition(
      createSaveData(),
      createExplorationFixture(),
      "2026-01-01T00:00:00.000Z",
    );
    expect(transition.cache.items).toEqual({});
    expect(transition.cache.equipment).toHaveLength(3);
  });

  it("別の死亡では既存cacheを残して連番IDを作る", () => {
    const state = createExplorationFixture();
    const first = createDeathTransition(
      createSaveData(),
      state,
      "2026-01-01T00:00:00.000Z",
    );
    const second = createDeathTransition(
      first.persistent,
      { ...state, deathCaches: [first.cache] },
      "2026-01-02T00:00:00.000Z",
    );
    expect(second.cache.id).toBe("death.2");
    expect(second.persistent.deathCaches.map((cache) => cache.id)).toEqual([
      "death.1",
      "death.2",
    ]);
  });
});
