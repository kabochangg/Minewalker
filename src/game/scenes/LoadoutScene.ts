import Phaser from "phaser";
import { getSelectedAreaId } from "../../app/routeState";
import { getArea } from "../../data/areas";
import { getEquipment, type EquipmentId } from "../../data/equipment";
import { getGameState } from "../state/GameState";
import { getUsedCapacity } from "../systems/InventorySystem";
import { addButton, addHudBar, addPanel, COLORS } from "./uiHelpers";

export class LoadoutScene extends Phaser.Scene {
  constructor() {
    super("LoadoutScene");
  }

  create(): void {
    const state = getGameState();
    const area = getArea(getSelectedAreaId());
    this.cameras.main.setBackgroundColor("#0b0f12");
    addPanel(this, 195, 420, 360, 800);
    addHudBar(this, 100, 44, 140, state.player.hp, state.player.maxHp, COLORS.red, "HP");
    addHudBar(this, 100, 68, 140, state.player.stamina, state.player.maxStamina, COLORS.green, "ST");
    this.add.text(195, 116, "装備・持ち込み", { fontSize: "22px", color: COLORS.text, fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(195, 148, area.name, { fontSize: "15px", color: COLORS.muted }).setOrigin(0.5);

    const equipped = [
      state.equipment.equipped.pickaxe,
      state.equipment.equipped.weapon,
      state.equipment.equipped.armor
    ] as EquipmentId[];
    equipped.forEach((equipmentId, index) => {
      const equipment = getEquipment(equipmentId);
      addButton(this, 92 + index * 103, 222, 92, 92, `${equipment.name}\nT${equipment.tier}`, () => undefined);
    });

    const items = [
      [`冷却剤\nx${state.inventory.coolants}`, 92, 352],
      [`解除装置\nx${state.inventory.disablers}`, 195, 352],
      [`回復薬\nx${state.inventory.potions}`, 298, 352],
      [`バッグ\n${getUsedCapacity(state.inventory)}/${state.inventory.capacity}`, 92, 482],
      [`地図\nx${state.inventory.maps}`, 195, 482],
      [`深度\n${area.maxDepth}m`, 298, 482]
    ] as const;
    for (const [label, x, y] of items) {
      addButton(this, x, y, 92, 92, label, () => undefined);
    }

    this.add
      .text(195, 620, "長押しでフラグ。下部ボタンで採掘・冷却・解除を切り替えます。", {
        fontSize: "14px",
        color: COLORS.muted,
        align: "center",
        wordWrap: { width: 300 }
      })
      .setOrigin(0.5);
    addButton(this, 88, 790, 120, 52, "戻る", () => this.scene.start("AreaSelectScene"));
    addButton(this, 234, 790, 190, 62, "出発", () => this.scene.start("ExplorationScene"), COLORS.green);
  }
}
