import Phaser from "phaser";
import { IMAGE_ASSETS } from "../../assets/assetCatalog";
import { COLORS } from "./uiHelpers";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload(): void {
    for (const asset of IMAGE_ASSETS) {
      this.load.image(asset.key, asset.url);
    }
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.background);
    this.scene.start("TitleScene");
  }
}
