import Phaser from "phaser";
import { ASSET_KEYS } from "../../assets/assetCatalog";
import { getGameState, setGameState } from "../state/GameState";
import { visualHash, VISUAL_TOKENS } from "../visual/VisualSystem";
import { addButton, addGameButton, COLORS, drawPixelMiner } from "./uiHelpers";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("TitleScene");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#101217");
    this.drawMineBackdrop();
    this.add
      .text(199, 154, "Minewalker", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "50px",
        fontStyle: "bold",
        color: "#4a260d",
      })
      .setOrigin(0.5);
    this.add
      .text(195, 150, "Minewalker", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "50px",
        fontStyle: "bold",
        color: "#ffb13b",
        stroke: "#1c1510",
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.add
      .text(195, 198, "マインウォーカー", {
        fontFamily: "sans-serif",
        fontSize: "22px",
        fontStyle: "bold",
        color: COLORS.text,
      })
      .setOrigin(0.5);
    if (this.textures.exists(ASSET_KEYS.player)) {
      this.add.image(195, 360, ASSET_KEYS.player).setDisplaySize(112, 112);
    } else {
      drawPixelMiner(this, 195, 360).setScale(2);
    }
    addGameButton(
      this,
      195,
      570,
      270,
      74,
      "プレイ",
      () => this.scene.start("AreaSelectScene"),
      { state: "selected", icon: "play" },
    );
    addGameButton(
      this,
      82,
      684,
      110,
      82,
      "ホーム",
      () => this.scene.start("HomeScene"),
      { icon: "home" },
    );
    addGameButton(
      this,
      195,
      684,
      110,
      82,
      "図鑑",
      () => this.scene.start("CollectionScene"),
      { icon: "collection" },
    );
    addGameButton(
      this,
      308,
      684,
      110,
      82,
      "設定",
      () => this.scene.start("SettingsScene"),
      { icon: "settings" },
    );
    addButton(
      this,
      96,
      794,
      150,
      48,
      "チュートリアル",
      () => this.showTutorial(),
      COLORS.panel,
    );
    this.add
      .text(320, 790, "v1.0.0", { fontSize: "14px", color: "#d7a15b" })
      .setOrigin(0.5);

    const state = getGameState();
    if (!state.settings.tutorialSeen) {
      this.showTutorial();
    }
  }

  private showTutorial(): void {
    const state = getGameState();
    setGameState({
      ...state,
      settings: { ...state.settings, tutorialSeen: true },
    });
    const overlay = this.add.rectangle(195, 422, 390, 844, 0x000000, 0.62);
    const panel = this.add
      .rectangle(195, 420, 315, 300, COLORS.panel, 0.98)
      .setStrokeStyle(2, COLORS.goldDark);
    this.add
      .text(195, 326, "遊び方", {
        fontSize: "24px",
        color: COLORS.text,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.add
      .text(
        195,
        420,
        "数字は周囲8マスの地雷数です。\n安全な壁を掘って進み、地雷候補は長押しでマーク。\n地雷は冷却または解除してから壊すと素材になります。",
        {
          fontSize: "15px",
          color: COLORS.text,
          align: "center",
          lineSpacing: 8,
          wordWrap: { width: 260 },
        },
      )
      .setOrigin(0.5);
    addButton(
      this,
      195,
      548,
      180,
      52,
      "OK",
      () => {
        overlay.destroy();
        panel.destroy();
        this.scene.restart();
      },
      COLORS.green,
    );
  }

  private drawMineBackdrop(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(VISUAL_TOKENS.colors.cave);
    graphics.fillRect(0, 0, 390, 844);
    for (let y = 0; y < 844; y += 32) {
      for (let x = 0; x < 390; x += 32) {
        const variant = visualHash(`title-cave:${x / 32}:${y / 32}:wall`) % 3;
        graphics.fillStyle([0x201b16, 0x292018, 0x33271d][variant]);
        graphics.fillRoundedRect(x + 1, y + 1, 30, 30, 7);
        graphics.fillStyle(0x735640, 0.18);
        graphics.fillCircle(x + 10 + variant * 4, y + 9, 4 + variant);
      }
    }
    graphics.fillStyle(0x0a0f12, 0.72);
    graphics.fillTriangle(55, 500, 195, 225, 335, 500);
    graphics.fillStyle(0xffb13b, 0.2);
    graphics.fillCircle(195, 350, 128);
    graphics.lineStyle(5, 0x735640, 0.9);
    graphics.lineBetween(80, 520, 174, 390);
    graphics.lineBetween(310, 520, 216, 390);
    graphics.lineStyle(3, 0x1c1510, 1);
    for (let y = 410; y <= 525; y += 24) {
      const spread = (y - 390) * 0.72;
      graphics.lineBetween(195 - spread, y, 195 + spread, y);
    }
  }
}
