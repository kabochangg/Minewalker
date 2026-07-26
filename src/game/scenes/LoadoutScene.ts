import Phaser from "phaser";
import { getSelectedAreaId } from "../../app/routeState";
import { getArea } from "../../data/areas";
import { DIFFICULTIES } from "../../data/difficulties";
import {
  EQUIPMENT,
  getEquipment,
  type EquipmentId,
  type EquipmentSlot,
} from "../../data/equipment";
import { equipItem, getGameState } from "../state/GameState";
import { getUsedCapacity } from "../systems/InventorySystem";
import {
  addButton,
  addHudBar,
  addPanel,
  COLORS,
  drawGameIcon,
  type GameIcon,
} from "./uiHelpers";

export class LoadoutScene extends Phaser.Scene {
  private message = "装備をタップすると所持品を切り替えます";
  constructor() {
    super("LoadoutScene");
  }

  create(): void {
    this.render();
  }

  private render(): void {
    const state = getGameState();
    const area = getArea(getSelectedAreaId());
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
      .text(195, 116, "装備・持ち込み", {
        fontSize: "22px",
        color: COLORS.text,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.add
      .text(
        195,
        148,
        `${area.name} / ${DIFFICULTIES[state.selectedDifficulty].label}`,
        { fontSize: "15px", color: COLORS.muted },
      )
      .setOrigin(0.5);

    const equipped = [
      state.equipment.equipped.pickaxe,
      state.equipment.equipped.weapon,
      state.equipment.equipped.armor,
    ] as EquipmentId[];
    equipped.forEach((equipmentId, index) => {
      const equipment = getEquipment(equipmentId);
      addButton(
        this,
        92 + index * 103,
        222,
        92,
        92,
        `${equipment.name}\n${formatEquipmentEffect(equipment)}`,
        () => this.cycleEquipment(equipment.slot),
      );
      const icon: GameIcon = ["pickaxe", "weapon", "armor"][index] as GameIcon;
      drawGameIcon(this, 92 + index * 103, 196, icon, 0xffe08a).setScale(0.72);
    });

    const items = [
      [`冷却剤\nx${state.inventory.coolants}`, 92, 352],
      [`解除装置\nx${state.inventory.disablers}`, 195, 352],
      [`回復薬\nx${state.inventory.potions}`, 298, 352],
      [
        `バッグ\n${getUsedCapacity(state.inventory)}/${state.inventory.capacity}`,
        92,
        482,
      ],
      [`地図\nx${state.inventory.maps}`, 195, 482],
      [`深度\n${area.maxDepth}m`, 298, 482],
    ] as const;
    for (const [label, x, y] of items) {
      addButton(this, x, y, 92, 92, label, () => undefined);
    }
    const itemIcons: readonly GameIcon[] = [
      "coolant",
      "disable",
      "potion",
      "bag",
      "map",
      "depth",
    ];
    items.forEach(([, x, y], index) => {
      drawGameIcon(this, x, y - 25, itemIcons[index], 0xfff3d6).setScale(0.68);
    });

    this.add
      .text(195, 610, `${this.message}\n数字を読む → マーク → 冷却・解除`, {
        fontSize: "14px",
        color: COLORS.muted,
        align: "center",
        wordWrap: { width: 300 },
      })
      .setOrigin(0.5);
    addButton(this, 88, 790, 120, 52, "戻る", () =>
      this.scene.start("AreaSelectScene"),
    );
    addButton(
      this,
      234,
      790,
      190,
      62,
      "この装備で出発",
      () => this.scene.start("ExplorationScene"),
      COLORS.green,
    );
  }

  private cycleEquipment(slot: EquipmentSlot): void {
    const state = getGameState();
    const owned = EQUIPMENT.filter(
      (equipment) =>
        equipment.slot === slot &&
        state.equipment.owned.includes(equipment.id as EquipmentId),
    );
    const current = state.equipment.equipped[slot];
    const currentIndex = owned.findIndex(
      (equipment) => equipment.id === current,
    );
    const next = owned[(currentIndex + 1) % owned.length];
    if (!next) {
      this.message = "切り替えられる装備がありません";
      this.render();
      return;
    }
    this.message = equipItem(next.id as EquipmentId).message;
    this.render();
  }
}

function formatEquipmentEffect(
  equipment: ReturnType<typeof getEquipment>,
): string {
  if (equipment.slot === "pickaxe") {
    return `採掘 ${equipment.miningPower}`;
  }
  if (equipment.slot === "weapon") {
    return `攻撃 +${equipment.attack}`;
  }
  return `防御 +${equipment.defense}`;
}
