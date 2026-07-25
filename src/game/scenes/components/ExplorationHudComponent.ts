import Phaser from "phaser";
import type { RenderPatch } from "../../presentation/RenderPatch";
import type { ExplorationState } from "../../state/ExplorationState";
import { getUsedCapacity } from "../../systems/InventorySystem";
import { COLORS } from "../uiHelpers";

/** 永続GameObjectで探索中の主要値を表示するHUD。 */
export class ExplorationHudComponent {
  /** HUD全体のルート。 */
  readonly #root: Phaser.GameObjects.Container;
  /** HPとスタミナのバー描画。 */
  readonly #bars: Phaser.GameObjects.Graphics;
  /** HP表示。 */
  readonly #hpText: Phaser.GameObjects.Text;
  /** スタミナ表示。 */
  readonly #staminaText: Phaser.GameObjects.Text;
  /** 道具・素材・移動状態表示。 */
  readonly #detailsText: Phaser.GameObjects.Text;

  /** 初期値でHUDを一度だけ生成する。 */
  constructor(scene: Phaser.Scene, state: ExplorationState) {
    this.#bars = scene.add.graphics();
    this.#hpText = scene.add.text(24, 18, "");
    this.#staminaText = scene.add.text(24, 44, "");
    this.#detailsText = scene.add.text(168, 20, "", {
      fontSize: "13px",
      color: COLORS.text,
    });
    this.#root = scene.add.container(0, 0, [
      this.#bars,
      this.#hpText,
      this.#staminaText,
      this.#detailsText,
    ]);
    this.render(state);
  }

  /** 互換APIとして全HUD項目を更新する。 */
  render(state: ExplorationState): void {
    this.applyPatch(state, {
      revision: 1,
      changedTiles: [],
      changedHudFields: ["hp", "stamina", "inventory", "tool", "locomotion"],
      playerChanged: false,
      cameraChanged: false,
      lightingChanged: false,
      changedMonsterIds: [],
      removedMonsterIds: [],
      events: [],
    });
  }

  /** 指定されたHUD項目だけを更新する。 */
  applyPatch(state: ExplorationState, patch: RenderPatch): void {
    const fields = new Set(patch.changedHudFields);
    if (fields.has("hp") || fields.has("stamina") || patch.fullRebuild) {
      this.drawBars(state);
    }
    if (
      patch.fullRebuild ||
      fields.has("inventory") ||
      fields.has("tool") ||
      fields.has("locomotion")
    ) {
      const tool = state.tools[0];
      const items = {
        capacity: state.inventory.capacity,
        items: state.inventory.items,
        ...state.inventory.consumables,
      };
      this.#detailsText.setText(
        `道具 ${tool?.currentDurability ?? 0}/${tool?.maxDurability ?? 0}\n素材 ${getUsedCapacity(items)}/${state.inventory.capacity}\n${state.player.locomotion === "run" ? "走行" : "歩行"}`,
      );
    }
  }

  /** HUD全体を破棄する。 */
  destroy(): void {
    this.#root.destroy(true);
  }

  private drawBars(state: ExplorationState): void {
    this.#bars.clear();
    drawBar(
      this.#bars,
      20,
      22,
      130,
      state.player.hp / Math.max(1, state.player.maxHp),
      COLORS.red,
    );
    drawBar(
      this.#bars,
      20,
      48,
      130,
      state.player.stamina / Math.max(1, state.player.maxStamina),
      COLORS.green,
    );
    this.#hpText.setText(`HP ${state.player.hp}/${state.player.maxHp}`);
    this.#staminaText.setText(
      `ST ${Math.floor(state.player.stamina)}/${state.player.maxStamina}`,
    );
  }
}

function drawBar(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  ratio: number,
  color: number,
): void {
  graphics.fillStyle(0x17110d, 1);
  graphics.fillRoundedRect(x, y, width, 18, 4);
  graphics.fillStyle(color, 1);
  graphics.fillRoundedRect(
    x + 2,
    y + 2,
    Math.max(2, (width - 4) * Phaser.Math.Clamp(ratio, 0, 1)),
    14,
    3,
  );
}
