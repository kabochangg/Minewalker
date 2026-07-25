import { describe, expect, it } from "vitest";
import {
  evaluateCheckpoint,
  claimCheckpoint,
} from "../game/systems/CheckpointSystem";
import {
  calculateConnectedTerritory,
  expandTerritory,
} from "../game/systems/TerritorySystem";
import { generateMinefield } from "../game/systems/MinefieldSystem";

const checkpoint = {
  id: "checkpoint.test.1",
  position: { x: 2, y: 2 },
  status: "locked" as const,
  objectives: [
    { id: "reach", kind: "reach" as const, required: 1 as const },
    { id: "hazards", kind: "disposeHazards" as const, required: 2 },
    { id: "materials", kind: "collectMaterials" as const, required: 3 },
    {
      id: "boss",
      kind: "defeatBoss" as const,
      monsterId: "monster.mineKing",
      required: 1 as const,
    },
  ],
  progress: {},
  isFinal: true,
};

describe("Checkpoint and Territory", () => {
  it("複合条件と安全経路を満たしたときだけeligibleになる", () => {
    const eligible = evaluateCheckpoint(checkpoint, {
      reachedCheckpointIds: [checkpoint.id],
      disposedHazards: 2,
      acquiredItems: { "item.stone": 3 },
      defeatedMonsterIds: ["monster.mineKing"],
      hasSafeRoute: true,
    });
    expect(eligible.status).toBe("eligible");
    const claimed = claimCheckpoint(eligible, "territory.test");
    expect(claimed?.status).toBe("claimed");
    if (!claimed) throw new Error("checkpoint should be claimable");
    expect(claimCheckpoint(claimed, "territory.test")).toEqual(claimed);
  });

  it("孤立マスと角抜けを領域へ含めない", () => {
    const base = generateMinefield({
      width: 3,
      height: 3,
      mineCount: 0,
      safeRadius: 1,
      seed: "territory",
      startX: 0,
      startY: 0,
    });
    const field = {
      ...base,
      tiles: base.tiles.map((tile) =>
        (tile.x === 1 && tile.y === 0) || (tile.x === 0 && tile.y === 1)
          ? { ...tile, isWalkable: false, isRevealed: false }
          : tile,
      ),
    };
    expect(calculateConnectedTerritory(field, [{ x: 0, y: 0 }])).toEqual([
      "0,0",
    ]);
  });

  it("領域とcheckpoint IDを重複なく統合する", () => {
    const once = expandTerritory(
      "area.beginnerMine",
      "checkpoint.1",
      ["0,0"],
      undefined,
      "now",
    );
    const twice = expandTerritory(
      "area.beginnerMine",
      "checkpoint.1",
      ["0,0"],
      once,
      "later",
    );
    expect(twice.claimedCheckpointIds).toEqual(["checkpoint.1"]);
    expect(twice.tileKeys).toEqual(["0,0"]);
  });
});
