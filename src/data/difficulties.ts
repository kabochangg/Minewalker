/** 選択可能な難易度IDを表す。 */
export type DifficultyId = "easy" | "normal" | "hard";

/** 自動生成と報酬へ適用する難易度設定を表す。 */
export interface DifficultyDefinition {
  readonly id: DifficultyId;
  readonly label: string;
  readonly widthRange: readonly [number, number];
  readonly heightRange: readonly [number, number];
  readonly hazardDensity: number;
  readonly roomCountRange: readonly [number, number];
  readonly monsterCountRange: readonly [number, number];
  readonly monsterStrengthMultiplier: number;
  readonly wallDensity: number;
  readonly chestCountRange: readonly [number, number];
  readonly rewardMultiplier: number;
  readonly safeRadius: number;
}

/** 難易度ごとの決定的な生成パラメータ。 */
export const DIFFICULTIES: Readonly<
  Record<DifficultyId, DifficultyDefinition>
> = {
  easy: {
    id: "easy",
    label: "優しい",
    widthRange: [12, 16],
    heightRange: [18, 24],
    hazardDensity: 0.1,
    roomCountRange: [3, 5],
    monsterCountRange: [2, 4],
    monsterStrengthMultiplier: 0.8,
    wallDensity: 0.38,
    chestCountRange: [2, 4],
    rewardMultiplier: 0.9,
    safeRadius: 2,
  },
  normal: {
    id: "normal",
    label: "普通",
    widthRange: [16, 22],
    heightRange: [24, 32],
    hazardDensity: 0.16,
    roomCountRange: [4, 7],
    monsterCountRange: [4, 8],
    monsterStrengthMultiplier: 1,
    wallDensity: 0.46,
    chestCountRange: [2, 5],
    rewardMultiplier: 1,
    safeRadius: 2,
  },
  hard: {
    id: "hard",
    label: "難しい",
    widthRange: [20, 28],
    heightRange: [30, 42],
    hazardDensity: 0.22,
    roomCountRange: [5, 9],
    monsterCountRange: [7, 12],
    monsterStrengthMultiplier: 1.35,
    wallDensity: 0.54,
    chestCountRange: [3, 6],
    rewardMultiplier: 1.3,
    safeRadius: 1,
  },
};

/** 難易度定義が生成可能な値域か検証する。 */
export function validateDifficulty(definition: DifficultyDefinition): boolean {
  const validRange = (range: readonly [number, number], minimum: number) =>
    Number.isInteger(range[0]) &&
    Number.isInteger(range[1]) &&
    range[0] >= minimum &&
    range[0] <= range[1];
  return (
    definition.label.length > 0 &&
    validRange(definition.widthRange, 5) &&
    validRange(definition.heightRange, 5) &&
    validRange(definition.roomCountRange, 1) &&
    validRange(definition.monsterCountRange, 0) &&
    validRange(definition.chestCountRange, 0) &&
    definition.hazardDensity >= 0 &&
    definition.hazardDensity < 1 &&
    definition.wallDensity >= 0 &&
    definition.wallDensity < 1 &&
    definition.monsterStrengthMultiplier > 0 &&
    definition.rewardMultiplier > 0 &&
    Number.isInteger(definition.safeRadius) &&
    definition.safeRadius >= 1
  );
}
