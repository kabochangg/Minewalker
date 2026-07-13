import Phaser from "phaser";
import { getSelectedAreaId } from "../../app/routeState";
import {
  ASSET_KEYS,
  getMonsterAssetKey,
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
import { isPositionDiscovered } from "../systems/VisibilitySystem";
import {
  facingFromMoveDirection,
  getAreaVisualTheme,
  getMonsterVisualState,
  getTileVisualVariant,
  type FacingDirection,
} from "../visual/VisualSystem";
import {
  addButton,
  addGameButton,
  addHudBar,
  addIconButton,
  COLORS,
  drawGameIcon,
  drawPixelMiner,
  VISUAL_TOKENS,
  type GameIcon,
} from "./uiHelpers";

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
  readonly inputDirection: (direction: MoveDirection) => void;
  readonly showResult: () => void;
  readonly snapshot: () => {
    readonly usedCapacity: number;
    readonly cleared: boolean;
    readonly message: string;
    readonly facing: FacingDirection;
  };
}

const TILE_SIZE = 48;
const BOARD_X = 0;
const BOARD_Y = 0;
const WORLD_TOP = 112;
const WORLD_HEIGHT = 538;
const MOVE_DURATION = 90;
const JOYSTICK_X = 68;
const JOYSTICK_Y = 770;
const JOYSTICK_RADIUS = 58;
const JOYSTICK_DEAD_ZONE = 8;

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
  private facing: FacingDirection = "down";
  private joystickKnob?: Phaser.GameObjects.Arc;
  private joystickArrow?: Phaser.GameObjects.Triangle;
  private joystickPointerId?: number;
  private heldDirection?: MoveDirection;
  private queuedDirection?: MoveDirection;
  private moving = false;
  private readonly tileObjects: Phaser.GameObjects.GameObject[] = [];
  private readonly hudObjects: Phaser.GameObjects.GameObject[] = [];
  private readonly discoveredMonsterKeys = new Set<string>();

  constructor() {
    super("ExplorationScene");
  }

  create(): void {
    this.worldCamera = this.cameras.main;
    this.worldCamera.setViewport(0, WORLD_TOP, 390, WORLD_HEIGHT);
    this.worldCamera.setZoom(1.1);
    this.worldCamera.setBackgroundColor("#17120e");
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
    this.drawLighting();
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
    const theme = getAreaVisualTheme(getArea(getSelectedAreaId()).theme);
    const graphics = this.add.graphics();
    this.tileObjects.push(graphics);
    graphics.fillStyle(theme.cave);
    graphics.fillRect(
      0,
      0,
      this.field.width * TILE_SIZE,
      this.field.height * TILE_SIZE,
    );
    graphics.fillStyle(theme.wall[0], 0.3);
    for (let y = 18; y < this.field.height * TILE_SIZE; y += 54) {
      for (
        let x = 12 + ((y / 54) % 2) * 20;
        x < this.field.width * TILE_SIZE;
        x += 68
      ) {
        graphics.fillEllipse(x, y, 42, 20);
      }
    }
    graphics.fillStyle(theme.glow, 0.045);
    graphics.fillEllipse(250, 350, 340, 250);
  }

  private drawTiles(): void {
    for (const tile of this.field.tiles) {
      const x = BOARD_X + tile.x * TILE_SIZE;
      const y = BOARD_Y + tile.y * TILE_SIZE;
      const visual = this.getTileVisual(tile);
      const hitTarget =
        visual === "wall"
          ? this.drawNaturalWallTile(x, y, tile)
          : this.drawNaturalFloorTile(x, y, tile, visual);
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
      if (tile.state === "exit") {
        this.tileObjects.push(
          this.add
            .text(x + 16, y + 16, "▣", { fontSize: "21px", color: "#f5b83f" })
            .setOrigin(0.5),
        );
      }
    }
  }

  private drawNaturalWallTile(
    x: number,
    y: number,
    tile: Tile,
  ): Phaser.GameObjects.Rectangle {
    const theme = getAreaVisualTheme(getArea(getSelectedAreaId()).theme);
    const variant = getTileVisualVariant(
      this.field.seed,
      tile.x,
      tile.y,
      tile.state,
    );
    const adjacent = isAdjacent(this.player, tile);
    const shade = theme.wall[variant % theme.wall.length];
    const base = this.add
      .rectangle(
        x,
        y,
        TILE_SIZE,
        TILE_SIZE,
        adjacent ? lightenColor(shade, 22) : shade,
      )
      .setOrigin(0)
      .setStrokeStyle(1, VISUAL_TOKENS.colors.rockOutline, 0.72);
    const stone = this.add.graphics();
    if (theme.motif === "ancientBrick") {
      stone.lineStyle(2, theme.wallHighlight, 0.58);
      stone.strokeRect(x + 3, y + 4, 20 + (variant % 2) * 5, 16);
      stone.strokeRect(x + 26, y + 4, 18, 16);
      stone.strokeRect(x + 7, y + 24, 25, 17);
      stone.strokeRect(x + 34, y + 24, 11, 17);
      stone.fillStyle(theme.accent, 0.22);
      stone.fillRect(x + 22, y + 19, 4, 4);
    } else {
      const shift = variant * 2;
      stone.fillStyle(theme.wallHighlight, 0.72);
      stone.fillRoundedRect(
        x + 3 + (shift % 5),
        y + 5,
        15 + (variant % 3) * 2,
        10,
        4,
      );
      stone.fillRoundedRect(x + 24, y + 3 + (shift % 4), 19, 14, 5);
      stone.fillStyle(VISUAL_TOKENS.colors.rockOutline, 0.68);
      stone.fillRoundedRect(x + 4, y + 23, 21, 16, 5);
      stone.fillRoundedRect(x + 29, y + 25, 15, 13, 4);
      stone.lineStyle(1, theme.wallHighlight, 0.42);
      stone.strokeRoundedRect(
        x + 3 + (shift % 5),
        y + 5,
        15 + (variant % 3) * 2,
        10,
        4,
      );
      if (theme.motif === "crystal") {
        stone.fillStyle(theme.accent, 0.78);
        stone.fillTriangle(x + 36, y + 29, x + 40, y + 15, x + 44, y + 29);
      }
      if (theme.motif === "volcanic") {
        stone.lineStyle(2, theme.crack, 0.82);
        stone.lineBetween(x + 10, y + 18, x + 17, y + 24);
        stone.lineBetween(x + 17, y + 24, x + 13, y + 34);
      }
    }
    this.tileObjects.push(stone);
    return base;
  }

  private drawNaturalFloorTile(
    x: number,
    y: number,
    tile: Tile,
    visual: TileVisual,
  ): Phaser.GameObjects.Rectangle {
    const theme = getAreaVisualTheme(getArea(getSelectedAreaId()).theme);
    const variant = getTileVisualVariant(
      this.field.seed,
      tile.x,
      tile.y,
      tile.state,
      4,
    );
    const fill =
      visual === "exit"
        ? lightenColor(theme.floor[variant % 4], 18)
        : visual === "mine"
          ? 0x4a3028
          : tile.state === "cooledMine"
            ? 0x2d5f70
            : tile.state === "disabledMine"
              ? 0x665c35
              : theme.floor[variant % 4];
    const base = this.add
      .rectangle(x, y, TILE_SIZE, TILE_SIZE, fill, 1)
      .setOrigin(0)
      .setStrokeStyle(1, VISUAL_TOKENS.colors.rockOutline, 0.22);
    const detail = this.add.graphics();
    if (visual === "exit") {
      detail.fillStyle(theme.glow, 0.18);
      detail.fillCircle(x + 24, y + 24, 21);
      detail.lineStyle(3, theme.accent, 0.95);
      detail.strokeRoundedRect(x + 7, y + 6, 34, 36, 5);
      detail.lineBetween(x + 13, y + 33, x + 35, y + 33);
    } else if (tile.adjacentMineCount === 0) {
      detail.fillStyle(theme.wallHighlight, 0.24);
      detail.fillEllipse(
        x + 12 + (variant % 3) * 8,
        y + 13 + (variant % 2) * 13,
        9,
        5,
      );
      detail.fillStyle(VISUAL_TOKENS.colors.rockOutline, 0.24);
      detail.fillCircle(x + 34 - (variant % 2) * 9, y + 34, 3);
    }
    if (tile.state === "cooledMine") {
      detail.lineStyle(2, VISUAL_TOKENS.colors.coolant, 0.82);
      detail.strokeCircle(x + 24, y + 24, 14);
    }
    if (tile.state === "disabledMine") {
      detail.lineStyle(2, VISUAL_TOKENS.colors.disable, 0.82);
      detail.strokeRoundedRect(x + 9, y + 9, 30, 30, 5);
    }
    this.tileObjects.push(detail);
    return base;
  }

  private drawLighting(): void {
    const theme = getAreaVisualTheme(getArea(getSelectedAreaId()).theme);
    const x = BOARD_X + this.player.x * TILE_SIZE + TILE_SIZE / 2;
    const y = BOARD_Y + this.player.y * TILE_SIZE + TILE_SIZE / 2;
    const outer = this.add.circle(x, y, TILE_SIZE * 3.5, theme.glow, 0.025);
    const middle = this.add.circle(x, y, TILE_SIZE * 2.2, theme.glow, 0.035);
    const inner = this.add.circle(
      x,
      y,
      TILE_SIZE * 1.15,
      VISUAL_TOKENS.colors.highlight,
      0.055,
    );
    this.tileObjects.push(outer, middle, inner);
  }

  private drawPlayer(): void {
    const x = BOARD_X + this.player.x * TILE_SIZE + TILE_SIZE / 2;
    const y = BOARD_Y + this.player.y * TILE_SIZE + TILE_SIZE / 2;
    if (this.textures.exists(ASSET_KEYS.player)) {
      const shadow = this.add.ellipse(0, 17, 34, 11, 0x000000, 0.42);
      const lampGlow = this.add.circle(
        1,
        -11,
        12,
        VISUAL_TOKENS.colors.highlight,
        0.16,
      );
      const outline = this.add
        .image(0, 0, ASSET_KEYS.player)
        .setDisplaySize(63, 63)
        .setTint(VISUAL_TOKENS.colors.rockOutline);
      const image = this.add
        .image(0, 0, ASSET_KEYS.player)
        .setDisplaySize(58, 58);
      const flipX = this.facing.includes("Left") || this.facing === "left";
      outline.setFlipX(flipX);
      image.setFlipX(flipX);
      const sprite = this.add.container(x, y, [
        shadow,
        lampGlow,
        outline,
        image,
      ]);
      this.playerSprite = sprite;
      this.tileObjects.push(sprite);
      if (!getGameState().settings.reducedMotion && !this.moving) {
        this.tweens.add({
          targets: image,
          y: -2,
          duration: 520,
          yoyo: true,
          repeat: -1,
          ease: "Sine.InOut",
        });
      }
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
      inputDirection: (direction) => this.startDirectionalMove(direction),
      showResult: () =>
        this.scene.start("ResultScene", {
          success: true,
          depth: this.player.depth,
          inventory: this.inventory,
          defeatedMonsters: this.defeatedMonsters,
          bossDefeated: this.bossDefeated,
        }),
      snapshot: () => ({
        usedCapacity: getUsedCapacity(this.inventory),
        cleared: this.cleared,
        message: this.message,
        facing: this.facing,
      }),
    };
  }

  private drawMonsters(): void {
    const reducedMotion = getGameState().settings.reducedMotion;
    for (const monster of this.monsters) {
      const visualState = getMonsterVisualState(
        this.isMonsterDiscovered(monster),
        monster.combatant.hp,
        monster.combatant.maxHp,
      );
      if (!visualState.showBody) {
        continue;
      }
      const x = BOARD_X + monster.tileX * TILE_SIZE + TILE_SIZE / 2;
      const y = BOARD_Y + monster.tileY * TILE_SIZE + TILE_SIZE / 2;
      const definition = getMonster(monster.id);
      const assetKey = getMonsterAssetKey(monster.id);
      const monsterKey = `${monster.id}:${monster.tileX}:${monster.tileY}`;
      const newlyDiscovered = !this.discoveredMonsterKeys.has(monsterKey);
      this.discoveredMonsterKeys.add(monsterKey);
      const shadow = this.add.ellipse(
        x,
        y + (definition.boss ? 22 : 15),
        definition.boss ? 50 : 30,
        definition.boss ? 14 : 9,
        0x000000,
        0.4,
      );
      const body = this.textures.exists(assetKey)
        ? this.add
            .image(x, y, assetKey)
            .setDisplaySize(
              definition.boss
                ? 72
                : monster.id === "monster.rockGolem"
                  ? 46
                  : 40,
              definition.boss
                ? 72
                : monster.id === "monster.rockGolem"
                  ? 46
                  : 40,
            )
        : this.add
            .circle(
              x,
              y + 3,
              definition.boss ? 16 : 13,
              definition.boss ? 0xa84fd4 : 0x65b83f,
            )
            .setStrokeStyle(2, 0x234914);
      this.tileObjects.push(shadow, body);
      if (newlyDiscovered && !reducedMotion) {
        body.setAlpha(0).setScale(0.72);
        const alert = this.add
          .text(x, y - 28, "!", {
            fontFamily: "system-ui, sans-serif",
            fontSize: "22px",
            color: "#ffe08a",
            fontStyle: "bold",
          })
          .setOrigin(0.5);
        this.tileObjects.push(alert);
        this.tweens.add({
          targets: body,
          alpha: 1,
          scale: 1,
          duration: VISUAL_TOKENS.motion.reveal,
          ease: "Back.Out",
        });
        this.tweens.add({
          targets: alert,
          y: y - 38,
          alpha: 0,
          duration: 240,
          onComplete: () => alert.destroy(),
        });
      }
      if (!reducedMotion && body instanceof Phaser.GameObjects.Image) {
        const isBat = monster.id === "monster.bat";
        this.tweens.add({
          targets: body,
          [isBat ? "x" : "y"]: isBat ? x + 2 : y - 2,
          duration: monster.id === "monster.rockGolem" ? 760 : 420,
          yoyo: true,
          repeat: -1,
          ease: "Sine.InOut",
        });
      }
      if (visualState.showHp) {
        const hpWidth = 30 * (monster.combatant.hp / monster.combatant.maxHp);
        const hpBack = this.add
          .rectangle(
            x,
            y - (definition.boss ? 39 : 23),
            32,
            6,
            VISUAL_TOKENS.colors.rockOutline,
          )
          .setOrigin(0.5);
        const hp = this.add
          .rectangle(
            x - 15,
            y - (definition.boss ? 39 : 23),
            hpWidth,
            4,
            COLORS.red,
          )
          .setOrigin(0, 0.5);
        this.tileObjects.push(hpBack, hp);
      }
    }
  }

  private drawHud(): void {
    const area = getArea(getSelectedAreaId());
    this.hudObjects.push(
      addHudBar(
        this,
        86,
        22,
        142,
        this.player.hp,
        this.player.maxHp,
        COLORS.red,
        "HP",
      ),
    );
    this.hudObjects.push(
      addHudBar(
        this,
        86,
        48,
        142,
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
      drawGameIcon(this, 178, 26, "coin", VISUAL_TOKENS.colors.coin).setScale(
        0.7,
      ),
      drawGameIcon(this, 247, 26, "bag", 0xfff3d6).setScale(0.7),
      drawGameIcon(this, 305, 58, "depth", 0xd3b98b).setScale(0.7),
      addIconButton(this, 360, 104, "settings", () => this.openMenu()),
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
    const actionIcons: Readonly<Record<ActionMode, GameIcon>> = {
      mine: "pickaxe",
      cool: "coolant",
      disable: "disable",
      potion: "potion",
      bag: "bag",
    };
    actions.forEach(([mode, label, count], index) => {
      const position = positions[index];
      this.hudObjects.push(
        addGameButton(
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
          {
            state: this.mode === mode ? "selected" : "normal",
            icon: actionIcons[mode],
            fontSize: 12,
          },
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
    const arrow = this.add
      .triangle(JOYSTICK_X, JOYSTICK_Y, 0, -8, 7, 6, -7, 6, COLORS.gold)
      .setAlpha(0);
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
    this.joystickArrow = arrow;
    this.hudObjects.push(base, knob, arrow, zone);
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
      this.joystickArrow?.setAlpha(0).setPosition(JOYSTICK_X, JOYSTICK_Y);
      return;
    }
    const scale = Math.min(distance, JOYSTICK_RADIUS - 8) / distance;
    this.joystickKnob?.setPosition(
      JOYSTICK_X + dx * scale,
      JOYSTICK_Y + dy * scale,
    );
    this.joystickArrow
      ?.setAlpha(0.9)
      .setPosition(JOYSTICK_X + dx * scale * 0.7, JOYSTICK_Y + dy * scale * 0.7)
      .setRotation(Math.atan2(dy, dx) + Math.PI / 2);
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
    this.joystickArrow?.setAlpha(0).setPosition(JOYSTICK_X, JOYSTICK_Y);
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
    this.facing = facingFromMoveDirection(direction);
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
    if (!monster || !this.isMonsterDiscovered(monster)) {
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

  private isMonsterDiscovered(monster: MonsterRuntime): boolean {
    return isPositionDiscovered(this.field, this.player, {
      x: monster.tileX,
      y: monster.tileY,
    });
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
      : BOARD_X + this.player.x * TILE_SIZE + TILE_SIZE / 2;
    const y = tile
      ? BOARD_Y + tile.y * TILE_SIZE + TILE_SIZE / 2
      : BOARD_Y + this.player.y * TILE_SIZE + TILE_SIZE / 2;
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
      const particleCount = cue === "hit" ? 10 : cue === "item" ? 4 : 6;
      for (let index = 0; index < particleCount; index += 1) {
        const angle = (Math.PI * 2 * index) / particleCount - Math.PI / 2;
        const distance = cue === "item" ? 24 : 18 + (index % 3) * 4;
        const size = cue === "hit" ? 4 + (index % 3) : 3;
        const particle = this.add
          .rectangle(x, y, size, size, color, 0.95)
          .setRotation(angle + index * 0.4);
        this.tileObjects.push(particle);
        this.tweens.add({
          targets: particle,
          x: x + Math.cos(angle) * distance,
          y:
            y +
            Math.sin(angle) * distance +
            (cue === "mine" || cue === "hit" ? 10 : -6),
          alpha: 0,
          angle: 90 + index * 32,
          duration: 140 + index * 10,
          onComplete: () => particle.destroy(),
        });
      }
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

function lightenColor(color: number, amount: number): number {
  const red = Math.min(255, ((color >> 16) & 0xff) + amount);
  const green = Math.min(255, ((color >> 8) & 0xff) + amount);
  const blue = Math.min(255, (color & 0xff) + amount);
  return (red << 16) | (green << 8) | blue;
}
