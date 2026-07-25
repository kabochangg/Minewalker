import Phaser from "phaser";
import { GAME_FONT_FAMILY } from "../../assets/fontCatalog";

/** 各Sceneで生成されたTextへ共通日本語フォントを自動適用する。 */
export class GameFontScenePlugin extends Phaser.Plugins.ScenePlugin {
  /** SceneのDisplayList監視を開始する。 */
  boot(): void {
    this.systems?.events.on(
      Phaser.Scenes.Events.ADDED_TO_SCENE,
      this.applyFont,
      this,
    );
    this.systems?.events.once(Phaser.Scenes.Events.DESTROY, this.destroy, this);
  }

  /** 新規Textへ共通フォントを設定する。 */
  private applyFont(gameObject: Phaser.GameObjects.GameObject): void {
    if (gameObject instanceof Phaser.GameObjects.Text) {
      gameObject.setFontFamily(GAME_FONT_FAMILY);
    }
  }

  /** Scene破棄時に監視を解除する。 */
  destroy(): void {
    this.systems?.events.off(
      Phaser.Scenes.Events.ADDED_TO_SCENE,
      this.applyFont,
      this,
    );
    super.destroy();
  }
}
