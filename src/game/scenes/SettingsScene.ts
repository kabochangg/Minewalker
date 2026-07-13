import Phaser from "phaser";
import { getGameState, setGameState } from "../state/GameState";
import { addButton, addPanel, COLORS } from "./uiHelpers";

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super("SettingsScene");
  }

  create(): void {
    this.render();
  }

  private render(): void {
    const state = getGameState();
    this.children.removeAll();
    this.cameras.main.setBackgroundColor("#0b0f12");
    addPanel(this, 195, 420, 350, 760);
    this.add
      .text(
        195,
        650,
        "正式版 v1.0.0\nセーブデータはこの端末内にのみ保存され、外部へ送信されません。\n通信料などは利用者の負担です。",
        {
          fontSize: "13px",
          color: COLORS.muted,
          align: "center",
          wordWrap: { width: 290 },
        },
      )
      .setOrigin(0.5);
    this.add
      .text(195, 120, "設定", {
        fontSize: "28px",
        color: COLORS.text,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    addButton(
      this,
      195,
      220,
      240,
      58,
      `サウンド ${state.settings.sound ? "ON" : "OFF"}`,
      () => {
        setGameState({
          ...state,
          settings: { ...state.settings, sound: !state.settings.sound },
        });
        this.render();
      },
    );
    addButton(
      this,
      195,
      300,
      240,
      58,
      `振動 ${state.settings.vibration ? "ON" : "OFF"}`,
      () => {
        setGameState({
          ...state,
          settings: { ...state.settings, vibration: !state.settings.vibration },
        });
        this.render();
      },
    );
    addButton(
      this,
      195,
      380,
      240,
      58,
      `演出 ${state.settings.reducedMotion ? "少なめ" : "通常"}`,
      () => {
        setGameState({
          ...state,
          settings: {
            ...state.settings,
            reducedMotion: !state.settings.reducedMotion,
          },
        });
        this.render();
      },
    );
    addButton(
      this,
      195,
      460,
      240,
      58,
      `文字 ${state.settings.textSize === "large" ? "大" : "標準"}`,
      () => {
        setGameState({
          ...state,
          settings: {
            ...state.settings,
            textSize: state.settings.textSize === "large" ? "normal" : "large",
          },
        });
        this.render();
      },
    );
    this.add
      .text(
        195,
        575,
        "PWA更新は次回起動時に自動適用されます。セーブ破損時はバックアップから復元します。",
        {
          fontSize: "14px",
          color: COLORS.muted,
          align: "center",
          wordWrap: { width: 280 },
        },
      )
      .setOrigin(0.5);
    addButton(this, 195, 760, 160, 56, "戻る", () =>
      this.scene.start("HomeScene"),
    );
  }
}
