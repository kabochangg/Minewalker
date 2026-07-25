import { describe, expect, it } from "vitest";
import { buildRenderPatch } from "../game/presentation/RenderPatchBuilder";
import { createExplorationFixture } from "./fixtures/explorationFixtures";

describe("RenderPatchBuilder", () => {
  it("初回描画では全タイルとHUDを更新する", () => {
    const state = createExplorationFixture();
    const patch = buildRenderPatch(undefined, state, { revision: 1 });
    expect(patch.fullRebuild).toBe("initial");
    expect(patch.changedTiles).toHaveLength(state.dungeon.field.tiles.length);
    expect(patch.changedHudFields).toContain("hp");
  });

  it("移動ではタイルを再生成せずプレイヤーとカメラだけを更新する", () => {
    const previous = createExplorationFixture();
    const next = {
      ...previous,
      player: {
        ...previous.player,
        position: { x: 3.7, y: 3.5 },
      },
    };
    const patch = buildRenderPatch(previous, next, { revision: 2 });
    expect(patch.changedTiles).toEqual([]);
    expect(patch.playerChanged).toBe(true);
    expect(patch.cameraChanged).toBe(true);
    expect(patch.fullRebuild).toBeUndefined();
  });

  it("変更されたタイルだけを安定キーで通知する", () => {
    const previous = createExplorationFixture();
    const tiles = previous.dungeon.field.tiles.map((tile) =>
      tile.x === 0 && tile.y === 0 ? { ...tile, isRevealed: true } : tile,
    );
    const next = {
      ...previous,
      dungeon: {
        ...previous.dungeon,
        field: { ...previous.dungeon.field, tiles },
      },
    };
    expect(
      buildRenderPatch(previous, next, { revision: 3 }).changedTiles,
    ).toEqual(["0,0"]);
  });
});
