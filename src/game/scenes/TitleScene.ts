import Phaser from "phaser";
import { addButton, COLORS, drawPixelMiner } from "./uiHelpers";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("TitleScene");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#101217");
    this.drawMineBackdrop();
    this.add
      .text(195, 150, "Minewalker", {
        fontFamily: "sans-serif",
        fontSize: "50px",
        fontStyle: "bold",
        color: "#ffb13b",
        stroke: "#3a1d08",
        strokeThickness: 7
      })
      .setOrigin(0.5);
    this.add
      .text(195, 198, "マインウォーカー", {
        fontFamily: "sans-serif",
        fontSize: "22px",
        fontStyle: "bold",
        color: COLORS.text
      })
      .setOrigin(0.5);
    drawPixelMiner(this, 195, 360).setScale(2);
    addButton(this, 195, 570, 270, 74, "⛏ プレイ", () => this.scene.start("AreaSelectScene"), COLORS.goldDark);
    addButton(this, 82, 684, 110, 82, "ホーム", () => this.scene.start("HomeScene"));
    addButton(this, 195, 684, 110, 82, "図鑑", () => this.scene.start("CollectionScene"));
    addButton(this, 308, 684, 110, 82, "設定", () => this.scene.start("SettingsScene"));
    addButton(this, 96, 794, 150, 48, "お知らせ", () => undefined, COLORS.panel);
    this.add.text(320, 790, "v0.1.0", { fontSize: "16px", color: "#d7a15b" }).setOrigin(0.5);
  }

  private drawMineBackdrop(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x17120e);
    graphics.fillRect(0, 0, 390, 844);
    for (let y = 0; y < 844; y += 32) {
      for (let x = 0; x < 390; x += 32) {
        const shade = Phaser.Math.Between(20, 42);
        graphics.fillStyle((shade << 16) + (shade << 8) + shade);
        graphics.fillRect(x + 1, y + 1, 30, 30);
      }
    }
    graphics.fillStyle(0x4a2f17, 0.9);
    graphics.fillRect(70, 260, 250, 34);
    graphics.fillRect(88, 250, 22, 150);
    graphics.fillRect(280, 250, 22, 150);
    graphics.fillStyle(0xffb13b, 0.25);
    graphics.fillCircle(250, 320, 90);
  }
}
