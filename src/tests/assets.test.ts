import { describe, expect, it } from "vitest";
import {
  ASSET_KEYS,
  IMAGE_ASSETS,
  getAssetMetadata,
  getMonsterAssetKey,
  getTileAssetKey,
} from "../assets/assetCatalog";

describe("asset catalog", () => {
  it("uses unique stable keys for every required production image", () => {
    const keys = IMAGE_ASSETS.map((asset) => asset.key);
    expect(keys).toHaveLength(31);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("maps typed monster and tile identifiers", () => {
    expect(getMonsterAssetKey("monster.mineKing")).toBe(
      ASSET_KEYS.monsters["monster.mineKing"],
    );
    expect(getTileAssetKey("crystalCave", "disabledMine")).toBe(
      ASSET_KEYS.tiles.crystalCave.disabledMine,
    );
  });

  it("declares frame, anchor, purpose, and fallback metadata", () => {
    expect(getAssetMetadata(ASSET_KEYS.playerWalk[2])).toEqual({
      kind: "character",
      frameSize: [64, 64],
      anchor: "bottomCenter",
      purpose: "playerWalk",
      fallbackLabel: "鉱夫",
    });
    expect(getAssetMetadata(ASSET_KEYS.tiles.beginnerMine.floor).anchor).toBe(
      "center",
    );
  });
});
