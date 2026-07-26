import type { AreaDefinition } from "../data/areas";
import type { MonsterId } from "../data/monsters";

import playerMinerUrl from "./sprites/player-miner.png";
import playerMinerWalk01Url from "./sprites/player-miner-walk/player-miner-walk-01.png";
import playerMinerWalk02Url from "./sprites/player-miner-walk/player-miner-walk-02.png";
import playerMinerWalk03Url from "./sprites/player-miner-walk/player-miner-walk-03.png";
import playerMinerWalk04Url from "./sprites/player-miner-walk/player-miner-walk-04.png";
import ancientGuardianUrl from "./sprites/monster-ancient-guardian.png";
import batUrl from "./sprites/monster-bat.png";
import flameSlimeUrl from "./sprites/monster-flame-slime.png";
import mineKingUrl from "./sprites/monster-mine-king.png";
import rockGolemUrl from "./sprites/monster-rock-golem.png";
import slimeUrl from "./sprites/monster-slime.png";

import ancientDisabledUrl from "./tiles/ancient-site-disabled-mine.png";
import ancientExitUrl from "./tiles/ancient-site-exit.png";
import ancientFloorUrl from "./tiles/ancient-site-floor.png";
import ancientMineUrl from "./tiles/ancient-site-mine.png";
import ancientWallUrl from "./tiles/ancient-site-wall.png";
import beginnerDisabledUrl from "./tiles/beginner-mine-disabled-mine.png";
import beginnerExitUrl from "./tiles/beginner-mine-exit.png";
import beginnerFloorUrl from "./tiles/beginner-mine-floor.png";
import beginnerMineUrl from "./tiles/beginner-mine-mine.png";
import beginnerWallUrl from "./tiles/beginner-mine-wall.png";
import crystalDisabledUrl from "./tiles/crystal-cave-disabled-mine.png";
import crystalExitUrl from "./tiles/crystal-cave-exit.png";
import crystalFloorUrl from "./tiles/crystal-cave-floor.png";
import crystalMineUrl from "./tiles/crystal-cave-mine.png";
import crystalWallUrl from "./tiles/crystal-cave-wall.png";
import volcanoDisabledUrl from "./tiles/volcano-mine-disabled-mine.png";
import volcanoExitUrl from "./tiles/volcano-mine-exit.png";
import volcanoFloorUrl from "./tiles/volcano-mine-floor.png";
import volcanoMineUrl from "./tiles/volcano-mine-mine.png";
import volcanoWallUrl from "./tiles/volcano-mine-wall.png";

export const ASSET_KEYS = {
  player: "sprite.playerMiner",
  playerWalk: [
    "sprite.playerMiner.walk.01",
    "sprite.playerMiner.walk.02",
    "sprite.playerMiner.walk.03",
    "sprite.playerMiner.walk.04",
  ],
  monsters: {
    "monster.slime": "sprite.monster.slime",
    "monster.bat": "sprite.monster.bat",
    "monster.rockGolem": "sprite.monster.rockGolem",
    "monster.flameSlime": "sprite.monster.flameSlime",
    "monster.ancientGuardian": "sprite.monster.ancientGuardian",
    "monster.mineKing": "sprite.monster.mineKing",
  },
  tiles: {
    beginnerMine: {
      floor: "tile.beginnerMine.floor",
      wall: "tile.beginnerMine.wall",
      mine: "tile.beginnerMine.mine",
      disabledMine: "tile.beginnerMine.disabledMine",
      exit: "tile.beginnerMine.exit",
    },
    crystalCave: {
      floor: "tile.crystalCave.floor",
      wall: "tile.crystalCave.wall",
      mine: "tile.crystalCave.mine",
      disabledMine: "tile.crystalCave.disabledMine",
      exit: "tile.crystalCave.exit",
    },
    volcanoMine: {
      floor: "tile.volcanoMine.floor",
      wall: "tile.volcanoMine.wall",
      mine: "tile.volcanoMine.mine",
      disabledMine: "tile.volcanoMine.disabledMine",
      exit: "tile.volcanoMine.exit",
    },
    ancientSite: {
      floor: "tile.ancientSite.floor",
      wall: "tile.ancientSite.wall",
      mine: "tile.ancientSite.mine",
      disabledMine: "tile.ancientSite.disabledMine",
      exit: "tile.ancientSite.exit",
    },
  },
} as const;

type TileTheme = AreaDefinition["theme"];
export type TileVisual = "floor" | "wall" | "mine" | "disabledMine" | "exit";

