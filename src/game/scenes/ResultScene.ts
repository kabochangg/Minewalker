import Phaser from "phaser";
import { getItemName, type ItemId } from "../../data/items";
import type { MonsterId } from "../../data/monsters";
import { applyExplorationReward, getGameState } from "../state/GameState";
import type { InventoryState } from "../systems/InventorySystem";
import { addButton, addPanel, COLORS } from "./uiHelpers";

interface ResultSceneData {
  readonly success?: boolean;
  readonly depth?: number;
  readonly inventory?: InventoryState;
  readonly defeatedMonsters?: readonly MonsterId[];
  readonly bossDefeated?: boolean;
}

export class ResultScene extends Phaser.Scene {
  constructor() {
    super("ResultScene");
  }

  create(data: ResultSceneData): void {
    const stateBefore = getGameState();
    const success = data.success ?? false;
    const depth = data.depth ?? 0;
    const inventory = data.inventory ?? stateBefore.inventory;
    const defeatedMonsters = data.defeatedMonsters ?? [];
    const stateAfter = applyExplorationReward({
      success,
      depth,
      inventory,
      defeatedMonsters,
      bossDefeated: data.bossDefeated ?? false
    });

    this.cameras.main.setBackgroundColor("#0b0f12");
    addPanel(this, 195, 420, 350, 760);
    this.add
      .text(195, 112, success ? "探索成功" : "探索失敗", {
        fontSize: "30px",
        color: success ? "#f5b83f" : "#e05243",
        fontStyle: "bold"
      })
      .setOrigin(0.5);
    this.add.text(195, 170, `到達深度 ${depth}m`, { fontSize: "20px", color: COLORS.text }).setOrigin(0.5);
    this.add
      .text(195, 204, `Lv.${stateBefore.player.level} → Lv.${stateAfter.player.level} / ${stateAfter.player.coins}C`, {
        fontSize: "16px",
        color: COLORS.muted
      })
      .setOrigin(0.5);
    this.add.text(195, 250, "獲得素材", { fontSize: "18px", color: COLORS.muted }).setOrigin(0.5);

    const gained = (Object.entries(inventory.items) as [ItemId, number][]).filter(([, amount]) => amount > 0);
    if (gained.length === 0) {
      this.add.text(195, 310, "なし", { fontSize: "18px", color: COLORS.text }).setOrigin(0.5);
    } else {
      gained.slice(0, 7).forEach(([itemId, amount], index) => {
        this.add
          .text(195, 302 + index * 32, `${getItemName(itemId)} x${amount}`, {
            fontSize: "16px",
            color: COLORS.text
          })
          .setOrigin(0.5);
      });
    }

    const monsterText = defeatedMonsters.length > 0 ? `討伐 ${defeatedMonsters.length}体` : "討伐なし";
    this.add.text(195, 550, monsterText, { fontSize: "16px", color: COLORS.muted }).setOrigin(0.5);
    addButton(this, 118, 720, 150, 56, "拠点へ", () => this.scene.start("HomeScene"));
    addButton(this, 275, 720, 150, 56, "次の探索", () => this.scene.start("AreaSelectScene"), COLORS.green);
  }
}
