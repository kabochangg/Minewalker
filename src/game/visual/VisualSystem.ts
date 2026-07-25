import type { AreaDefinition } from "../../data/areas";
import type { TileState } from "../map/types";
import type { MoveDirection } from "../systems/MovementSystem";

export const VISUAL_TOKENS = {
  colors: {
    void: 0x0a0f12,
    cave: 0x18140f,
    panel: 0x2b2118,
    panelLight: 0x443222,
    rockOutline: 0x1c1510,
    rock: 0x4e3b2d,
    rockHighlight: 0x735640,
    lantern: 0xffb13b,
    highlight: 0xffe08a,
    text: "#fff3d6",
    muted: "#d3b98b",
    hp: 0xe65343,
    stamina: 0x69c34a,
    coin: 0xffd34d,
    coolant: 0x55c7f3,
    disable: 0xf0c94c,
    danger: 0xff684f,
    success: 0x69c34a,
    disabled: 0x4b4944,
    blue: 0x4da3ff,
    purple: 0x9366bd,
  },
  stroke: { outer: 2, inner: 1 },
  radius: { panel: 8, button: 6 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 20 },
  font: { small: 12, body: 15, button: 16, heading: 24 },
  motion: { press: 100, reveal: 150, feedback: 220 },
} as const;

export type AreaVisualThemeId = AreaDefinition["theme"];

export interface AreaVisualTheme {
  readonly id: AreaVisualThemeId;
  readonly cave: number;
  readonly wall: readonly [number, number, number];
  readonly wallHighlight: number;
  readonly floor: readonly [number, number, number, number];
  readonly accent: number;
  readonly crack: number;
  readonly glow: number;
  readonly motif: "roundRock" | "crystal" | "volcanic" | "ancientBrick";
}

export const AREA_VISUAL_THEMES: Readonly<
  Record<AreaVisualThemeId, AreaVisualTheme>
> = {
  beginnerMine: {
    id: "beginnerMine",
    cave: 0x18140f,
    wall: [0x3d3025, 0x48382a, 0x52402f],
    wallHighlight: 0x735640,
    floor: [0x4a3728, 0x513d2c, 0x594331, 0x614936],
    accent: 0xffb13b,
    crack: 0x2a1e16,
    glow: 0xffc04d,
    motif: "roundRock",
  },
  crystalCave: {
    id: "crystalCave",
    cave: 0x101a1c,
    wall: [0x203238, 0x294047, 0x31505a],
    wallHighlight: 0x477480,
    floor: [0x243b40, 0x2a444a, 0x315057, 0x385b62],
    accent: 0x55c7d5,
    crack: 0x11272d,
    glow: 0x72e5ef,
    motif: "crystal",
  },
  volcanoMine: {
    id: "volcanoMine",
    cave: 0x1b1010,
    wall: [0x342525, 0x422b27, 0x50322a],
    wallHighlight: 0x704535,
    floor: [0x382724, 0x422c26, 0x4d3228, 0x58392c],
    accent: 0xff684f,
    crack: 0xb63d2c,
    glow: 0xff7c45,
    motif: "volcanic",
  },
  ancientSite: {
    id: "ancientSite",
    cave: 0x17151a,
    wall: [0x353139, 0x403a43, 0x4b444e],
    wallHighlight: 0x706775,
    floor: [0x39343d, 0x433d47, 0x4b4550, 0x554d5a],
    accent: 0xd7ad55,
    crack: 0x24202a,
    glow: 0x9366bd,
    motif: "ancientBrick",
  },
};

export type FacingDirection = MoveDirection;
export type VisualEffectQuality = "normal" | "reduced";
export type TileVisualVariant = 0 | 1 | 2 | 3 | 4;

export interface MonsterVisualState {
  readonly showBody: boolean;
  readonly showShadow: boolean;
  readonly showHp: boolean;
}

/** フレーム時間に応じて装飾演出だけを段階的に軽量化する。 */
export class VisualQualityController {
  #quality: VisualEffectQuality = "normal";
  #slowFrames = 0;

  /** 現在の演出品質を返す。 */
  get quality(): VisualEffectQuality {
    return this.#quality;
  }

  /** フレーム時間を記録し、継続的な遅延時だけ品質を下げる。 */
  recordFrame(deltaMs: number): VisualEffectQuality {
    this.#slowFrames =
      deltaMs > 25 ? this.#slowFrames + 1 : Math.max(0, this.#slowFrames - 2);
    if (this.#slowFrames >= 30) this.#quality = "reduced";
    if (this.#slowFrames === 0 && deltaMs < 20) this.#quality = "normal";
    return this.#quality;
  }
}

export function getAreaVisualTheme(id: AreaVisualThemeId): AreaVisualTheme {
  return AREA_VISUAL_THEMES[id];
}

export function getTileVisualVariant(
  seed: string,
  x: number,
  y: number,
  state: TileState,
  count = 5,
): TileVisualVariant {
  const safeCount = Math.max(1, Math.min(5, Math.floor(count)));
  const hash = visualHash(`${seed}:${state}`);
  return ((hash + x + y * 2) % safeCount) as TileVisualVariant;
}

export function facingFromMoveDirection(
  direction: MoveDirection,
): FacingDirection {
  return direction;
}

export function getMonsterVisualState(
  discovered: boolean,
  hp: number,
  maxHp: number,
): MonsterVisualState {
  return {
    showBody: discovered,
    showShadow: discovered,
    showHp: discovered && hp < maxHp,
  };
}

export function visualHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function isForbiddenGuideMagenta(color: number): boolean {
  const red = (color >> 16) & 0xff;
  const green = (color >> 8) & 0xff;
  const blue = color & 0xff;
  return red >= 190 && blue >= 180 && green <= 80;
}