export const IMAGE_ASSETS: readonly {
  readonly key: string;
  readonly url: string;
}[] = [
  { key: ASSET_KEYS.player, url: playerMinerUrl },
  { key: ASSET_KEYS.playerWalk[0], url: playerMinerWalk01Url },
  { key: ASSET_KEYS.playerWalk[1], url: playerMinerWalk02Url },
  { key: ASSET_KEYS.playerWalk[2], url: playerMinerWalk03Url },
  { key: ASSET_KEYS.playerWalk[3], url: playerMinerWalk04Url },
  { key: ASSET_KEYS.monsters["monster.slime"], url: slimeUrl },
  { key: ASSET_KEYS.monsters["monster.bat"], url: batUrl },
  { key: ASSET_KEYS.monsters["monster.rockGolem"], url: rockGolemUrl },
  { key: ASSET_KEYS.monsters["monster.flameSlime"], url: flameSlimeUrl },
  {
    key: ASSET_KEYS.monsters["monster.ancientGuardian"],
    url: ancientGuardianUrl,
  },
  { key: ASSET_KEYS.monsters["monster.mineKing"], url: mineKingUrl },
  { key: ASSET_KEYS.tiles.beginnerMine.floor, url: beginnerFloorUrl },
  { key: ASSET_KEYS.tiles.beginnerMine.wall, url: beginnerWallUrl },
  { key: ASSET_KEYS.tiles.beginnerMine.mine, url: beginnerMineUrl },
  { key: ASSET_KEYS.tiles.beginnerMine.disabledMine, url: beginnerDisabledUrl },
  { key: ASSET_KEYS.tiles.beginnerMine.exit, url: beginnerExitUrl },
  { key: ASSET_KEYS.tiles.crystalCave.floor, url: crystalFloorUrl },
  { key: ASSET_KEYS.tiles.crystalCave.wall, url: crystalWallUrl },
  { key: ASSET_KEYS.tiles.crystalCave.mine, url: crystalMineUrl },
  { key: ASSET_KEYS.tiles.crystalCave.disabledMine, url: crystalDisabledUrl },
  { key: ASSET_KEYS.tiles.crystalCave.exit, url: crystalExitUrl },
  { key: ASSET_KEYS.tiles.volcanoMine.floor, url: volcanoFloorUrl },
  { key: ASSET_KEYS.tiles.volcanoMine.wall, url: volcanoWallUrl },
  { key: ASSET_KEYS.tiles.volcanoMine.mine, url: volcanoMineUrl },
  { key: ASSET_KEYS.tiles.volcanoMine.disabledMine, url: volcanoDisabledUrl },
  { key: ASSET_KEYS.tiles.volcanoMine.exit, url: volcanoExitUrl },
  { key: ASSET_KEYS.tiles.ancientSite.floor, url: ancientFloorUrl },
  { key: ASSET_KEYS.tiles.ancientSite.wall, url: ancientWallUrl },
  { key: ASSET_KEYS.tiles.ancientSite.mine, url: ancientMineUrl },
  { key: ASSET_KEYS.tiles.ancientSite.disabledMine, url: ancientDisabledUrl },
  { key: ASSET_KEYS.tiles.ancientSite.exit, url: ancientExitUrl },
];

export interface AssetMetadata {
  readonly kind: "character" | "monster" | "tile";
  readonly frameSize: readonly [number, number];
  readonly anchor: "bottomCenter" | "center";
  readonly purpose: string;
  readonly fallbackLabel: string;
}

export function getAssetMetadata(key: string): AssetMetadata {
  if (
    key === ASSET_KEYS.player ||
    ASSET_KEYS.playerWalk.some((candidate) => candidate === key)
  ) {
    return {
      kind: "character",
      frameSize: [64, 64],
      anchor: "bottomCenter",
      purpose: key === ASSET_KEYS.player ? "playerIdle" : "playerWalk",
      fallbackLabel: "鉱夫",
    };
  }
  if (
    Object.values(ASSET_KEYS.monsters).some((candidate) => candidate === key)
  ) {
    return {
      kind: "monster",
      frameSize: [64, 64],
      anchor: "bottomCenter",
      purpose: "monster",
      fallbackLabel: "モンスター",
    };
  }
  if (
    Object.values(ASSET_KEYS.tiles).some((theme) =>
      Object.values(theme).some((candidate) => candidate === key),
    )
  ) {
    return {
      kind: "tile",
      frameSize: [32, 32],
      anchor: "center",
      purpose: "dungeonTile",
      fallbackLabel: "地形",
    };
  }
  throw new Error(`Unknown asset key: ${key}`);
}

export function getMonsterAssetKey(id: MonsterId): string {
  return ASSET_KEYS.monsters[id];
}

export function getTileAssetKey(theme: TileTheme, visual: TileVisual): string {
  return ASSET_KEYS.tiles[theme][visual];
}
