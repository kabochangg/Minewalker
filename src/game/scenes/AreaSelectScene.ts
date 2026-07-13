import Phaser from "phaser";
import { AREAS, type AreaId } from "../../data/areas";
import { setSelectedAreaId } from "../../app/routeState";
import { loadRun } from "../../save/RunSaveSystem";
import { getGameState, tryUnlockArea } from "../state/GameState";
import { addButton, addHudBar, addPanel, COLORS } from "./uiHelpers";

export class AreaSelectScene extends Phaser.Scene {
  private message = "探索先を選択してください";

  constructor() {
    super("AreaSelectScene");
  }

  create(): void {
    this.render();
  }

  private render(): void {
    const state = getGameState();
    const interrupted = loadRun();
    this.children.removeAll();
    this.cameras.main.setBackgroundColor("#0b0f12");
    addPanel(this, 195, 420, 360, 800);
    addHudBar(
      this,
      100,
      44,
      140,
      state.player.hp,
      state.player.maxHp,
      COLORS.red,
      "HP",
    );
    addHudBar(
      this,
      100,
      68,
      140,
      state.player.stamina,
      state.player.maxStamina,
      COLORS.green,
      "ST",
    );
    addButton(this, 348, 62, 52, 52, "⚙", () =>
      this.scene.start("SettingsScene"),
    );
    this.add
      .text(195, 112, this.message, {
        fontSize: "18px",
        color: COLORS.text,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    AREAS.forEach((area, index) => {
      const unlocked = state.unlockedAreas.includes(area.id);
      const y = 178 + index * 112;
      addPanel(this, 195, y, 326, 92);
      this.add
        .text(102, y - 24, area.name, {
          fontSize: "18px",
          color: COLORS.text,
          fontStyle: "bold",
        })
        .setOrigin(0, 0.5);
      this.add.text(
        102,
        y + 4,
        `ST ${area.staminaCost} / 深度 ${area.maxDepth}m`,
        {
          fontSize: "13px",
          color: COLORS.muted,
        },
      );
      this.add.text(
        102,
        y + 28,
        "★".repeat(area.difficulty) + "☆".repeat(5 - area.difficulty),
        {
          fontSize: "16px",
          color: "#f5b83f",
        },
      );
      addButton(
        this,
        288,
        y - 8,
        92,
        42,
        unlocked
          ? `${interrupted?.areaId === area.id ? "再開" : "推奨"}\nLv.${area.recommendedLevel}`
          : "解放",
        () => this.selectArea(area.id, unlocked),
        unlocked ? COLORS.green : 0x555555,
      );
    });

    addButton(this, 82, 790, 120, 52, "戻る", () =>
      this.scene.start("HomeScene"),
    );
  }

  private selectArea(areaId: AreaId, unlocked: boolean): void {
    if (unlocked) {
      setSelectedAreaId(areaId);
      this.scene.start("LoadoutScene");
      return;
    }
    const result = tryUnlockArea(areaId);
    this.message = result.message;
    this.render();
  }
}
