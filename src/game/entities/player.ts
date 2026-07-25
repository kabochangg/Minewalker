import { BALANCE } from "../../data/balance";

export type PlayerActionState =
  "idle" | "moving" | "mining" | "attacking" | "damaged" | "usingItem" | "dead";

export interface PlayerState {
  readonly x: number;
  readonly y: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly stamina: number;
  readonly maxStamina: number;
  readonly attack: number;
  readonly defense: number;
  readonly coins: number;
  readonly depth: number;
  readonly actionState: PlayerActionState;
  /** 連続移動の中心座標。旧セーブでは省略される。 */
  readonly position?: { readonly x: number; readonly y: number };
  /** 走行中か歩行中かを表す。 */
  readonly locomotion?: "walk" | "run";
}

export function createInitialPlayer(): PlayerState {
  return {
    x: 4,
    y: 7,
    hp: BALANCE.player.maxHp,
    maxHp: BALANCE.player.maxHp,
    stamina: BALANCE.player.maxStamina,
    maxStamina: BALANCE.player.maxStamina,
    attack: BALANCE.player.attack,
    defense: BALANCE.player.defense,
    coins: 0,
    depth: 0,
    actionState: "idle",
    position: { x: 4.5, y: 7.5 },
    locomotion: "walk",
  };
}

export function movePlayer(
  player: PlayerState,
  x: number,
  y: number,
): PlayerState {
  return {
    ...player,
    x,
    y,
    actionState: "moving",
  };
}

export function damagePlayer(player: PlayerState, damage: number): PlayerState {
  const hp = Math.max(0, player.hp - Math.max(0, damage));
  return {
    ...player,
    hp,
    actionState: hp === 0 ? "dead" : "damaged",
  };
}
