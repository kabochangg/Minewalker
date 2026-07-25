import Phaser from "phaser";
import { AREAS, type AreaId } from "../../data/areas";
import { DIFFICULTIES, type DifficultyId } from "../../data/difficulties";
import {
  getRouteState,
  setRouteState,
  setSelectedAreaId,
} from "../../app/routeState";
import { loadRun } from "../../save/RunSaveSystem";
import { getGameState, setGameState, tryUnlockArea } from "../state/GameState";
import {
  getAreaVisualTheme,
  type AreaVisualThemeId,
} from "../visual/VisualSystem";
import {
  addButton,
  addHudBar,
  addIconButton,
  addPanel,
  COLORS,
  drawGameIcon,
} from "./uiHelpers";

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
    addIconButton(this, 348, 62, "settings", () =>
      this.scene.start("SettingsScene"),
    );
    this.add
      .text(195, 145, this.message, {
        fontSize: "13px",
        color: COLORS.text,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    addButton(
      this,
      195,
      112,
      172,
      38,
      `難易度: ${DIFFICULTIES[state.selectedDifficulty].label}`,
      () => this.cycleDifficulty(state.selectedDifficulty),
      COLORS.goldDark,
    );
    if (state.deathCaches.length > 0) {
      this.add
        .text(195, 140, `回収待ち ${state.deathCaches.length}地点`, {
          fontSize: "12px",
          color: "#ff8b72",
        })
        .setOrigin(0.5);
    }

    AREAS.forEach((area, index) => {
      const unlocked = state.unlockedAreas.includes(area.id);
      const y = 178 + index * 112;
      addPanel(this, 195, y, 326, 92);
      this.drawAreaThumbnail(area.theme, 69, y, unlocked);
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
      if (!unlocked) {
        drawGameIcon(this, 288, y + 25, "lock", 0xd3b98b).setScale(0.65);
      }
    });

    addButton(this, 82, 790, 120, 52, "戻る", () =>
      this.scene.start("HomeScene"),
    );
  }

  private cycleDifficulty(current: DifficultyId): void {
    const order: readonly DifficultyId[] = ["easy", "normal", "hard"];
    const next = order[(order.indexOf(current) + 1) % order.length];
    setGameState({ ...getGameState(), selectedDifficulty: next });
    setRouteState({ ...getRouteState(), selectedDifficulty: next });
    this.message = `難易度を${DIFFICULTIES[next].label}に変更しました`;
    this.render();
  }

  private drawAreaThumbnail(
    themeId: AreaVisualThemeId,
    x: number,
    y: number,
    unlocked: boolean,
  ): void {
    const theme = getAreaVisualTheme(themeId);
    const g = this.add.graphics();
    g.fillStyle(0x1c1510, 1);
    g.fillRoundedRect(x - 30, y - 34, 60, 68, 6);
    g.fillStyle(theme.cave, 1);
    g.fillRoundedRect(x - 28, y - 32, 56, 64, 5);
    g.fillStyle(theme.wall[1], unlocked ? 1 : 0.55);
    g.fillCircle(x - 12, y - 11, 12);
    g.fillCircle(x + 12, y - 8, 15);
    g.fillStyle(theme.wallHighlight, unlocked ? 0.85 : 0.32);
    g.fillCircle(x - 15, y - 15, 4);
    g.fillCircle(x + 7, y - 14, 5);
    g.fillStyle(theme.accent, unlocked ? 0.9 : 0.25);
    if (theme.motif === "crystal") {
      g.fillTriangle(x - 5, y + 25, x + 2, y, x + 8, y + 25);
    } else if (theme.motif === "volcanic") {
      g.lineStyle(3, theme.crack, unlocked ? 1 : 0.4);
      g.lineBetween(x - 18, y + 22, x, y + 5);
      g.lineBetween(x, y + 5, x + 18, y + 24);
    } else if (theme.motif === "ancientBrick") {
      g.fillRect(x - 21, y + 5, 18, 10);
      g.fillRect(x + 1, y + 5, 20, 10);
      g.fillRect(x - 11, y + 18, 22, 9);
    } else {
      g.fillCircle(x, y + 17, 8);
    }
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
