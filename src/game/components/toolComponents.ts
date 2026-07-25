import type { EquipmentId } from "../../data/equipment";

/** 危険物処理道具の状態を表す。 */
export interface ToolConditionComponent {
  readonly equipmentId: EquipmentId;
  readonly currentDurability: number;
  readonly maxDurability: number;
  readonly tier: number;
  readonly repairCount: number;
}

/** 利用可能な入力方式を表す。 */
export type InputMode = "touchJoystick" | "touchTap" | "keyboard";

/** 入力方式と操作設定を表す。 */
export interface InputProfile {
  readonly mode: InputMode;
  readonly keyBindings: Readonly<Record<string, string>>;
  readonly runBehavior: "hold" | "toggle";
  readonly markBehavior: "longPress" | "actionButton";
}

/** 標準の入力設定を返す。 */
export function createDefaultInputProfile(): InputProfile {
  return {
    mode: "touchJoystick",
    keyBindings: {
      up: "KeyW",
      down: "KeyS",
      left: "KeyA",
      right: "KeyD",
      run: "ShiftLeft",
    },
    runBehavior: "hold",
    markBehavior: "actionButton",
  };
}
