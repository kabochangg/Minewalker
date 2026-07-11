import Phaser from "phaser";
import { addButton, addHudBar, addPanel, COLORS, drawPixelMiner } from "./uiHelpers";

export class HomeScene extends Phaser.Scene {
  constructor() {
    super("HomeScene");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#0b0f12");
    addPanel(this, 195, 420, 360, 800);
    addHudBar(this, 100, 44, 140, 100, 100, COLORS.red, "HP");
    addHudBar(this, 100, 68, 140, 38, 50, COLORS.green, "ST");
    this.add.text(242, 44, "🪙 12,345", { fontSize: "16px", color: COLORS.text }).setOrigin(0.5);
    this.add.text(316, 44, "🎒 23/40", { fontSize: "16px", color: COLORS.text }).setOrigin(0.5);
    addButton(this, 348, 70, 52, 52, "⚙", () => this.scene.start("SettingsScene"));
    this.drawHomeMine();
    drawPixelMiner(this, 190, 245).setScale(1.4);
    this.add.text(85, 160, "鉱夫たろう\nLv.12\n拠点Lv.4", { fontSize: "16px", color: COLORS.text, align: "center" }).setOrigin(0.5);
    const buttons = [
      ["拠点強化", 90, 390],
      ["武器強化", 195, 390],
      ["防具強化", 300, 390],
      ["クラフト", 90, 485],
      ["アイテム整理", 195, 485],
      ["探索へ", 285, 485]
    ] as const;
    for (const [label, x, y] of buttons) {
      addButton(this, x, y, label === "探索へ" ? 146 : 94, 74, label, () => {
        if (label === "探索へ") {
          this.scene.start("AreaSelectScene");
        }
      });
    }
    addButton(this, 62, 780, 70, 58, "ホーム", () => undefined, COLORS.goldDark);
    addButton(this, 145, 780, 70, 58, "探索", () => this.scene.start("AreaSelectScene"));
    addButton(this, 228, 780, 70, 58, "持ち物", () => undefined);
    addButton(this, 311, 780, 70, 58, "その他", () => this.scene.start("SettingsScene"));
  }

  private drawHomeMine(): void {
    const g = this.add.graphics();
    g.fillStyle(0x15110d);
    g.fillRect(32, 100, 326, 220);
    g.fillStyle(0x2a1b10);
    g.fillRect(120, 150, 140, 110);
    g.fillStyle(0x3e2916);
    g.fillTriangle(110, 150, 190, 92, 270, 150);
    g.fillStyle(0xffb13b, 0.75);
    g.fillCircle(205, 190, 35);
    g.fillStyle(0x365f8f);
    g.fillTriangle(300, 225, 320, 170, 340, 225);
  }
}
