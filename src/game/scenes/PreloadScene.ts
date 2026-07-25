import Phaser from "phaser";
import { IMAGE_ASSETS } from "../../assets/assetCatalog";
import { loadGameFonts } from "../../assets/fontCatalog";
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
    void this.startAfterFontsLoad();
  }

  /** 日本語フォントの準備後にタイトル画面へ遷移する。 */
  private async startAfterFontsLoad(): Promise<void> {
    const loaded = await loadGameFonts();
    this.registry.set("fontStatus", {
      loaded,
      family: "MinewalkerJP",
    });
    this.scene.start("TitleScene");
  }
}
