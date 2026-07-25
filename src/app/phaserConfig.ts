import Phaser from "phaser";
import { AreaSelectScene } from "../game/scenes/AreaSelectScene";
import { BootScene } from "../game/scenes/BootScene";
import { CollectionScene } from "../game/scenes/CollectionScene";
import { CraftingScene } from "../game/scenes/CraftingScene";
import { ExplorationScene } from "../game/scenes/ExplorationScene";
import { HomeScene } from "../game/scenes/HomeScene";
import { InventoryScene } from "../game/scenes/InventoryScene";
import { LoadoutScene } from "../game/scenes/LoadoutScene";
import { PreloadScene } from "../game/scenes/PreloadScene";
import { ResultScene } from "../game/scenes/ResultScene";
import { SettingsScene } from "../game/scenes/SettingsScene";
import { TitleScene } from "../game/scenes/TitleScene";
import { GameFontScenePlugin } from "../game/presentation/GameFontScenePlugin";

export function createGame(): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.CANVAS,
    parent: "game-root",
    backgroundColor: "#0a0f12",
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 390,
      height: 844,
    },
    plugins: {
      scene: [
        {
          key: "GameFontScenePlugin",
          plugin: GameFontScenePlugin,
          mapping: "gameFont",
        },
      ],
    },
    scene: [
      BootScene,
      PreloadScene,
      TitleScene,
      HomeScene,
      CraftingScene,
      InventoryScene,
      AreaSelectScene,
      LoadoutScene,
      ExplorationScene,
      ResultScene,
      CollectionScene,
      SettingsScene,
    ],
  };

  return new Phaser.Game(config);
}
