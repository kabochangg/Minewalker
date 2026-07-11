import Phaser from "phaser";
import { AREAS } from "../../data/areas";
import { addButton, addHudBar, addPanel, COLORS } from "./uiHelpers";

export class AreaSelectScene extends Phaser.Scene {
  constructor() {
    super("AreaSelectScene");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#0b0f12");
    addPanel(this, 195, 420, 360, 800);
    addHudBar(this, 100, 44, 140, 100, 100, COLORS.red, "HP");
    addHudBar(this, 100, 68, 140, 38, 50, COLORS.green, "ST");
    addButton(this, 348, 62, 52, 52, "⚙", () => this.scene.start("SettingsScene"));
    this.add.text(195, 118, "探索先を選択してください", { fontSize: "19px", color: COLORS.text, fontStyle: "bold" }).setOrigin(0.5);

    AREAS.forEach((area, index) => {
      const y = 180 + index * 112;
      addPanel(this, 195, y, 326, 92);
      this.add.text(102, y - 20, area.name, { fontSize: "19px", color: COLORS.text, fontStyle: "bold" }).setOrigin(0, 0.5);
      this.add.text(102, y + 10, `消費スタミナ ${area.staminaCost} / 到達深度 ${area.maxDepth}階`, {
        fontSize: "13px",
        color: COLORS.muted
      });
      this.add.text(102, y + 34, "★".repeat(area.difficulty) + "☆".repeat(5 - area.difficulty), {
        fontSize: "16px",
        color: "#f5b83f"
      });
      const color = area.unlocked ? COLORS.green : 0x555555;
      addButton(
        this,
        288,
        y - 8,
        92,
        42,
        area.unlocked ? `推奨Lv.${area.recommendedLevel}` : "未解放",
        () => {
          if (area.unlocked) {
            this.scene.start("LoadoutScene");
          }
        },
        color
      );
    });

    addButton(this, 82, 790, 120, 52, "戻る", () => this.scene.start("TitleScene"));
  }
}
