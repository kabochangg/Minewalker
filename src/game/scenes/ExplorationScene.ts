import Phaser from "phaser";
import { getSelectedAreaId } from "../../app/routeState";
import {
  ASSET_KEYS,
  getMonsterAssetKey,
  getTileAssetKey,
  type TileVisual,
} from "../../assets/assetCatalog";
import { getArea } from "../../data/areas";
import { getItemName } from "../../data/items";
import { getMonster, type MonsterId } from "../../data/monsters";
import { clearRun, loadRun, saveRun } from "../../save/RunSaveSystem";
import { createInitialPlayer, type PlayerState } from "../entities/player";
import type { Minefield, Tile } from "../map/types";
import { getTile, replaceTile } from "../map/types";
import { getEquippedStats, getGameState } from "../state/GameState";
import { attackMonster, type CombatantState } from "../systems/CombatSystem";
import { rollWeightedDrop } from "../systems/DropSystem";
import { playFeedback, type FeedbackCue } from "../systems/FeedbackSystem";
import {
  addItem,
  consumePotion,
  createEmptyItemBag,
  getUsedCapacity,
  type InventoryState,
} from "../systems/InventorySystem";
import {
  coolMine,
  disableMine,
  toggleFlag,
} from "../systems/MineHandlingSystem";
import { generateMinefield, isAdjacent } from "../systems/MinefieldSystem";
import { mineTile } from "../systems/MiningSystem";
import {
  directionFromAngle,
  MOVE_VECTORS,
  tryMove,
  type MoveDirection,
} from "../systems/MovementSystem";
import { addButton, addHudBar, COLORS, drawPixelMiner } from "./uiHelpers";

type ActionMode = "mine" | "cool" | "disable" | "potion" | "bag";

interface MonsterRuntime {
  readonly id: MonsterId;
  readonly tileX: number;
  readonly tileY: number;
  readonly combatant: CombatantState;
}

interface ExplorationE2EBridge {
  readonly mineWall: () => void;
  readonly coolMine: () => void;
  readonly mineTreatedMine: () => void;
  readonly reachExit: () => void;
  readonly snapshot: () => {
    readonly usedCapacity: number;
    readonly cleared: boolean;
    readonly message: string;
  };
}

const TILE_SIZE = 48;
const BOARD_X = 0;
const BOARD_Y = 0;
const WORLD_TOP = 112;
const WORLD_HEIGHT = 538;
const MOVE_DURATION = 135;
const JOYSTICK_X = 68;
const JOYSTICK_Y = 770;
const JOYSTICK_RADIUS = 58;
const JOYSTICK_DEAD_ZONE = 14;

