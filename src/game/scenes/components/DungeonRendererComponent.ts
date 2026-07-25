import Phaser from "phaser";
import { BALANCE } from "../../../data/balance";
import type { RenderPatch, TileKey } from "../../presentation/RenderPatch";
import { toTileKey } from "../../presentation/RenderPatch";
import type {
  DomainEvent,
  ExplorationState,
} from "../../state/ExplorationState";
import { drawGameIcon } from "../uiHelpers";

const TILE_SIZE = BALANCE.presentation.tileSize;

/** 永続GameObjectへ探索盤面の差分を適用するレンダラー。 */
export class DungeonRendererComponent {
  /** 所有Scene。 */
  readonly #scene: Phaser.Scene;
  /** 安定キーで保持するタイル表示。 */
  readonly #tileObjects = new Map<TileKey, Phaser.GameObjects.Container>();
  /** IDで保持するモンスター表示。 */
  readonly #monsterObjects = new Map<string, Phaser.GameObjects.Container>();
  /** ワールド表示のルート。 */
  readonly #root: Phaser.GameObjects.Container;
  /** 永続化したプレイヤー表示。 */
  readonly #player: Phaser.GameObjects.Arc;
  /** プレイヤー追従ライト。 */
  readonly #light: Phaser.GameObjects.Arc;
  /** 最後に適用した描画revision。 */
  #revision = 0;

  /** 初期盤面を一度だけ生成する。 */
  constructor(scene: Phaser.Scene, state: ExplorationState) {
    this.#scene = scene;
    this.#root = scene.add.container(0, 0);
    this.#light = scene.add.circle(0, 0, TILE_SIZE * 2.4, 0xffb13b, 0.08);
    this.#player = scene.add.circle(0, 0, 10, 0xffb13b);
    this.#root.add([this.#light, this.#player]);
    this.render(state);
  }

  /** 互換APIとして表示範囲を全更新する。 */
  render(state: ExplorationState): void {
    this.applyPatch(state, {
      revision: this.#revision + 1,
      fullRebuild: "initial",
      changedTiles: state.dungeon.field.tiles.map((tile) =>
        toTileKey(tile.x, tile.y),
      ),
      changedHudFields: [],
      playerChanged: true,
      cameraChanged: true,
      lightingChanged: true,
      changedMonsterIds: state.monsters.map((monster) => monster.id),
      removedMonsterIds: [],
      events: [],
    });
  }

