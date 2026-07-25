import Phaser from "phaser";
import { getUsedCapacity } from "../../systems/InventorySystem";
import type { ExplorationState } from "../../state/ExplorationState";
import { addHudBar, COLORS } from "../uiHelpers";

/** 探索状態の主要値を固定HUDとして表示する。 */
export class ExplorationHudComponent {
  readonly #scene: Phaser.Scene;
  readonly #objects: Phaser.GameObjects.GameObject[] = [];

  /** 初期状態でHUDを作成する。 */
  constructor(scene: Phaser.Scene, state: ExplorationState) {
    this.#scene = scene;
    this.render(state);
  }

  /** 状態スナップショットからHUDを差分なしで安全に再描画する。 */
  render(state: ExplorationState): void {
    this.#objects.forEach((object) => object.destroy());
    this.#objects.length = 0;
    this.#objects.push(
      addHudBar(
        this.#scene,
        88,
        30,
        130,
        state.player.hp,
        state.player.maxHp,
        COLORS.red,
        "HP",
      ),
      addHudBar(
        this.#scene,
        88,
        56,
        130,
        state.player.stamina,
        state.player.maxStamina,
        COLORS.green,
        "ST",
      ),
    );
    const tool = state.tools[0];
    const items = {
      capacity: state.inventory.capacity,
      items: state.inventory.items,
      ...state.inventory.consumables,
    };
    this.#objects.push(
      this.#scene.add.text(
        168,
        22,
        `道具 ${tool?.currentDurability ?? 0}/${tool?.maxDurability ?? 0}\n素材 ${getUsedCapacity(items)}/${state.inventory.capacity}\n${state.player.locomotion === "run" ? "走行" : "歩行"}`,
        { fontSize: "13px", color: COLORS.text },
      ),
    );
  }

  /** HUDを破棄する。 */
  destroy(): void {
    this.#objects.forEach((object) => object.destroy());
  }
}