export class ExplorationScene extends Phaser.Scene {
  private field!: Minefield;
  private player!: PlayerState;
  private inventory!: InventoryState;
  private mode: ActionMode = "mine";
  private message = "数字を頼りに安全な壁を掘り進めよう";
  private monsters: MonsterRuntime[] = [];
  private defeatedMonsters: MonsterId[] = [];
  private bossDefeated = false;
  private cleared = false;
  private failed = false;
  private resultQueued = false;
  private worldCamera!: Phaser.Cameras.Scene2D.Camera;
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private playerSprite?: Phaser.GameObjects.GameObject & {
    x: number;
    y: number;
  };
  private joystickKnob?: Phaser.GameObjects.Arc;
  private joystickPointerId?: number;
  private heldDirection?: MoveDirection;
  private queuedDirection?: MoveDirection;
  private moving = false;
  private readonly tileObjects: Phaser.GameObjects.GameObject[] = [];
  private readonly hudObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super("ExplorationScene");
  }

  create(): void {
    this.worldCamera = this.cameras.main;
    this.worldCamera.setViewport(0, WORLD_TOP, 390, WORLD_HEIGHT);
    this.worldCamera.setZoom(1.1);
    this.worldCamera.setBackgroundColor("#0b0f12");
    this.uiCamera = this.cameras.add(0, 0, 390, 844, false, "ui");
    this.uiCamera.transparent = true;
    const resumed = loadRun();
    if (resumed?.areaId === getSelectedAreaId()) {
      this.field = resumed.field;
      this.player = resumed.player;
      this.inventory = resumed.inventory;
      this.monsters = [...resumed.monsters];
      this.defeatedMonsters = [...resumed.defeatedMonsters];
      this.bossDefeated = resumed.bossDefeated;
      this.message = "中断した探索を再開しました";
    } else {
      this.field = this.createScenarioField();
      this.player = this.createPlayer();
      this.inventory = this.createRunInventory();
      this.monsters = this.createMonsters();
    }
    if (
      import.meta.env.VITE_E2E === "1" &&
      new URLSearchParams(window.location.search).has("e2e")
    ) {
      this.prepareE2EScenario();
    }
    this.input.on("pointermove", this.handleJoystickMove, this);
    this.input.on("pointerup", this.releaseJoystick, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdownInput, this);
    this.render();
  }

  private createScenarioField(): Minefield {
    const area = getArea(getSelectedAreaId());
    const width = 11;
    const height = 16;
    const mineCount = Math.floor(width * height * area.mineDensity);
    const generated = generateMinefield({
      width,
      height,
      mineCount,
      safeRadius: 1,
      seed: `minewalker:${area.id}:${Date.now()}`,
      startX: 4,
      startY: 7,
    });
    const exitTile = getTile(generated, 9, 14);
    if (!exitTile) {
      return generated;
    }
    return replaceTile(generated, {
      ...exitTile,
      state: "exit",
      hasMine: false,
      mineId: undefined,
      isWalkable: false,
      isRevealed: false,
    });
  }

  private createPlayer(): PlayerState {
    const save = getGameState();
    const equipment = getEquippedStats(save);
    const initial = createInitialPlayer();
    return {
      ...initial,
      hp: save.player.hp,
      maxHp: save.player.maxHp,
      stamina: save.player.stamina,
      maxStamina: save.player.maxStamina,
      attack: save.player.attack + equipment.attack,
      defense: save.player.defense + equipment.defense,
      coins: save.player.coins,
      depth: 0,
    };
  }

  private createRunInventory(): InventoryState {
    const save = getGameState();
    return {
      capacity: save.inventory.capacity,
      items: createEmptyItemBag(),
      coolants: save.inventory.coolants,
      disablers: save.inventory.disablers,
      potions: save.inventory.potions,
      maps: save.inventory.maps,
    };
  }

  private createMonsters(): MonsterRuntime[] {
    const area = getArea(getSelectedAreaId());
    const spawns = [
      { tileX: 7, tileY: 5 },
      { tileX: 3, tileY: 11 },
    ];
    return area.monsterIds
      .slice(0, area.id === "area.ancientSite" ? 2 : 1)
      .map((monsterId, index) => {
        const monster = getMonster(monsterId);
        const spawn = spawns[index] ?? spawns[0];
        return {
          id: monsterId,
          tileX: spawn.tileX,
          tileY: spawn.tileY,
          combatant: { hp: monster.hp, maxHp: monster.hp },
        };
      });
  }

  private render(): void {
    this.clearObjects(this.tileObjects);
    this.clearObjects(this.hudObjects);
    this.drawBackdrop();
    this.drawTiles();
    this.drawPlayer();
    this.drawMonsters();
    this.drawHud();
    this.drawMessage();
    this.drawActions();
    this.worldCamera.ignore(this.hudObjects);
    this.uiCamera.ignore(this.tileObjects);
    if (!this.cleared && !this.failed) {
      this.saveRunState();
    }
    if ((this.cleared || this.failed) && !this.resultQueued) {
      this.resultQueued = true;
      clearRun();
      this.time.delayedCall(600, () => {
        this.scene.start("ResultScene", {
          success: this.cleared,
          depth: this.player.depth,
          inventory: this.inventory,
          defeatedMonsters: this.defeatedMonsters,
          bossDefeated: this.bossDefeated,
        });
      });
    }
  }

  private drawBackdrop(): void {
    const graphics = this.add.graphics();
    this.tileObjects.push(graphics);
    graphics.fillStyle(0x11100d);
    graphics.fillRect(
      0,
      0,
      this.field.width * TILE_SIZE,
      this.field.height * TILE_SIZE,
    );
    graphics.fillStyle(0x19140f);
    graphics.fillRect(
      0,
      0,
      this.field.width * TILE_SIZE,
      this.field.height * TILE_SIZE,
    );
    graphics.fillStyle(this.getAreaGlow(), 0.13);
    graphics.fillCircle(264, 330, 180);
  }

  private drawTiles(): void {
    const theme = getArea(getSelectedAreaId()).theme;
    for (const tile of this.field.tiles) {
      const x = BOARD_X + tile.x * TILE_SIZE;
      const y = BOARD_Y + tile.y * TILE_SIZE;
      const visual = this.getTileVisual(tile);
      const key = getTileAssetKey(theme, visual);
      const hitTarget = this.textures.exists(key)
        ? this.add
            .image(x, y, key)
            .setOrigin(0)
            .setDisplaySize(TILE_SIZE - 1, TILE_SIZE - 1)
        : this.add
            .rectangle(
              x,
              y,
              TILE_SIZE - 2,
              TILE_SIZE - 2,
              this.getTileColor(tile),
              1,
            )
            .setOrigin(0)
            .setStrokeStyle(1, 0x2d251c);
      hitTarget.setInteractive({ useHandCursor: true });
      hitTarget.on("pointerup", (pointer: Phaser.Input.Pointer) => {
        if (pointer.getDuration() > 450) {
          this.handleFlag(tile);
          return;
        }
        this.handleTileInteraction(tile);
      });
      this.tileObjects.push(hitTarget);

      if (tile.isRevealed && tile.adjacentMineCount > 0) {
        this.tileObjects.push(
          this.add
            .text(
              x + TILE_SIZE / 2,
              y + TILE_SIZE / 2,
              String(tile.adjacentMineCount),
              {
                fontFamily: "sans-serif",
                fontSize: "22px",
                fontStyle: "bold",
                color: this.getNumberColor(tile.adjacentMineCount),
              },
            )
            .setOrigin(0.5),
        );
      }
      if (tile.mark === "flag") {
        this.tileObjects.push(
          this.add
            .text(x + 17, y + 16, "⚑", { fontSize: "20px", color: "#ff563f" })
            .setOrigin(0.5),
        );
      }
      if (
        !this.textures.exists(key) &&
        tile.hasMine &&
        (tile.isRevealed ||
          tile.state === "cooledMine" ||
          tile.state === "disabledMine")
      ) {
        const symbol =
          tile.state === "cooledMine"
            ? "❄"
            : tile.state === "disabledMine"
              ? "✓"
              : "●";
        this.tileObjects.push(
          this.add
            .text(x + 16, y + 16, symbol, {
              fontSize: "18px",
              color: "#ffd2c2",
            })
            .setOrigin(0.5),
        );
      }
      if (!this.textures.exists(key) && tile.state === "exit") {
        this.tileObjects.push(
          this.add
            .text(x + 16, y + 16, "▣", { fontSize: "21px", color: "#f5b83f" })
            .setOrigin(0.5),
        );
      }
    }
  }

  private drawPlayer(): void {
    const x = BOARD_X + this.player.x * TILE_SIZE + TILE_SIZE / 2;
    const y = BOARD_Y + this.player.y * TILE_SIZE + TILE_SIZE / 2;
    if (this.textures.exists(ASSET_KEYS.player)) {
      const sprite = this.add
        .image(x, y, ASSET_KEYS.player)
        .setDisplaySize(58, 58);
      this.playerSprite = sprite;
      this.tileObjects.push(sprite);
      this.followPlayer(sprite);
      return;
    }
    const sprite = drawPixelMiner(this, x, y).setScale(1.25);
    this.playerSprite = sprite;
    this.tileObjects.push(sprite);
    this.followPlayer(sprite);
  }

  private prepareE2EScenario(): void {
    const safe = getTile(this.field, this.player.x, this.player.y + 1);
    const mine = getTile(this.field, this.player.x + 1, this.player.y);
    const exit = getTile(this.field, this.player.x - 1, this.player.y);
    if (!safe || !mine || !exit) return;
    this.field = replaceTile(this.field, {
      ...safe,
      state: "hiddenWall",
      hasMine: false,
      mark: "none",
      durability: 1,
      isWalkable: false,
      isRevealed: false,
    });
    this.field = replaceTile(this.field, {
      ...mine,
      state: "mineWall",
      hasMine: true,
      mark: "none",
      durability: 1,
      isWalkable: false,
      isRevealed: false,
    });
    this.field = replaceTile(this.field, {
      ...exit,
      state: "exit",
      hasMine: false,
      mark: "none",
      durability: 1,
      isWalkable: false,
      isRevealed: false,
    });
    this.monsters = [];
    const browserWindow = window as typeof window & {
      __minewalkerE2E?: ExplorationE2EBridge;
    };
    const currentTile = (tile: Tile): Tile =>
      getTile(this.field, tile.x, tile.y) ?? tile;
    browserWindow.__minewalkerE2E = {
      mineWall: () => this.handleTileInteraction(currentTile(safe)),
      coolMine: () => {
        this.mode = "cool";
        this.handleTileInteraction(currentTile(mine));
      },
      mineTreatedMine: () => {
        this.mode = "mine";
        this.handleTileInteraction(currentTile(mine));
      },
      reachExit: () => this.handleTileInteraction(currentTile(exit)),
      snapshot: () => ({
        usedCapacity: getUsedCapacity(this.inventory),
        cleared: this.cleared,
        message: this.message,
      }),
    };
  }

  private drawMonsters(): void {
    for (const monster of this.monsters) {
      const x = BOARD_X + monster.tileX * TILE_SIZE + TILE_SIZE / 2;
      const y = BOARD_Y + monster.tileY * TILE_SIZE + TILE_SIZE / 2;
      const definition = getMonster(monster.id);
      const assetKey = getMonsterAssetKey(monster.id);
      const body = this.textures.exists(assetKey)
        ? this.add
            .image(x, y, assetKey)
            .setDisplaySize(
              definition.boss ? 50 : 40,
              definition.boss ? 50 : 40,
            )
        : this.add
            .circle(
              x,
              y + 3,
              definition.boss ? 16 : 13,
              definition.boss ? 0xa84fd4 : 0x65b83f,
            )
            .setStrokeStyle(2, 0x234914);
      const hpWidth = 28 * (monster.combatant.hp / monster.combatant.maxHp);
      const hp = this.add
        .rectangle(x - 14, y - 17, hpWidth, 4, COLORS.red)
        .setOrigin(0, 0.5);
      this.tileObjects.push(body, hp);
    }
  }

  private drawHud(): void {
    const area = getArea(getSelectedAreaId());
    this.hudObjects.push(
      addHudBar(
        this,
        82,
        22,
        132,
        this.player.hp,
        this.player.maxHp,
        COLORS.red,
        "HP",
      ),
    );
    this.hudObjects.push(
      addHudBar(
        this,
        82,
        48,
        132,
        this.player.stamina,
        this.player.maxStamina,
        COLORS.green,
        "ST",
      ),
    );
    this.hudObjects.push(
      this.add
        .text(205, 26, `${this.player.coins}C`, {
          fontSize: "15px",
          color: COLORS.text,
        })
        .setOrigin(0.5),
    );
    this.hudObjects.push(
      this.add
        .text(
          288,
          26,
          `袋 ${getUsedCapacity(this.inventory)}/${this.inventory.capacity}`,
          { fontSize: "15px", color: COLORS.text },
        )
        .setOrigin(0.5),
    );
    this.hudObjects.push(
      this.add
        .text(335, 58, `${area.name}\n${this.player.depth}m`, {
          fontSize: "12px",
          color: COLORS.text,
          align: "center",
        })
        .setOrigin(0.5),
    );
    this.hudObjects.push(
      addButton(this, 360, 104, 44, 44, "≡", () => this.openMenu()),
    );
  }

  private drawMessage(): void {
    const box = this.add
      .rectangle(195, 652, 298, 54, 0x14100b, 0.92)
      .setStrokeStyle(2, COLORS.goldDark);
    const text = this.add
      .text(195, 652, this.message, {
        fontSize: "15px",
        color: COLORS.text,
        align: "center",
        wordWrap: { width: 270 },
      })
      .setOrigin(0.5);
    this.hudObjects.push(box, text);
  }

  private drawActions(): void {
    const actions: readonly [ActionMode, string, string][] = [
      ["mine", "採掘", "-"],
      ["cool", "冷却", String(this.inventory.coolants)],
      ["disable", "解除", String(this.inventory.disablers)],
      ["potion", "回復", String(this.inventory.potions)],
      [
        "bag",
        "バッグ",
        `${getUsedCapacity(this.inventory)}/${this.inventory.capacity}`,
      ],
    ];
    const positions = [
      { x: 174, y: 744 },
      { x: 236, y: 744 },
      { x: 298, y: 744 },
      { x: 205, y: 804 },
      { x: 267, y: 804 },
    ] as const;
    actions.forEach(([mode, label, count], index) => {
      const position = positions[index];
      const fill = this.mode === mode ? COLORS.goldDark : COLORS.panelLight;
      this.hudObjects.push(
        addButton(
          this,
          position.x,
          position.y,
          56,
          52,
          `${label}\n${count}`,
          () => {
            this.mode = mode;
            if (mode === "potion") {
              this.usePotion();
              return;
            }
            this.message =
              mode === "bag"
                ? `バッグ ${getUsedCapacity(this.inventory)}/${this.inventory.capacity}`
                : `${label}モード`;
            this.render();
          },
          fill,
        ),
      );
    });
    this.drawJoystick();
  }

  private drawJoystick(): void {
    const base = this.add
      .circle(JOYSTICK_X, JOYSTICK_Y, JOYSTICK_RADIUS, 0x201a14, 0.94)
      .setStrokeStyle(3, COLORS.goldDark);
    const knob = this.add
      .circle(JOYSTICK_X, JOYSTICK_Y, 24, COLORS.panelLight, 1)
      .setStrokeStyle(2, COLORS.gold);
    const zone = this.add
      .zone(JOYSTICK_X, JOYSTICK_Y, JOYSTICK_RADIUS * 2, JOYSTICK_RADIUS * 2)
      .setInteractive();
    zone.on(
      "pointerdown",
      (
        pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation();
        this.joystickPointerId = pointer.id;
        this.updateJoystick(pointer);
      },
    );
    this.joystickKnob = knob;
    this.hudObjects.push(base, knob, zone);
  }

  private readonly handleJoystickMove = (
    pointer: Phaser.Input.Pointer,
  ): void => {
    if (pointer.id !== this.joystickPointerId || !pointer.isDown) {
      return;
    }
    this.updateJoystick(pointer);
  };

  private updateJoystick(pointer: Phaser.Input.Pointer): void {
    const dx = pointer.x - JOYSTICK_X;
    const dy = pointer.y - JOYSTICK_Y;
    const distance = Math.hypot(dx, dy);
    if (distance < JOYSTICK_DEAD_ZONE) {
      this.heldDirection = undefined;
      this.queuedDirection = undefined;
      this.joystickKnob?.setPosition(JOYSTICK_X, JOYSTICK_Y);
      return;
    }
    const scale = Math.min(distance, JOYSTICK_RADIUS - 8) / distance;
    this.joystickKnob?.setPosition(
      JOYSTICK_X + dx * scale,
      JOYSTICK_Y + dy * scale,
    );
    const direction = directionFromAngle(
      Phaser.Math.RadToDeg(Math.atan2(dy, dx)),
    );
    this.heldDirection = direction;
    if (this.moving) {
      this.queuedDirection = direction;
      return;
    }
    this.startDirectionalMove(direction);
  }

  private readonly releaseJoystick = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.id !== this.joystickPointerId) {
      return;
    }
    this.joystickPointerId = undefined;
    this.heldDirection = undefined;
    this.queuedDirection = undefined;
    this.joystickKnob?.setPosition(JOYSTICK_X, JOYSTICK_Y);
    if (!this.moving) {
      this.render();
    }
  };

  private startDirectionalMove(direction: MoveDirection): void {
    if (this.moving || this.failed || this.cleared) {
      this.queuedDirection = direction;
      return;
    }
    const vector = MOVE_VECTORS[direction];
    const tile = getTile(
      this.field,
      this.player.x + vector.x,
      this.player.y + vector.y,
    );
    if (!tile) {
      return;
    }
    this.startMoveTo(tile, direction);
  }

  private startMoveTo(tile: Tile, direction?: MoveDirection): void {
    if (this.moving) {
      if (direction) this.queuedDirection = direction;
      return;
    }
    const previous = this.player;
    const occupied = this.monsters.map((monster) => ({
      x: monster.tileX,
      y: monster.tileY,
    }));
    const next = tryMove(this.field, this.player, tile, occupied);
    if (next.x === previous.x && next.y === previous.y) {
      return;
    }
    this.player = { ...next, depth: Math.max(next.depth, tile.y) };
    this.message = "移動しました";
    this.moving = true;
    const diagonal = previous.x !== next.x && previous.y !== next.y;
    const duration = diagonal
      ? Math.round(MOVE_DURATION * Math.SQRT2)
      : MOVE_DURATION;
    const targetX = BOARD_X + next.x * TILE_SIZE + TILE_SIZE / 2;
    const targetY = BOARD_Y + next.y * TILE_SIZE + TILE_SIZE / 2;
    if (!this.playerSprite) {
      this.moving = false;
      this.render();
      return;
    }
    this.tweens.add({
      targets: this.playerSprite,
      x: targetX,
      y: targetY,
      duration,
      ease: "Linear",
      onComplete: () => {
        this.moving = false;
        const nextDirection = this.queuedDirection ?? this.heldDirection;
        this.queuedDirection = undefined;
        if (nextDirection && this.heldDirection) {
          this.startDirectionalMove(nextDirection);
          return;
        }
        this.render();
      },
    });
  }

  private followPlayer(
    sprite: Phaser.GameObjects.GameObject & { x: number; y: number },
  ): void {
    this.worldCamera.setBounds(
      0,
      0,
      this.field.width * TILE_SIZE,
      this.field.height * TILE_SIZE,
    );
    this.worldCamera.startFollow(sprite, true, 0.16, 0.16);
  }

  private shutdownInput(): void {
    this.input.off("pointermove", this.handleJoystickMove, this);
    this.input.off("pointerup", this.releaseJoystick, this);
    this.worldCamera.stopFollow();
  }

  private saveRunState(): void {
    saveRun({
      areaId: getSelectedAreaId(),
      field: this.field,
      player: this.player,
      inventory: this.inventory,
      monsters: this.monsters,
      defeatedMonsters: this.defeatedMonsters,
      bossDefeated: this.bossDefeated,
    });
  }

  private handleTileInteraction(tile: Tile): void {
    if (this.failed || this.cleared || this.moving) return;
    if (this.tryAttackMonster(tile)) {
      this.render();
      return;
    }
    if (!isAdjacent(this.player, tile)) {
      this.message = "隣接するマスを選んでください";
      this.render();
      return;
    }
    if (this.mode === "cool") {
      const result = coolMine(this.field, this.inventory, tile);
      this.field = result.field;
      this.inventory = result.inventory;
      this.message = result.message;
      if (result.success) this.feedback("cool", tile, 0x66ccff);
      this.render();
      return;
    }
    if (this.mode === "disable") {
      const result = disableMine(this.field, this.inventory, tile);
      this.field = result.field;
      this.inventory = result.inventory;
      this.message = result.message;
      if (result.success) this.feedback("disable", tile, 0xffd65a);
      this.render();
      return;
    }
    if (tile.isWalkable) {
      this.startMoveTo(tile);
      return;
    }
    if (tile.state === "exit") {
      this.cleared = true;
      this.message = "出口に到達しました";
      this.render();
      return;
    }
    const result = mineTile(
      this.field,
      this.player,
      this.inventory,
      tile,
      import.meta.env.VITE_E2E === "1" ? "e2e" : String(Date.now()),
    );
    this.field = result.field;
    this.player = {
      ...result.player,
      depth: Math.max(result.player.depth, tile.y),
    };
    this.inventory = result.inventory;
    this.message = result.gainedItemId
      ? `${getItemName(result.gainedItemId)} x${result.gainedAmount}を入手`
      : result.message;
    this.feedback(
      result.exploded ? "hit" : result.gainedItemId ? "item" : "mine",
      tile,
      result.exploded ? 0xff5533 : 0xf3bb55,
    );
    if (this.player.hp <= 0) this.failed = true;
    this.render();
  }

  private handleFlag(tile: Tile): void {
    if (!isAdjacent(this.player, tile)) {
      this.message = "隣接するマスだけフラグを操作できます";
      this.render();
      return;
    }
    this.field = toggleFlag(this.field, tile);
    this.message =
      tile.mark === "flag" ? "フラグを外しました" : "地雷候補にマークしました";
    this.render();
  }

  private tryAttackMonster(tile: Tile): boolean {
    const monster = this.monsters.find(
      (candidate) => candidate.tileX === tile.x && candidate.tileY === tile.y,
    );
    if (!monster) {
      return false;
    }
    if (!isAdjacent(this.player, tile)) {
      this.message = "敵へ近づこう";
      return true;
    }
    const definition = getMonster(monster.id);
    const result = attackMonster(this.player, definition, monster.combatant);
    this.player = result.player;
    this.message = result.message;
    if (result.defeated) {
      this.defeatedMonsters.push(monster.id);
      this.bossDefeated ||= definition.boss;
      const drop = rollWeightedDrop(
        definition.drops,
        `${this.field.seed}:${monster.id}`,
      );
      if (drop) {
        const addResult = addItem(this.inventory, drop.itemId, drop.amount);
        this.inventory = addResult.inventory;
        this.message = addResult.added
          ? `${getItemName(drop.itemId)} x${drop.amount}を入手`
          : "バッグがいっぱいです";
      }
      this.feedback("item", tile, 0xf5d76e);
      this.monsters = this.monsters.filter(
        (candidate) => candidate !== monster,
      );
      const tileAtMonster = getTile(this.field, tile.x, tile.y);
      if (tileAtMonster) {
        this.field = replaceTile(this.field, {
          ...tileAtMonster,
          state: "revealedFloor",
          isRevealed: true,
          isWalkable: true,
        });
      }
    } else {
      this.monsters = this.monsters.map((candidate) =>
        candidate === monster
          ? { ...candidate, combatant: result.monster }
          : candidate,
      );
      this.player = {
        ...this.player,
        hp: Math.max(
          0,
          this.player.hp - Math.max(1, definition.attack - this.player.defense),
        ),
      };
      if (this.player.hp <= 0) {
        this.failed = true;
        this.message = "探索失敗...";
      }
    }
    return true;
  }

  private usePotion(): void {
    const nextInventory = consumePotion(this.inventory);
    if (!nextInventory) {
      this.message = "回復薬がありません";
      this.render();
      return;
    }
    this.inventory = nextInventory;
    this.player = {
      ...this.player,
      hp: Math.min(this.player.maxHp, this.player.hp + 35),
      actionState: "usingItem",
    };
    this.message = "HPを回復しました";
    this.feedback("heal", undefined, 0x68d391);
    this.render();
  }

  private feedback(cue: FeedbackCue, tile?: Tile, color = 0xffffff): void {
    const settings = getGameState().settings;
    playFeedback(cue, settings.sound, settings.vibration);
    if (settings.reducedMotion) return;
    if (cue === "hit") this.worldCamera.shake(110, 0.007);
    const x = tile
      ? BOARD_X + tile.x * TILE_SIZE + TILE_SIZE / 2
      : this.player.x * TILE_SIZE + TILE_SIZE / 2;
    const y = tile
      ? BOARD_Y + tile.y * TILE_SIZE + TILE_SIZE / 2
      : this.player.y * TILE_SIZE + TILE_SIZE / 2;
    this.time.delayedCall(0, () => {
      const ring = this.add
        .circle(x, y, 8, color, 0.35)
        .setStrokeStyle(3, color, 0.9);
      this.tileObjects.push(ring);
      this.tweens.add({
        targets: ring,
        scale: 2.6,
        alpha: 0,
        duration: 220,
        onComplete: () => ring.destroy(),
      });
    });
  }

  private openMenu(): void {
    this.heldDirection = undefined;
    this.queuedDirection = undefined;
    this.joystickPointerId = undefined;
    this.clearObjects(this.hudObjects);
    this.drawHud();
    const overlay = this.add.rectangle(195, 422, 390, 844, 0x000000, 0.58);
    const panel = this.add
      .rectangle(195, 420, 270, 360, COLORS.panel, 0.98)
      .setStrokeStyle(2, COLORS.goldDark);
    this.hudObjects.push(overlay, panel);
    this.hudObjects.push(
      this.add
        .text(195, 285, "メニュー", {
          fontSize: "24px",
          color: COLORS.text,
          fontStyle: "bold",
        })
        .setOrigin(0.5),
    );
    this.hudObjects.push(
      addButton(this, 195, 345, 210, 48, "続ける", () => this.render()),
    );
    this.hudObjects.push(
      addButton(this, 195, 405, 210, 48, "拠点へ戻る", () =>
        this.scene.start("HomeScene"),
      ),
    );
    this.hudObjects.push(
      addButton(
        this,
        195,
        465,
        210,
        48,
        `持ち物 ${getUsedCapacity(this.inventory)}/${this.inventory.capacity}`,
        () => undefined,
      ),
    );
    this.hudObjects.push(
      addButton(this, 195, 525, 210, 48, "設定", () =>
        this.scene.start("SettingsScene"),
      ),
    );
    this.hudObjects.push(
      addButton(this, 195, 585, 210, 48, "あきらめる", () => {
        this.failed = true;
        this.render();
      }),
    );
    this.worldCamera.ignore(this.hudObjects);
  }

  private getAreaGlow(): number {
    const area = getArea(getSelectedAreaId());
    if (area.theme === "crystalCave") {
      return 0x3c92d8;
    }
    if (area.theme === "volcanoMine") {
      return 0xe05a32;
    }
    if (area.theme === "ancientSite") {
      return 0x9b59c9;
    }
    return 0xffb13b;
  }

  private getTileColor(tile: Tile): number {
    if (tile.isRevealed) {
      return 0x3a3024;
    }
    if (tile.state === "cooledMine") {
      return 0x2d5f85;
    }
    if (tile.state === "disabledMine") {
      return 0x6a5d3a;
    }
    if (tile.state === "exit") {
      return 0x45351d;
    }
    return tile.hasMine ? 0x50463c : 0x5d5a55;
  }

  private getTileVisual(tile: Tile): TileVisual {
    if (tile.state === "exit") {
      return "exit";
    }
    if (tile.state === "cooledMine" || tile.state === "disabledMine") {
      return "disabledMine";
    }
    if (tile.hasMine && tile.isRevealed) {
      return "mine";
    }
    return tile.isRevealed ? "floor" : "wall";
  }

  private getNumberColor(value: number): string {
    if (value === 1) {
      return "#4da3ff";
    }
    if (value === 2) {
      return "#69b342";
    }
    if (value === 3) {
      return "#e05243";
    }
    if (value === 4) {
      return "#b677f0";
    }
    return "#f2a33c";
  }

  private clearObjects(objects: Phaser.GameObjects.GameObject[]): void {
    while (objects.length > 0) {
      objects.pop()?.destroy();
    }
  }
}
