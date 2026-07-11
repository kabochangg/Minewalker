import Phaser from "phaser";
import { addButton, addPanel, COLORS } from "./uiHelpers";

export class CollectionScene extends Phaser.Scene {
  constructor() {
    super("CollectionScene");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#0b0f12");
    addPanel(this, 195, 420, 350, 760);
    this.add.text(195, 160, "コレクション", { fontSize: "28px", color: COLORS.text, fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(195, 260, "縦切り版では探索結果の素材を確認できます", {
      fontSize: "16px",
      color: COLORS.muted,
      align: "center",
      wordWrap: { width: 290 }
    }).setOrigin(0.5);
    addButton(this, 195, 760, 160, 56, "戻る", () => this.scene.start("TitleScene"));
  }
}
