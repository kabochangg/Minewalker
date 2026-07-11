import Phaser from "phaser";
import { COLORS } from "./uiHelpers";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.background);
    this.scene.start("TitleScene");
  }
}
