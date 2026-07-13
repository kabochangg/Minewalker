import Phaser from "phaser";
import { EQUIPMENT } from "../../data/equipment";
import { ITEMS } from "../../data/items";
import { MONSTERS } from "../../data/monsters";
import { getGameState } from "../state/GameState";
import { addButton, addPanel, COLORS } from "./uiHelpers";

export class CollectionScene extends Phaser.Scene {
  constructor() {
    super("CollectionScene");
  }

  create(): void {
    const state = getGameState();
    this.cameras.main.setBackgroundColor("#0b0f12");
    addPanel(this, 195, 420, 350, 760);
    this.add
      .text(195, 90, "コレクション", {
        fontSize: "27px",
        color: COLORS.text,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.addSection("素材", 142, ITEMS.length, state.collection.items.length);
    this.addList(
      168,
      ITEMS.filter((item) => state.collection.items.includes(item.id))
        .map((item) => item.name)
        .slice(0, 5),
    );
    this.addSection(
      "モンスター",
      372,
      MONSTERS.length,
      state.collection.monsters.length,
    );
    this.addList(
      398,
      MONSTERS.filter((monster) =>
        state.collection.monsters.includes(monster.id),
      )
        .map((monster) => monster.name)
        .slice(0, 4),
    );
    this.addSection(
      "装備",
      572,
      EQUIPMENT.length,
      state.collection.equipment.length,
    );
    this.addList(
      598,
      EQUIPMENT.filter((equipment) =>
        state.collection.equipment.includes(equipment.id),
      )
        .map((equipment) => equipment.name)
        .slice(0, 3),
    );

    addButton(this, 195, 760, 160, 56, "戻る", () =>
      this.scene.start("HomeScene"),
    );
  }

  private addSection(
    label: string,
    y: number,
    total: number,
    found: number,
  ): void {
    this.add
      .text(65, y, `${label} ${found}/${total}`, {
        fontSize: "17px",
        color: "#f5b83f",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);
  }

  private addList(y: number, entries: readonly string[]): void {
    const text = entries.length > 0 ? entries.join("\n") : "未発見";
    this.add
      .text(78, y, text, {
        fontSize: "15px",
        color: COLORS.text,
        lineSpacing: 6,
        wordWrap: { width: 245 },
      })
      .setOrigin(0, 0);
  }
}
