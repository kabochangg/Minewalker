import Phaser from "phaser";
import type {
  DomainEvent,
  ExplorationState,
} from "../../state/ExplorationState";

const TILE_SIZE = 32;

/** 探索盤面だけを描画しHUDやゲーム規則を所有しない。 */
export class DungeonRendererComponent {
  readonly #scene: Phaser.Scene;
  readonly #objects: Phaser.GameObjects.GameObject[] = [];

  /** 初期盤面を描画する。 */
  constructor(scene: Phaser.Scene, state: ExplorationState) {
    this.#scene = scene;
    this.render(state);
  }

  /** 状態からタイル・数字・危険マーク・プレイヤー・死亡地点を描画する。 */
  render(state: ExplorationState): void {
    this.#objects.forEach((object) => object.destroy());
    this.#objects.length = 0;
    const claimedCheckpointIds = new Set(
      state.checkpoints
        .filter((checkpoint) => checkpoint.status === "claimed")
        .map((checkpoint) => checkpoint.id),
    );
    for (const room of state.dungeon.rooms) {
      this.#objects.push(
        this.#scene.add
          .rectangle(
            (room.x + room.width / 2) * TILE_SIZE,
            (room.y + room.height / 2) * TILE_SIZE,
            room.width * TILE_SIZE,
            room.height * TILE_SIZE,
            0x6b4d31,
            0.12,
          )
          .setStrokeStyle(1, 0x9a7045, 0.35),
      );
    }
    for (const tile of state.dungeon.field.tiles) {
      if (!tile.isRevealed && tile.discovery !== "hidden") continue;
      const claimed =
        tile.checkpointId !== undefined &&
        claimedCheckpointIds.has(tile.checkpointId);
      const color = claimed
        ? 0x315f42
        : tile.isWalkable
          ? 0x3f382d
          : tile.state === "blocked"
            ? 0x171717
            : 0x6b4d31;
      const rectangle = this.#scene.add.rectangle(
        tile.x * TILE_SIZE + TILE_SIZE / 2,
        tile.y * TILE_SIZE + TILE_SIZE / 2,
        TILE_SIZE - 1,
        TILE_SIZE - 1,
        color,
      );
      this.#objects.push(rectangle);
      if (
        tile.isRevealed &&
        (tile.adjacentHazardCount ?? tile.adjacentMineCount) > 0
      ) {
        this.#objects.push(
          this.#scene.add
            .text(
              rectangle.x,
              rectangle.y,
              String(tile.adjacentHazardCount ?? tile.adjacentMineCount),
              { fontSize: "16px", color: "#fff" },
            )
            .setOrigin(0.5),
        );
      }
      if (tile.mark === "flag") {
        this.#objects.push(
          this.#scene.add
            .text(rectangle.x, rectangle.y, "⚠", { fontSize: "16px" })
            .setOrigin(0.5),
        );
      }
    }
    this.#objects.push(
      this.#scene.add.circle(
        state.player.position.x * TILE_SIZE,
        state.player.position.y * TILE_SIZE,
        TILE_SIZE * 2.4,
        0xffb13b,
        0.08,
      ),
      this.#scene.add.circle(
        state.player.position.x * TILE_SIZE,
        state.player.position.y * TILE_SIZE,
        10,
        0xffb13b,
      ),
    );
    for (const cache of state.deathCaches) {
      this.#objects.push(
        this.#scene.add
          .text(
            (cache.position.x + 0.5) * TILE_SIZE,
            (cache.position.y + 0.5) * TILE_SIZE,
            "✚",
            { fontSize: "18px", color: "#ff5b4d" },
          )
          .setOrigin(0.5),
      );
    }
  }

  /** DomainEventを短い視覚フィードバックへ変換する。 */
  handleEvents(events: readonly DomainEvent[]): void {
    if (events.some((event) => event.type === "hazardTriggered")) {
      this.#scene.cameras.main.shake(120, 0.006);
    }
  }

  /** 描画物を破棄する。 */
  destroy(): void {
    this.#objects.forEach((object) => object.destroy());
  }
}
