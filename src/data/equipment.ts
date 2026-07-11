export interface EquipmentDefinition {
  readonly id: string;
  readonly name: string;
  readonly level: number;
}

export const STARTER_EQUIPMENT: readonly EquipmentDefinition[] = [
  { id: "equipment.pickaxe.wood", name: "ツルハシ", level: 1 },
  { id: "equipment.weapon.dagger", name: "短剣", level: 1 },
  { id: "equipment.armor.cloth", name: "布服", level: 1 }
];
