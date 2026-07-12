import { describe, expect, it } from "vitest";
import {
  ASSET_KEYS,
  IMAGE_ASSETS,
  getMonsterAssetKey,
  getTileAssetKey,
} from "../assets/assetCatalog";

describe("asset catalog", () => {
  it("uses unique stable keys for every required production image", () => {
    const keys = IMAGE_ASSETS.map((asset) => asset.key);
    expect(keys).toHaveLength(27);
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
});
