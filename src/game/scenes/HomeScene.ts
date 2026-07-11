import Phaser from "phaser";
import { getItemName, type ItemId } from "../../data/items";
import { type UpgradeId } from "../../data/upgrades";
import { getGameState, setGameState, tryUpgrade } from "../state/GameState";
import { craftFirstAvailable } from "../systems/CraftingSystem";
import { getUsedCapacity } from "../systems/InventorySystem";
import { getNextUnlockHint, getUpgradeCostLabel } from "../systems/ProgressionSystem";
import { addButton, addHudBar, addPanel, COLORS, drawPixelMiner } from "./uiHelpers";

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
    addHudBar(this, 100, 44, 140, state.player.hp, state.player.maxHp, COLORS.red, "HP");
    addHudBar(this, 100, 68, 140, state.player.stamina, state.player.maxStamina, COLORS.green, "ST");
    this.add.text(240, 44, `${state.player.coins}C`, { fontSize: "15px", color: COLORS.text }).setOrigin(0.5);
    this.add.text(318, 44, `袋 ${getUsedCapacity(state.inventory)}/${state.inventory.capacity}`, { fontSize: "14px", color: COLORS.text }).setOrigin(0.5);
    addButton(this, 348, 70, 52, 52, "⚙", () => this.scene.start("SettingsScene"));

    this.drawHomeMine();
    drawPixelMiner(this, 192, 238).setScale(1.35);
    this.add
      .text(84, 156, `鉱夫\nLv.${state.player.level}\n拠点Lv.${state.base.levels["upgrade.base"]}`, {
        fontSize: "16px",
        color: COLORS.text,
        align: "center"
      })
      .setOrigin(0.5);
    this.add
      .text(195, 326, `${this.message}\n次の解放: ${getNextUnlockHint(state)}`, {
        fontSize: "14px",
        color: COLORS.muted,
        align: "center",
        wordWrap: { width: 318 }
      })
      .setOrigin(0.5);

    this.addUpgradeButton("upgrade.base", 90, 402);
    this.addUpgradeButton("upgrade.weaponBench", 195, 402);
    this.addUpgradeButton("upgrade.armorBench", 300, 402);
    this.addUpgradeButton("upgrade.player", 90, 500);
    addButton(this, 195, 500, 94, 74, "クラフト", () => this.craft());
    addButton(this, 300, 500, 94, 74, "バッグ", () => this.showBag());
    addButton(this, 195, 602, 230, 62, "探索へ", () => this.scene.start("AreaSelectScene"), COLORS.green);

    addButton(this, 62, 780, 70, 58, "ホーム", () => this.render(), COLORS.goldDark);
    addButton(this, 145, 780, 70, 58, "探索", () => this.scene.start("AreaSelectScene"));
    addButton(this, 228, 780, 70, 58, "図鑑", () => this.scene.start("CollectionScene"));
    addButton(this, 311, 780, 70, 58, "設定", () => this.scene.start("SettingsScene"));
  }

  private addUpgradeButton(upgradeId: UpgradeId, x: number, y: number): void {
    const state = getGameState();
    const labelMap: Record<UpgradeId, string> = {
      "upgrade.base": "拠点",
      "upgrade.player": "鉱夫",
      "upgrade.weaponBench": "武器",
      "upgrade.armorBench": "防具"
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
        wordWrap: { width: 92 }
      })
      .setOrigin(0.5);
  }

  private craft(): void {
    const result = craftFirstAvailable(getGameState());
    if (result.crafted) {
      setGameState(result.state);
    }
    this.message = result.message;
    this.render();
  }

  private showBag(): void {
    const state = getGameState();
    const entries = (Object.entries(state.inventory.items) as [ItemId, number][])
      .filter(([, amount]) => amount > 0)
      .slice(0, 4)
      .map(([itemId, amount]) => `${getItemName(itemId)} x${amount}`);
    this.message = entries.length > 0 ? entries.join(" / ") : "バッグは空です";
    this.render();
  }

  private drawHomeMine(): void {
    const g = this.add.graphics();
    g.fillStyle(0x15110d);
    g.fillRect(32, 98, 326, 220);
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
