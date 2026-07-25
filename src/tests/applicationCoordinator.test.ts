import { describe, expect, it } from "vitest";
import { ExplorationCoordinator } from "../game/application/ExplorationCoordinator";
import { createSaveData } from "../save/SaveSystem";
import { createExplorationFixture } from "./fixtures/explorationFixtures";
import { TransactionalMemoryStorage } from "./fixtures/TransactionalMemoryStorage";

describe("ExplorationCoordinator", () => {
  it("コマンド結果を確定後に公開しイベント順を保持する", () => {
    const coordinator = new ExplorationCoordinator(createExplorationFixture());
    const published: string[] = [];
    coordinator.subscribe((events) =>
      published.push(...events.map((event) => event.type)),
    );
    const result = coordinator.dispatch({
      type: "move",
      direction: { x: 1, y: 0 },
      elapsedMs: 50,
      locomotion: "walk",
    });
    expect(result.accepted).toBe(true);
    expect(published).toEqual(["playerMoved"]);
    expect(coordinator.state).toBe(result.state);
  });

  it("shutdown後のコマンドを拒否する", () => {
    const coordinator = new ExplorationCoordinator(createExplorationFixture());
    coordinator.shutdown();
    expect(
      coordinator.dispatch({ type: "tick", elapsedActiveMs: 100 }).accepted,
    ).toBe(false);
  });

  it("checkpoint確保を保存成功後だけ公開する", () => {
    const initial = createExplorationFixture();
    const eligible = {
      ...initial,
      checkpoints: initial.checkpoints.map((checkpoint) => ({
        ...checkpoint,
        status: "eligible" as const,
      })),
      dungeon: {
        ...initial.dungeon,
        checkpoints: initial.dungeon.checkpoints.map((checkpoint) => ({
          ...checkpoint,
          status: "eligible" as const,
        })),
      },
    };
    const storage = new TransactionalMemoryStorage();
    const coordinator = new ExplorationCoordinator(eligible, {
      persistent: createSaveData(),
      storage,
    });
    const result = coordinator.dispatch({
      type: "claimCheckpoint",
      checkpointId: eligible.checkpoints[0].id,
    });
    expect(result.accepted).toBe(true);
    expect(result.events[0]?.type).toBe("checkpointClaimed");
    expect(storage.getItem("minewalker.save.v3")).not.toBeNull();
  });

  it("journal後の保存失敗でrecoveryRequiredとなり以後の入力を止める", () => {
    const initial = createExplorationFixture();
    const eligible = {
      ...initial,
      checkpoints: initial.checkpoints.map((checkpoint) => ({
        ...checkpoint,
        status: "eligible" as const,
      })),
      dungeon: {
        ...initial.dungeon,
        checkpoints: initial.dungeon.checkpoints.map((checkpoint) => ({
          ...checkpoint,
          status: "eligible" as const,
        })),
      },
    };
    const storage = new TransactionalMemoryStorage({}, 2);
    const coordinator = new ExplorationCoordinator(eligible, {
      persistent: createSaveData(),
      storage,
    });
    expect(
      coordinator.dispatch({
        type: "claimCheckpoint",
        checkpointId: eligible.checkpoints[0].id,
      }).accepted,
    ).toBe(false);
    expect(coordinator.recoveryRequired).toBe(true);
    expect(
      coordinator.dispatch({ type: "tick", elapsedActiveMs: 100 }).reason,
    ).toContain("復旧中");
  });
});
