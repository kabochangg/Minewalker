import Phaser from "phaser";
import { getItemName, type ItemId } from "../../data/items";
import type { InventoryState } from "../systems/InventorySystem";
import { addButton, addPanel, COLORS } from "./uiHelpers";

interface ResultSceneData {
  readonly success?: boolean;
  readonly depth?: number;
  readonly inventory?: InventoryState;
}

export class ResultScene extends Phaser.Scene {
  constructor() {
    super("ResultScene");
  }

  create(data: ResultSceneData): void {
    const success = data.success ?? false;
    this.cameras.main.setBackgroundColor("#0b0f12");
    addPanel(this, 195, 420, 350, 760);
    this.add
      .text(195, 120, success ? "探索結果" : "探索失敗", {
        fontSize: "30px",
        color: success ? "#f5b83f" : "#e05243",
        fontStyle: "bold"
      })
      .setOrigin(0.5);
    this.add.text(195, 190, `到達深度 ${data.depth ?? 0}m`, { fontSize: "20px", color: COLORS.text }).setOrigin(0.5);
    this.add.text(195, 240, "獲得素材", { fontSize: "18px", color: COLORS.muted }).setOrigin(0.5);

    const entries = Object.entries(data.inventory?.items ?? {}) as [ItemId, number][];
    const gained = entries.filter(([, amount]) => amount > 0);
    if (gained.length === 0) {
      this.add.text(195, 310, "なし", { fontSize: "18px", color: COLORS.text }).setOrigin(0.5);
    } else {
      gained.slice(0, 6).forEach(([itemId, amount], index) => {
        this.add
          .text(195, 302 + index * 34, `${getItemName(itemId)} x${amount}`, {
            fontSize: "17px",
            color: COLORS.text
          })
          .setOrigin(0.5);
      });
    }

    addButton(this, 118, 720, 150, 56, "拠点に戻る", () => this.scene.start("HomeScene"));
    addButton(this, 275, 720, 150, 56, "次の探索へ", () => this.scene.start("AreaSelectScene"), COLORS.green);
  }
}
