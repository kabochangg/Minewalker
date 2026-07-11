import Phaser from "phaser";
import { AreaSelectScene } from "../game/scenes/AreaSelectScene";
import { BootScene } from "../game/scenes/BootScene";
import { CollectionScene } from "../game/scenes/CollectionScene";
import { ExplorationScene } from "../game/scenes/ExplorationScene";
import { HomeScene } from "../game/scenes/HomeScene";
import { LoadoutScene } from "../game/scenes/LoadoutScene";
import { PreloadScene } from "../game/scenes/PreloadScene";
import { ResultScene } from "../game/scenes/ResultScene";
import { SettingsScene } from "../game/scenes/SettingsScene";
import { TitleScene } from "../game/scenes/TitleScene";

export function createGame(): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: "game-root",
    backgroundColor: "#0b0f12",
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 390,
      height: 844
    },
    scene: [
      BootScene,
      PreloadScene,
      TitleScene,
      HomeScene,
      AreaSelectScene,
      LoadoutScene,
      ExplorationScene,
      ResultScene,
      CollectionScene,
      SettingsScene
    ]
  };

  return new Phaser.Game(config);
}
