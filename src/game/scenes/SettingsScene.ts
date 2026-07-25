import Phaser from "phaser";
import { getRouteState, setRouteState } from "../../app/routeState";
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
    this.drawToggle(286, 220, state.settings.sound);
    addButton(
      this,
      195,
      270,
      240,
      44,
      `音量 ${Math.round(state.settings.volume * 100)}%`,
      () => {
        const levels = [0, 0.5, 0.8, 1] as const;
        const current = levels.findIndex(
          (level) => level === state.settings.volume,
        );
        const volume = levels[(current + 1) % levels.length];
        setGameState({
          ...state,
          settings: { ...state.settings, volume },
        });
        this.render();
      },
    );
    addButton(
      this,
      195,
      330,
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
    this.drawToggle(286, 330, state.settings.vibration);
    addButton(
      this,
      195,
      410,
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
    this.drawToggle(286, 410, !state.settings.reducedMotion);
    addButton(
      this,
      195,
      490,
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
    this.drawToggle(286, 490, state.settings.textSize === "large");
    addButton(
      this,
      195,
      550,
      260,
      48,
      `操作 ${inputModeLabel(state.controlScheme.mode)}`,
      () => {
        const modes = ["touchJoystick", "touchTap", "keyboard"] as const;
        const mode =
          modes[(modes.indexOf(state.controlScheme.mode) + 1) % modes.length];
        setGameState({
          ...state,
          controlScheme: { ...state.controlScheme, mode },
        });
        setRouteState({
          ...getRouteState(),
          inputProfile: { ...state.controlScheme, mode },
        });
        this.render();
      },
    );
    addButton(
      this,
      112,
      610,
      150,
      44,
      `走行 ${state.controlScheme.runBehavior === "hold" ? "長押し" : "切替"}`,
      () => {
        setGameState({
          ...state,
          controlScheme: {
            ...state.controlScheme,
            runBehavior:
              state.controlScheme.runBehavior === "hold" ? "toggle" : "hold",
          },
        });
        this.render();
      },
    );
    addButton(
      this,
      278,
      610,
      150,
      44,
      `マーク ${state.controlScheme.markBehavior === "longPress" ? "長押し" : "ボタン"}`,
      () => {
        setGameState({
          ...state,
          controlScheme: {
            ...state.controlScheme,
            markBehavior:
              state.controlScheme.markBehavior === "longPress"
                ? "actionButton"
                : "longPress",
          },
        });
        this.render();
      },
    );
    addButton(
      this,
      195,
      664,
      260,
      42,
      `移動キー ${state.controlScheme.keyBindings.up === "ArrowUp" ? "矢印" : "WASD"}`,
      () => {
        const arrows = state.controlScheme.keyBindings.up === "ArrowUp";
        setGameState({
          ...state,
          controlScheme: {
            ...state.controlScheme,
            keyBindings: arrows
              ? {
                  ...state.controlScheme.keyBindings,
                  up: "KeyW",
                  down: "KeyS",
                  left: "KeyA",
                  right: "KeyD",
                }
              : {
                  ...state.controlScheme.keyBindings,
                  up: "ArrowUp",
                  down: "ArrowDown",
                  left: "ArrowLeft",
                  right: "ArrowRight",
                },
          },
        });
        this.render();
      },
    );
    this.add
      .text(
        195,
        714,
        "PWA更新は次回起動時に自動適用されます。セーブ破損時はバックアップから復元します。",
        {
          fontSize: "14px",
          color: COLORS.muted,
          align: "center",
          wordWrap: { width: 280 },
        },
      )
      .setOrigin(0.5);
    addButton(this, 195, 790, 160, 50, "戻る", () =>
      this.scene.start("HomeScene"),
    );
  }

  private drawToggle(x: number, y: number, active: boolean): void {
    const g = this.add.graphics();
    g.fillStyle(0x1c1510, 1);
    g.fillRoundedRect(x - 22, y - 11, 44, 22, 11);
    g.fillStyle(active ? COLORS.green : 0x4b4944, 1);
    g.fillRoundedRect(x - 20, y - 9, 40, 18, 9);
    g.fillStyle(active ? 0xffe08a : 0xd3b98b, 1);
    g.fillCircle(x + (active ? 11 : -11), y, 7);
  }
}

function inputModeLabel(
  mode: "touchJoystick" | "touchTap" | "keyboard",
): string {
  if (mode === "touchJoystick") return "スティック";
  if (mode === "touchTap") return "タップ";
  return "キーボード";
}
