import Phaser from "phaser";
import { addButton, addPanel, COLORS } from "./uiHelpers";

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super("SettingsScene");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#0b0f12");
    addPanel(this, 195, 420, 350, 760);
    this.add.text(195, 150, "設定", { fontSize: "28px", color: COLORS.text, fontStyle: "bold" }).setOrigin(0.5);
    addButton(this, 195, 250, 240, 58, "サウンド ON", () => undefined);
    addButton(this, 195, 330, 240, 58, "振動 ON", () => undefined);
    addButton(this, 195, 410, 240, 58, "長押し 標準", () => undefined);
    addButton(this, 195, 760, 160, 56, "戻る", () => this.scene.start("TitleScene"));
  }
}
