import {
  DIFFICULTIES,
  validateDifficulty,
  type DifficultyDefinition,
  type DifficultyId,
} from "../../data/difficulties";

/** 難易度から生成寸法と倍率を検証して解決する。 */
export function resolveDifficulty(
  id: DifficultyId,
  requested?: { readonly width?: number; readonly height?: number },
): {
  readonly definition: DifficultyDefinition;
  readonly width: number;
  readonly height: number;
} {
  const definition = DIFFICULTIES[id];
  if (!validateDifficulty(definition)) {
    throw new Error(`難易度定義が不正です: ${id}`);
  }
  const width = requested?.width ?? definition.widthRange[0];
  const height = requested?.height ?? definition.heightRange[0];
  if (
    width < definition.widthRange[0] ||
    width > definition.widthRange[1] ||
    height < definition.heightRange[0] ||
    height > definition.heightRange[1]
  ) {
    throw new Error(`難易度${id}の盤面サイズが範囲外です`);
  }
  return { definition, width, height };
}