  /** 新しいrevisionの差分だけを既存GameObjectへ適用する。 */
  applyPatch(state: ExplorationState, patch: RenderPatch): void {
    if (patch.revision <= this.#revision) return;
    this.#revision = patch.revision;
    if (patch.fullRebuild) {
      for (const object of this.#tileObjects.values()) object.destroy();
      this.#tileObjects.clear();
    }
    const visibleKeys = this.visibleTileKeys(state);
    for (const [key, object] of this.#tileObjects) {
      if (!visibleKeys.has(key)) {
        object.destroy();
        this.#tileObjects.delete(key);
      }
    }
    const requestedKeys = patch.fullRebuild
      ? visibleKeys
      : new Set(patch.changedTiles.filter((key) => visibleKeys.has(key)));
    for (const key of requestedKeys) this.replaceTile(state, key);
    if (patch.playerChanged || patch.fullRebuild) this.updatePlayer(state);
    this.updateMonsters(state, patch);
    this.handleEvents(patch.events);
  }

  /** 現在の表示オブジェクト数を返す。 */
  getObjectCounts(): { readonly gameObjects: number; readonly texts: number } {
    let texts = 0;
    for (const container of this.#tileObjects.values()) {
      texts += container.list.filter(
        (object) => object instanceof Phaser.GameObjects.Text,
      ).length;
    }
    return {
      gameObjects:
        this.#tileObjects.size + this.#monsterObjects.size + 2 + texts,
      texts,
    };
  }

  /** DomainEventを一時演出へ変換する。 */
  handleEvents(events: readonly DomainEvent[]): void {
    if (events.some((event) => event.type === "hazardTriggered")) {
      this.#scene.cameras.main.shake(120, 0.006);
    }
  }

  /** 所有するGameObjectを1回だけ破棄する。 */
  destroy(): void {
    this.#root.destroy(true);
    this.#tileObjects.clear();
    this.#monsterObjects.clear();
  }

  private replaceTile(state: ExplorationState, key: TileKey): void {
    this.#tileObjects.get(key)?.destroy();
    this.#tileObjects.delete(key);
    const tile = state.dungeon.field.tiles.find(
      (candidate) => toTileKey(candidate.x, candidate.y) === key,
    );
    if (!tile || (!tile.isRevealed && tile.discovery !== "hidden")) return;
    const x = tile.x * TILE_SIZE + TILE_SIZE / 2;
    const y = tile.y * TILE_SIZE + TILE_SIZE / 2;
    const color = tile.isWalkable
      ? 0x3f382d
      : tile.state === "blocked"
        ? 0x171717
        : 0x6b4d31;
    const children: Phaser.GameObjects.GameObject[] = [
      this.#scene.add.rectangle(0, 0, TILE_SIZE - 1, TILE_SIZE - 1, color),
    ];
    const count = tile.adjacentHazardCount ?? tile.adjacentMineCount;
    if (tile.isRevealed && count > 0) {
      children.push(
        this.#scene.add
          .text(0, 0, String(count), {
            fontSize: "18px",
            color: numberColor(count),
            fontStyle: "bold",
          })
          .setOrigin(0.5),
      );
    }
    if (tile.mark === "flag") {
      children.push(drawGameIcon(this.#scene, 0, 0, "flag", 0xff563f));
    }
    const container = this.#scene.add.container(x, y, children);
    this.#root.add(container);
    this.#tileObjects.set(key, container);
  }

  private updatePlayer(state: ExplorationState): void {
    const x = state.player.position.x * TILE_SIZE;
    const y = state.player.position.y * TILE_SIZE;
    this.#player.setPosition(x, y);
    this.#light.setPosition(x, y);
  }

  private updateMonsters(state: ExplorationState, patch: RenderPatch): void {
    for (const id of patch.removedMonsterIds) {
      this.#monsterObjects.get(id)?.destroy();
      this.#monsterObjects.delete(id);
    }
    for (const id of patch.changedMonsterIds) {
      const monster = state.monsters.find((candidate) => candidate.id === id);
      this.#monsterObjects.get(id)?.destroy();
      this.#monsterObjects.delete(id);
      if (!monster || monster.defeated) continue;
      const marker = this.#scene.add.container(
        (monster.position.x + 0.5) * TILE_SIZE,
        (monster.position.y + 0.5) * TILE_SIZE,
        [this.#scene.add.circle(0, 0, 9, 0xb84c3a)],
      );
      this.#root.add(marker);
      this.#monsterObjects.set(id, marker);
    }
  }

  private visibleTileKeys(state: ExplorationState): Set<TileKey> {
    const overscan = BALANCE.presentation.chunkOverscanTiles;
    const halfColumns = Math.ceil(
      this.#scene.scale.width / this.#scene.cameras.main.zoom / TILE_SIZE / 2,
    );
    const halfRows = Math.ceil(
      this.#scene.scale.height / this.#scene.cameras.main.zoom / TILE_SIZE / 2,
    );
    return new Set(
      state.dungeon.field.tiles
        .filter(
          (tile) =>
            Math.abs(tile.x - state.player.gridPosition.x) <=
              halfColumns + overscan &&
            Math.abs(tile.y - state.player.gridPosition.y) <=
              halfRows + overscan,
        )
        .map((tile) => toTileKey(tile.x, tile.y)),
    );
  }
}

function numberColor(count: number): string {
  if (count === 1) return "#4da3ff";
  if (count === 2) return "#69c34a";
  if (count === 3) return "#e65343";
  if (count === 4) return "#9366bd";
  return "#f0a34c";
}
