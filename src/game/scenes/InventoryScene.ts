import Phaser from "phaser";
import { getItemName, type ItemId } from "../../data/items";
import { discardItem, getGameState } from "../state/GameState";
import { getUsedCapacity } from "../systems/InventorySystem";
import {
  addButton,
  addGameButton,
  addPanel,
  COLORS,
  drawGameIcon,
} from "./uiHelpers";

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
      drawGameIcon(this, 52, y, "ore", 0xffb13b).setScale(0.72);
      this.add
        .text(74, y, `${getItemName(itemId)} ×${amount}`, {
          fontSize: "16px",
          color: COLORS.text,
        })
        .setOrigin(0, 0.5);
      addGameButton(
        this,
        319,
        y,
        58,
        44,
        itemId === "item.bossRelic" ? "重要" : "−1",
        () => this.confirmDiscard(itemId),
        { state: itemId === "item.bossRelic" ? "disabled" : "danger" },
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

  private confirmDiscard(itemId: ItemId): void {
    const overlay = this.add.rectangle(195, 422, 390, 844, 0x0a0f12, 0.78);
    const panel = addPanel(this, 195, 422, 310, 220);
    const title = this.add
      .text(195, 365, "素材を破棄しますか？", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "20px",
        fontStyle: "bold",
        color: COLORS.text,
      })
      .setOrigin(0.5);
    const detail = this.add
      .text(195, 410, `${getItemName(itemId)}を1個破棄します。`, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        color: COLORS.muted,
      })
      .setOrigin(0.5);
    const close = (): void => {
      overlay.destroy();
      panel.destroy();
      title.destroy();
      detail.destroy();
      cancel.destroy();
      confirm.destroy();
    };
    const cancel = addGameButton(this, 135, 475, 100, 48, "やめる", close);
    const confirm = addGameButton(
      this,
      255,
      475,
      100,
      48,
      "破棄",
      () => {
        close();
        this.discard(itemId);
      },
      { state: "danger" },
    );
  }
}
