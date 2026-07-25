import Phaser from "phaser";
import { getRouteState, setRouteState } from "../../app/routeState";
import { ASSET_KEYS } from "../../assets/assetCatalog";
import { clearRun, loadRun } from "../../save/RunSaveSystem";
import { resetGamePreservingPreferences } from "../../save/SaveSystem";
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
      "ゲーム開始",
      () => this.showStartMenu(),
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

  private showStartMenu(): void {
    const interrupted = loadRun();
    const overlay = this.add.rectangle(195, 422, 390, 844, 0x000000, 0.72);
    const panel = this.add
      .rectangle(195, 430, 320, 270, COLORS.panel, 0.99)
      .setStrokeStyle(2, COLORS.goldDark);
    const title = this.add
      .text(195, 338, "探索を始める", {
        fontSize: "24px",
        color: COLORS.text,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    const continueButton = addGameButton(
      this,
      195,
      412,
      240,
      58,
      interrupted ? "つづきから" : "つづきから（データなし）",
      () => {
        if (interrupted) {
          setRouteState({
            ...getRouteState(),
            requestedStartMode: "continue",
          });
          this.scene.start("AreaSelectScene");
        }
      },
      { state: interrupted ? "success" : "normal", icon: "play" },
    );
    const newButton = addGameButton(
      this,
      195,
      482,
      240,
      58,
      "はじめから",
      () => this.confirmNewGame(),
      { state: "selected", icon: "pickaxe" },
    );
    const closeButton = addButton(this, 195, 548, 140, 44, "閉じる", () => {
      [overlay, panel, title, continueButton, newButton, closeButton].forEach(
        (object) => object.destroy(),
      );
    });
  }

  private confirmNewGame(): void {
    const state = getGameState();
    const overlay = this.add.rectangle(195, 422, 390, 844, 0x000000, 0.78);
    const panel = this.add
      .rectangle(195, 430, 330, 240, COLORS.panel, 1)
      .setStrokeStyle(2, COLORS.red);
    const text = this.add
      .text(
        195,
        380,
        "探索・装備・素材・死亡地点を初期化します。\n音・操作・アクセシビリティ設定は保持します。",
        {
          fontSize: "15px",
          color: COLORS.text,
          align: "center",
          wordWrap: { width: 280 },
        },
      )
      .setOrigin(0.5);
    const cancel = addButton(this, 122, 500, 120, 48, "キャンセル", () => {
      [overlay, panel, text, cancel, accept].forEach((object) =>
        object.destroy(),
      );
    });
    const accept = addButton(
      this,
      268,
      500,
      120,
      48,
      "初期化する",
      () => {
        setGameState(resetGamePreservingPreferences(state));
        clearRun();
        setRouteState({ ...getRouteState(), requestedStartMode: "new" });
        this.scene.start("AreaSelectScene");
      },
      COLORS.red,
    );
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
