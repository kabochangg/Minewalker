import Phaser from "phaser";
import { getItemName, type ItemId } from "../../data/items";
import { discardItem, getGameState } from "../state/GameState";
import { getUsedCapacity } from "../systems/InventorySystem";
import { addButton, addPanel, COLORS } from "./uiHelpers";

const PAGE_SIZE = 7;

export class InventoryScene extends Phaser.Scene {
  private page = 0;
  private message = "素材を確認できます。重要品以外は1個ずつ破棄できます";

  constructor() {
    super("InventoryScene");
  }

  create(): void {
    this.render();
  }

  private render(): void {
    const state = getGameState();
    const entries = (
      Object.entries(state.inventory.items) as [ItemId, number][]
    ).filter(([, amount]) => amount > 0);
    const pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
    this.page = Math.min(this.page, pageCount - 1);
    const visible = entries.slice(
      this.page * PAGE_SIZE,
      (this.page + 1) * PAGE_SIZE,
    );

    this.children.removeAll();
    this.cameras.main.setBackgroundColor("#0b0f12");
    addPanel(this, 195, 420, 360, 800);
    this.add
      .text(195, 70, "バッグ", {
        fontSize: "27px",
        color: COLORS.text,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.add
      .text(
        195,
        108,
        `${getUsedCapacity(state.inventory)}/${state.inventory.capacity}\n${this.message}`,
        {
          fontSize: "13px",
          color: COLORS.muted,
          align: "center",
          wordWrap: { width: 330 },
        },
      )
      .setOrigin(0.5);

    if (visible.length === 0) {
      this.add
        .text(195, 350, "バッグは空です", {
          fontSize: "20px",
          color: COLORS.text,
        })
        .setOrigin(0.5);
    }
    visible.forEach(([itemId, amount], index) => {
      const y = 180 + index * 72;
      addPanel(this, 195, y, 318, 58);
      this.add
        .text(62, y, `${getItemName(itemId)} ×${amount}`, {
          fontSize: "16px",
          color: COLORS.text,
        })
        .setOrigin(0, 0.5);
      addButton(
        this,
        319,
        y,
        58,
        44,
        itemId === "item.bossRelic" ? "重要" : "−1",
        () => this.discard(itemId),
        itemId === "item.bossRelic" ? 0x4a433b : COLORS.red,
      );
    });

    addButton(this, 92, 714, 100, 48, "前へ", () => {
      this.page = Math.max(0, this.page - 1);
      this.render();
    });
    this.add
      .text(195, 714, `${this.page + 1}/${pageCount}`, {
        fontSize: "16px",
        color: COLORS.text,
      })
      .setOrigin(0.5);
    addButton(this, 298, 714, 100, 48, "次へ", () => {
      this.page = Math.min(pageCount - 1, this.page + 1);
      this.render();
    });
    addButton(this, 195, 790, 170, 54, "拠点へ戻る", () =>
      this.scene.start("HomeScene"),
    );
  }

  private discard(itemId: ItemId): void {
    this.message = discardItem(itemId).message;
    this.render();
  }
}
