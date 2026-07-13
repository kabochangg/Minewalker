import Phaser from "phaser";
import { type UpgradeId } from "../../data/upgrades";
import { getGameState, tryUpgrade } from "../state/GameState";
import { getUsedCapacity } from "../systems/InventorySystem";
import {
  getNextUnlockHint,
  getUpgradeCostLabel,
} from "../systems/ProgressionSystem";
import {
  addButton,
  addHudBar,
  addIconButton,
  addPanel,
  COLORS,
  drawGameIcon,
  drawPixelMiner,
} from "./uiHelpers";

export class HomeScene extends Phaser.Scene {
  private message = "拠点で準備を整えよう";

  constructor() {
    super("HomeScene");
  }

  create(): void {
    this.render();
  }

  private render(): void {
    const state = getGameState();
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
    this.add
      .text(240, 44, `${state.player.coins}C`, {
        fontSize: "15px",
        color: COLORS.text,
      })
      .setOrigin(0.5);
    this.add
      .text(
        318,
        44,
        `袋 ${getUsedCapacity(state.inventory)}/${state.inventory.capacity}`,
        { fontSize: "14px", color: COLORS.text },
      )
      .setOrigin(0.5);
    addIconButton(this, 348, 70, "settings", () =>
      this.scene.start("SettingsScene"),
    );

    this.drawHomeMine();
    drawPixelMiner(this, 192, 238).setScale(1.35);
    this.add
      .text(
        84,
        156,
        `鉱夫\nLv.${state.player.level}\n拠点Lv.${state.base.levels["upgrade.base"]}`,
        {
          fontSize: "16px",
          color: COLORS.text,
          align: "center",
        },
      )
      .setOrigin(0.5);
    this.add
      .text(
        195,
        326,
        `${this.message}\n次の解放: ${getNextUnlockHint(state)}`,
        {
          fontSize: "14px",
          color: COLORS.muted,
          align: "center",
          wordWrap: { width: 318 },
        },
      )
      .setOrigin(0.5);

    this.addUpgradeButton("upgrade.base", 90, 402);
    this.addUpgradeButton("upgrade.weaponBench", 195, 402);
    this.addUpgradeButton("upgrade.armorBench", 300, 402);
    this.addUpgradeButton("upgrade.player", 90, 500);
    addButton(this, 195, 500, 94, 74, "クラフト", () =>
      this.scene.start("CraftingScene"),
    );
    addButton(this, 300, 500, 94, 74, "バッグ", () =>
      this.scene.start("InventoryScene"),
    );
    addButton(
      this,
      195,
      602,
      230,
      62,
      "探索へ",
      () => this.scene.start("AreaSelectScene"),
      COLORS.green,
    );

    addButton(
      this,
      62,
      780,
      70,
      58,
      "ホーム",
      () => this.render(),
      COLORS.goldDark,
    );
    addButton(this, 145, 780, 70, 58, "探索", () =>
      this.scene.start("AreaSelectScene"),
    );
    addButton(this, 228, 780, 70, 58, "図鑑", () =>
      this.scene.start("CollectionScene"),
    );
    addButton(this, 311, 780, 70, 58, "設定", () =>
      this.scene.start("SettingsScene"),
    );
    drawGameIcon(this, 62, 765, "home", 0xffe08a).setScale(0.6);
    drawGameIcon(this, 145, 765, "pickaxe", 0xfff3d6).setScale(0.6);
    drawGameIcon(this, 228, 765, "collection", 0xfff3d6).setScale(0.6);
    drawGameIcon(this, 311, 765, "settings", 0xfff3d6).setScale(0.6);
  }

  private addUpgradeButton(upgradeId: UpgradeId, x: number, y: number): void {
    const state = getGameState();
    const labelMap: Record<UpgradeId, string> = {
      "upgrade.base": "拠点",
      "upgrade.player": "鉱夫",
      "upgrade.weaponBench": "武器",
      "upgrade.armorBench": "防具",
    };
    const level = state.base.levels[upgradeId] ?? 1;
    addButton(this, x, y, 94, 74, `${labelMap[upgradeId]}\nLv.${level}`, () => {
      const result = tryUpgrade(upgradeId);
      this.message = result.message;
      this.render();
    });
    this.add
      .text(x, y + 48, getUpgradeCostLabel(state, upgradeId), {
        fontSize: "10px",
        color: COLORS.muted,
        align: "center",
        wordWrap: { width: 92 },
      })
      .setOrigin(0.5);
  }

  private drawHomeMine(): void {
    const g = this.add.graphics();
    g.fillStyle(0x15110d);
    g.fillRoundedRect(32, 98, 326, 220, 10);
    g.fillStyle(0x2a1b10);
    g.fillRoundedRect(112, 146, 156, 118, 5);
    g.fillStyle(0x3e2916);
    g.fillTriangle(102, 151, 190, 92, 278, 151);
    g.lineStyle(5, 0x735640, 1);
    g.lineBetween(126, 150, 126, 268);
    g.lineBetween(254, 150, 254, 268);
    g.fillStyle(0xffb13b, 0.18);
    g.fillCircle(205, 190, 48);
    g.fillStyle(0xffb13b, 0.88);
    g.fillCircle(205, 177, 7);
    g.fillStyle(0x4e3b2d);
    g.fillRoundedRect(44, 226, 72, 50, 4);
    g.lineStyle(3, 0xffb13b, 0.65);
    g.strokeRoundedRect(44, 226, 72, 50, 4);
    g.fillStyle(0x443222);
    g.fillRoundedRect(278, 212, 62, 66, 4);
    g.fillStyle(0x735640);
    g.fillRect(284, 220, 50, 6);
    g.fillStyle(0x365f8f);
    g.fillTriangle(292, 260, 316, 186, 340, 260);
    g.fillStyle(0xffe08a, 0.9);
    g.fillCircle(316, 212, 4);
  }
}
