import Phaser from "phaser";
import type { CheckpointComponent } from "../../components/progressionComponents";
import { COLORS } from "../uiHelpers";

/** チェックポイントの全条件と進捗を固定表示する。 */
export class ObjectivePanelComponent {
  readonly #text: Phaser.GameObjects.Text;

  /** 現在のチェックポイントを表示する。 */
  constructor(scene: Phaser.Scene, checkpoint: CheckpointComponent) {
    this.#text = scene.add
      .text(382, 18, formatCheckpoint(checkpoint), {
        fontSize: "12px",
        color: COLORS.text,
        align: "right",
        wordWrap: { width: 150 },
      })
      .setOrigin(1, 0);
  }

  /** 最新進捗へ表示を更新する。 */
  update(checkpoint: CheckpointComponent): void {
    this.#text.setText(formatCheckpoint(checkpoint));
  }

  /** 表示を破棄する。 */
  destroy(): void {
    this.#text.destroy();
  }
}

function formatCheckpoint(checkpoint: CheckpointComponent): string {
  const lines = checkpoint.objectives.map(
    (objective) =>
      `${objective.kind} ${checkpoint.progress[objective.id] ?? 0}/${objective.required}`,
  );
  return [`目標: ${checkpoint.status}`, ...lines].join("\n");
}
