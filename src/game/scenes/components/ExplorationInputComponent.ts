import Phaser from "phaser";
import type { ExplorationCommand } from "../../state/ExplorationState";

/** Phaser入力を共通の探索コマンドへ正規化する。 */
export class ExplorationInputComponent {
  readonly #scene: Phaser.Scene;
  readonly #dispatch: (command: ExplorationCommand) => void;
  readonly #keys: Record<string, Phaser.Input.Keyboard.Key>;
  #worldPointerBound = false;
  #worldMode: () => "mine" | "mark" | "dispose" | "attack" = () => "mine";
  #receiptSequence = 0;
  #worldPointerHandler?: (pointer: Phaser.Input.Pointer) => void;

  /** Sceneとコマンド送信先を関連付ける。 */
  constructor(
    scene: Phaser.Scene,
    dispatch: (command: ExplorationCommand) => void,
  ) {
    this.#scene = scene;
    this.#dispatch = dispatch;
    this.#keys =
      (scene.input.keyboard?.addKeys(
        "W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT",
      ) as Record<string, Phaser.Input.Keyboard.Key>) ?? {};
  }

  /** キーボード状態を1フレーム分の移動コマンドへ変換する。 */
  update(elapsedMs: number): void {
    const horizontal =
      (this.#keys.D?.isDown || this.#keys.RIGHT?.isDown ? 1 : 0) -
      (this.#keys.A?.isDown || this.#keys.LEFT?.isDown ? 1 : 0);
    const vertical =
      (this.#keys.S?.isDown || this.#keys.DOWN?.isDown ? 1 : 0) -
      (this.#keys.W?.isDown || this.#keys.UP?.isDown ? 1 : 0);
    if (horizontal === 0 && vertical === 0) return;
    this.#dispatch({
      type: "move",
      direction: { x: horizontal, y: vertical },
      elapsedMs,
      locomotion: this.#keys.SHIFT?.isDown ? "run" : "walk",
    });
  }

  /** タップしたタイルと現在モードを操作コマンドへ変換する。 */
  dispatchTile(
    mode: "mine" | "mark" | "dispose" | "attack",
    x: number,
    y: number,
  ): void {
    if (mode === "mine") this.#dispatch({ type: "mine", x, y });
    if (mode === "mark") this.#dispatch({ type: "toggleDangerMark", x, y });
    if (mode === "dispose") this.#dispatch({ type: "disposeHazard", x, y });
    if (mode === "attack") this.#dispatch({ type: "attack", x, y });
  }

  /** ワールド全体へ1つだけポインターリスナーを登録する。 */
  bindWorldPointer(
    camera: Phaser.Cameras.Scene2D.Camera,
    tileSize: number,
    mode: () => "mine" | "mark" | "dispose" | "attack",
    onReceipt?: (receiptId: string) => void,
  ): void {
    if (this.#worldPointerBound) return;
    this.#worldPointerBound = true;
    this.#worldMode = mode;
    this.#worldPointerHandler = (pointer: Phaser.Input.Pointer) => {
      const point = camera.getWorldPoint(pointer.x, pointer.y);
      const receiptId = `input-${++this.#receiptSequence}`;
      onReceipt?.(receiptId);
      this.dispatchTile(
        this.#worldMode(),
        Math.floor(point.x / tileSize),
        Math.floor(point.y / tileSize),
      );
    };
    this.#scene.input.on("pointerup", this.#worldPointerHandler);
  }

  /** Scene終了時に保有する入力参照を解除する。 */
  destroy(): void {
    for (const key of Object.values(this.#keys)) key.destroy();
    this.#scene.input.keyboard?.resetKeys();
    if (this.#worldPointerBound && this.#worldPointerHandler) {
      this.#scene.input.off("pointerup", this.#worldPointerHandler);
      this.#worldPointerBound = false;
      this.#worldPointerHandler = undefined;
    }
  }
}
