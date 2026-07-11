import type { ItemId } from "./items";

export type EquipmentSlot = "pickaxe" | "weapon" | "armor";
export type EquipmentId = (typeof EQUIPMENT_DEFINITIONS)[number]["id"];

export interface EquipmentCost {
  readonly coins: number;
  readonly items: Readonly<Partial<Record<ItemId, number>>>;
}

export interface EquipmentDefinition {
  readonly id: string;
  readonly name: string;
  readonly slot: EquipmentSlot;
  readonly tier: number;
  readonly miningPower: number;
  readonly attack: number;
  readonly defense: number;
  readonly cost: EquipmentCost;
}

export const EQUIPMENT_DEFINITIONS = [
  {
    id: "equipment.pickaxe.wood",
    name: "木のツルハシ",
    slot: "pickaxe",
    tier: 1,
    miningPower: 1,
    attack: 0,
    defense: 0,
    cost: { coins: 0, items: {} }
  },
  {
    id: "equipment.pickaxe.copper",
    name: "銅のツルハシ",
    slot: "pickaxe",
    tier: 2,
    miningPower: 2,
    attack: 0,
    defense: 0,
    cost: { coins: 60, items: { "item.copperOre": 8, "item.stone": 4 } }
  },
  {
    id: "equipment.pickaxe.iron",
    name: "鉄のツルハシ",
    slot: "pickaxe",
    tier: 3,
    miningPower: 3,
    attack: 1,
    defense: 0,
    cost: { coins: 140, items: { "item.ironOre": 12, "item.coal": 4 } }
  },
  {
    id: "equipment.pickaxe.crystal",
    name: "水晶ツルハシ",
    slot: "pickaxe",
    tier: 4,
    miningPower: 4,
    attack: 2,
    defense: 0,
    cost: { coins: 280, items: { "item.silverOre": 8, "item.blueCrystal": 5 } }
  },
  {
    id: "equipment.pickaxe.ancient",
    name: "古代ツルハシ",
    slot: "pickaxe",
    tier: 5,
    miningPower: 6,
    attack: 3,
    defense: 1,
    cost: { coins: 700, items: { "item.ancientCrystal": 4, "item.guardianGear": 2 } }
  },
  {
    id: "equipment.weapon.dagger",
    name: "短剣",
    slot: "weapon",
    tier: 1,
    miningPower: 0,
    attack: 4,
    defense: 0,
    cost: { coins: 0, items: {} }
  },
  {
    id: "equipment.weapon.ironSword",
    name: "鉄の剣",
    slot: "weapon",
    tier: 2,
    miningPower: 0,
    attack: 8,
    defense: 0,
    cost: { coins: 90, items: { "item.ironOre": 8, "item.coal": 3 } }
  },
  {
    id: "equipment.weapon.crystalSpear",
    name: "水晶槍",
    slot: "weapon",
    tier: 3,
    miningPower: 0,
    attack: 12,
    defense: 1,
    cost: { coins: 240, items: { "item.blueCrystal": 5, "item.silverOre": 8 } }
  },
  {
    id: "equipment.weapon.flameHammer",
    name: "火炎槌",
    slot: "weapon",
    tier: 4,
    miningPower: 1,
    attack: 17,
    defense: 1,
    cost: { coins: 480, items: { "item.redCrystal": 5, "item.flameGel": 4 } }
  },
  {
    id: "equipment.weapon.relicBlade",
    name: "遺物の剣",
    slot: "weapon",
    tier: 5,
    miningPower: 1,
    attack: 24,
    defense: 2,
    cost: { coins: 900, items: { "item.bossRelic": 1, "item.guardianGear": 3 } }
  },
  {
    id: "equipment.armor.cloth",
    name: "布の服",
    slot: "armor",
    tier: 1,
    miningPower: 0,
    attack: 0,
    defense: 2,
    cost: { coins: 0, items: {} }
  },
  {
    id: "equipment.armor.leather",
    name: "革の防具",
    slot: "armor",
    tier: 2,
    miningPower: 0,
    attack: 0,
    defense: 5,
    cost: { coins: 80, items: { "item.slimeCore": 4, "item.copperOre": 4 } }
  },
  {
    id: "equipment.armor.iron",
    name: "鉄の防具",
    slot: "armor",
    tier: 3,
    miningPower: 0,
    attack: 0,
    defense: 9,
    cost: { coins: 220, items: { "item.ironOre": 10, "item.silverOre": 4 } }
  },
  {
    id: "equipment.armor.obsidian",
    name: "黒曜防具",
    slot: "armor",
    tier: 4,
    miningPower: 0,
    attack: 1,
    defense: 14,
    cost: { coins: 460, items: { "item.obsidian": 6, "item.golemShard": 4 } }
  },
  {
    id: "equipment.armor.guardian",
    name: "守護兵装甲",
    slot: "armor",
    tier: 5,
    miningPower: 1,
    attack: 2,
    defense: 21,
    cost: { coins: 860, items: { "item.guardianGear": 4, "item.ancientCrystal": 3 } }
  }
] as const;

export const EQUIPMENT: readonly EquipmentDefinition[] = EQUIPMENT_DEFINITIONS;

export const STARTER_EQUIPMENT_IDS = {
  pickaxe: "equipment.pickaxe.wood",
  weapon: "equipment.weapon.dagger",
  armor: "equipment.armor.cloth"
} as const satisfies Record<EquipmentSlot, EquipmentId>;

const starterEquipmentIdList: readonly string[] = Object.values(STARTER_EQUIPMENT_IDS);

export const STARTER_EQUIPMENT: readonly EquipmentDefinition[] = EQUIPMENT.filter((equipment) =>
  starterEquipmentIdList.includes(equipment.id)
);

export function getEquipment(id: EquipmentId): EquipmentDefinition {
  const equipment = EQUIPMENT.find((candidate) => candidate.id === id);
  if (!equipment) {
    throw new Error(`Unknown equipment id: ${id}`);
  }
  return equipment;
}
