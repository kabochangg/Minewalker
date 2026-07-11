import Phaser from "phaser";
import { addButton, addHudBar, addPanel, COLORS } from "./uiHelpers";

export class LoadoutScene extends Phaser.Scene {
  constructor() {
    super("LoadoutScene");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#0b0f12");
    addPanel(this, 195, 420, 360, 800);
    addHudBar(this, 100, 44, 140, 100, 100, COLORS.red, "HP");
    addHudBar(this, 100, 68, 140, 38, 50, COLORS.green, "ST");
    this.add.text(195, 118, "装備", { fontSize: "22px", color: COLORS.text, fontStyle: "bold" }).setOrigin(0.5);
    const equipment = [
      ["ツルハシ\n★1", 92, 190],
      ["武器\n★1", 195, 190],
      ["防具\n★1", 298, 190],
      ["冷却剤\n×3", 92, 320],
      ["解除装置\n×2", 195, 320],
      ["回復薬\n×3", 298, 320],
      ["バッグ\n23/40", 92, 450],
      ["ランタン\n×1", 195, 450],
      ["地図\n×1", 298, 450]
    ] as const;
    for (const [label, x, y] of equipment) {
      addButton(this, x, y, 92, 92, label, () => undefined);
    }
    addButton(this, 88, 790, 120, 52, "戻る", () => this.scene.start("AreaSelectScene"));
    addButton(this, 234, 790, 190, 62, "⛏ 出発", () => this.scene.start("ExplorationScene"), COLORS.green);
  }
}
