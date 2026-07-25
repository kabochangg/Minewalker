import Phaser from "phaser";
import { addButton, COLORS } from "../uiHelpers";

export type ExplorationActionMode =
  "mine" | "mark" | "dispose" | "attack" | "run" | "bag";

/** 44px以上の探索アクション操作を描画する。 */
export class ActionBarComponent {
  readonly #objects: Phaser.GameObjects.GameObject[] = [];

  /** 下部アクションバーを生成する。 */
  constructor(
    scene: Phaser.Scene,
    onSelect: (mode: ExplorationActionMode) => void,
  ) {
    const actions: readonly [ExplorationActionMode, string][] = [
      ["mine", "採掘"],
      ["mark", "危険"],
      ["dispose", "処理"],
      ["attack", "攻撃"],
      ["run", "走行"],
      ["bag", "袋"],
    ];
    actions.forEach(([mode, label], index) => {
      this.#objects.push(
        addButton(
          scene,
          35 + index * 64,
          800,
          58,
          52,
          label,
          () => onSelect(mode),
          mode === "dispose" ? COLORS.green : COLORS.panelLight,
        ),
      );
    });
  }

  /** 所有するGameObjectを破棄する。 */
  destroy(): void {
    this.#objects.forEach((object) => object.destroy());
  }
}
