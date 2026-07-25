import { BALANCE } from "../../data/balance";

/** スタミナ更新に必要な最小状態を表す。 */
export interface StaminaState {
  readonly stamina: number;
  readonly maxStamina: number;
}

/** アクティブ時間だけスタミナを回復する。 */
export function recoverStamina(
  state: StaminaState,
  elapsedActiveMs: number,
  active: boolean,
): StaminaState {
  if (!active || elapsedActiveMs <= 0) return state;
  return {
    ...state,
    stamina: Math.min(
      state.maxStamina,
      state.stamina +
        (elapsedActiveMs / 1_000) * BALANCE.stamina.recoveryPerSecond,
    ),
  };
}

/** 移動方式に応じたスタミナを消費し、継続可否を返す。 */
export function applyLocomotionCost(
  state: StaminaState,
  locomotion: "walk" | "run",
  elapsedActiveMs: number,
): { readonly state: StaminaState; readonly locomotion: "walk" | "run" } {
  if (locomotion === "walk" || elapsedActiveMs <= 0) {
    return { state, locomotion: "walk" };
  }
  const cost = (elapsedActiveMs / 1_000) * BALANCE.stamina.runCostPerSecond;
  if (state.stamina < cost) return { state, locomotion: "walk" };
  return {
    state: { ...state, stamina: Math.max(0, state.stamina - cost) },
    locomotion: "run",
  };
}

/** 固定アクションコストを安全に消費する。 */
export function spendStamina(
  state: StaminaState,
  cost: number,
): StaminaState | undefined {
  if (cost < 0 || state.stamina < cost) return undefined;
  return { ...state, stamina: Math.max(0, state.stamina - cost) };
}
