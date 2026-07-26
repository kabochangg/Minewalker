import Phaser from "phaser";
import { getSelectedAreaId } from "../../app/routeState";
import {
  ASSET_KEYS,
  getMonsterAssetKey,
  type TileVisual,
} from "../../assets/assetCatalog";
import { GAME_FONT_FAMILY } from "../../assets/fontCatalog";
import { getArea } from "../../data/areas";
import { BALANCE } from "../../data/balance";
import { DIFFICULTIES } from "../../data/difficulties";
import { getItemName } from "../../data/items";
import { getMonster, type MonsterId } from "../../data/monsters";
import {
  advanceTutorialStep,
  hideGameUi,
  publishGameUiState,
  subscribeUiIntent,
  type ExplorationAction,
  type TutorialStep,
  type UiIntent,
} from "../../ui/gameUi";
import {
  clearRun,
  loadExplorationState,
  loadRun,
  saveRun,
  type LegacyRunInput,
} from "../../save/RunSaveSystem";
import { saveCoordinator } from "../../save/saveCoordinator";
import { loadGame } from "../../save/SaveSystem";
import type { DeathCache } from "../components/progressionComponents";
import type { ToolConditionComponent } from "../components/toolComponents";
import { createInitialPlayer, type PlayerState } from "../entities/player";
import { generateDungeon } from "../map/DungeonGenerator";
import type { Minefield, Tile } from "../map/types";
import { getTile, replaceTile } from "../map/types";
import {
  getEquippedStats,
  getGameState,
  setGameState,
} from "../state/GameState";
import { ExplorationCoordinator } from "../application/ExplorationCoordinator";
import { PerformanceMonitor } from "../presentation/PerformanceMonitor";
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
  rebuildActiveMineCounts,
  toggleFlag,
} from "../systems/MineHandlingSystem";
import { isAdjacent } from "../systems/MinefieldSystem";
import { mineTile } from "../systems/MiningSystem";
import {
  advanceContinuousMovement,
  consumeFixedSteps,
  directionFromAngle,
  MOVE_VECTORS,
  tryMove,
  type ContinuousPosition,
  type MoveDirection,
} from "../systems/MovementSystem";
import { isPositionDiscovered } from "../systems/VisibilitySystem";
import { applyLocomotionCost, recoverStamina } from "../systems/StaminaSystem";
import {
  facingFromMoveDirection,
  getAreaVisualTheme,
  getMonsterVisualState,
  getTileVisualVariant,
  type FacingDirection,
} from "../visual/VisualSystem";
import {
  addButton,
  COLORS,
  drawGameIcon,
  drawPixelMiner,
  VISUAL_TOKENS,
  type GameIcon,
} from "./uiHelpers";

type ActionMode = ExplorationAction;

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
  readonly markMine: () => void;
  readonly mineMarkedMine: () => void;
  readonly disposeMine: () => void;
  readonly falseDispose: () => void;
  readonly triggerDefeat: () => void;
  readonly recoverLatestDeathCache: () => void;
  readonly toggleRun: () => void;
  readonly resetPerformance: () => void;
  readonly startPerformance: () => void;
  readonly measureInput: () => void;
  readonly performanceSnapshot: () => ReturnType<PerformanceMonitor["stop"]>;
  readonly snapshot: () => {
    readonly usedCapacity: number;
    readonly cleared: boolean;
    readonly message: string;
    readonly facing: FacingDirection;
    readonly stamina: number;
    readonly toolDurability: number;
    readonly adjacentAtPlayer: number;
    readonly deathCacheCount: number;
    readonly locomotion: "walk" | "run";
    readonly generatedStartSafe: boolean;
  };
}

const TILE_SIZE = 48;
const BOARD_X = 0;
const BOARD_Y = 0;
const WORLD_TOP = 112;
const WORLD_HEIGHT = 538;
const MOVE_DURATION = 90;
const CONTINUOUS_MOVE_SPEED = 5;
// The smallest supported display scales the 390px game canvas down to ~67%.
// Keep the touch controls generous here so they remain comfortably tappable on
// 320px-wide phones rather than shrinking below the recommended 44px target.
const JOYSTICK_X = 70;
const JOYSTICK_Y = 770;
const JOYSTICK_RADIUS = 68;
const JOYSTICK_DEAD_ZONE = 12;

export class ExplorationScene extends Phaser.Scene {
  private field!: Minefield;
  private player!: PlayerState;
  private inventory!: InventoryState;
  private mode: ActionMode = "mine";
  private message = "左スティックで移動。隣接する壁をタップして採掘";
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
  private playerImage?: Phaser.GameObjects.Image;
  private playerOutlineImage?: Phaser.GameObjects.Image;
  private playerPosition!: ContinuousPosition;
  private playerLighting: Phaser.GameObjects.Arc[] = [];
  private facing: FacingDirection = "down";
  private joystickKnob?: Phaser.GameObjects.Arc;
  private joystickArrow?: Phaser.GameObjects.Triangle;
  private joystickPointerId?: number;
  private heldDirection?: MoveDirection;
  private queuedDirection?: MoveDirection;
  private moving = false;
  private tapMoveInProgress = false;
  private running = false;
  private toolCondition!: ToolConditionComponent;
  private deathCaches: DeathCache[] = [];
  private readonly pressedKeys = new Set<string>();
  private generatedStartSafe = true;
  private readonly tileObjects: Phaser.GameObjects.GameObject[] = [];
  private readonly hudObjects: Phaser.GameObjects.GameObject[] = [];
  private readonly flagIcons = new Map<string, Phaser.GameObjects.Container>();
  private readonly discoveredMonsterKeys = new Set<string>();
  private movementAccumulatorMs = 0;
  private inputReceiptSequence = 0;
  private activeChunkKey = "";
  private objectiveExpanded = false;
  private tutorialStep: TutorialStep = "complete";
  private unsubscribeUiIntent?: () => void;
  private readonly performanceMonitor = new PerformanceMonitor();

  constructor() {
    super("ExplorationScene");
  }

  create(): void {
    this.performanceMonitor.start();
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
    const save = getGameState();
    this.tutorialStep = save.settings.tutorialSeen ? "complete" : "move";
    const pickaxeId = save.equipment.equipped.pickaxe;
    this.toolCondition = resumed?.exploration.tools[0] ??
      save.toolConditions[pickaxeId] ?? {
        equipmentId: pickaxeId as ToolConditionComponent["equipmentId"],
        currentDurability: 30,
        maxDurability: 30,
        tier: 1,
        repairCount: 0,
      };
    this.deathCaches = [...(resumed?.exploration.deathCaches ?? [])];
    this.generatedStartSafe = this.checkGeneratedStartSafety();
    if (
      import.meta.env.VITE_E2E === "1" &&
      new URLSearchParams(window.location.search).has("e2e")
    ) {
      this.prepareE2EScenario();
    }
    this.playerPosition = resumed?.playerPosition ?? this.getPlayerCenter();
    this.input.on("pointermove", this.handleJoystickMove, this);
    this.input.on("pointerup", this.releaseJoystick, this);
    this.input.on("pointerup", this.handleWorldPointerUp, this);
    this.input.keyboard?.on("keydown", this.handleKeyboardDown);
    this.input.keyboard?.on("keyup", this.handleKeyboardUp);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdownInput, this);
    this.unsubscribeUiIntent = subscribeUiIntent(this.handleUiIntent);
    this.render();
    this.saveRunState(true);
  }

  update(_time: number, delta: number): void {
    this.performanceMonitor.recordFrame();
    const fixedFrame = consumeFixedSteps(
      this.movementAccumulatorMs,
      Math.min(delta, 100),
      BALANCE.presentation.fixedStepMs,
      BALANCE.presentation.maxCatchUpSteps,
    );
    this.movementAccumulatorMs = fixedFrame.remainderMs;
    const activeDelta = fixedFrame.stepCount * fixedFrame.stepMs;
    if (activeDelta <= 0) return;
    if (!this.heldDirection && !this.failed && !this.cleared) {
      const recovered = recoverStamina(this.player, activeDelta, true);
      this.player = { ...this.player, stamina: recovered.stamina };
    }
    if (
      !this.heldDirection ||
      this.failed ||
      this.cleared ||
      this.tapMoveInProgress
    ) {
      return;
    }
    const locomotion = applyLocomotionCost(
      this.player,
      this.running ? "run" : "walk",
      activeDelta,
    );
    this.player = { ...this.player, stamina: locomotion.state.stamina };
    if (this.running && locomotion.locomotion === "walk") {
      this.running = false;
      this.message = "スタミナ不足のため歩行へ戻りました";
    }
    const direction = MOVE_VECTORS[this.heldDirection];
    const result = advanceContinuousMovement(
      this.field,
      this.player,
      this.playerPosition,
      direction,
      (CONTINUOUS_MOVE_SPEED * (this.running ? 1.6 : 1) * activeDelta) / 1000,
      this.monsters.map((monster) => ({ x: monster.tileX, y: monster.tileY })),
    );
    if (!result.moved) {
      return;
    }
    this.moving = true;
    this.playerPosition = result.position;
    if (
      result.gridPosition.x !== this.player.x ||
      result.gridPosition.y !== this.player.y
    ) {
      this.player = {
        ...this.player,
        ...result.gridPosition,
        depth: Math.max(this.player.depth, result.gridPosition.y),
        actionState: "moving",
      };
      this.saveRunState();
      this.tryRecoverAtCurrentPosition();
    }
    const worldX = BOARD_X + this.playerPosition.x * TILE_SIZE;
    const worldY = BOARD_Y + this.playerPosition.y * TILE_SIZE;
    if (this.playerSprite) {
      this.playerSprite.x = worldX;
      this.playerSprite.y = worldY;
    }
    this.playerLighting.forEach((light) => light.setPosition(worldX, worldY));
    const chunkKey = `${Math.floor(this.player.x / BALANCE.presentation.chunkSize)},${Math.floor(this.player.y / BALANCE.presentation.chunkSize)}`;
    if (chunkKey !== this.activeChunkKey) {
      this.activeChunkKey = chunkKey;
      this.render();
    }
  }

  private createScenarioField(): Minefield {
    const area = getArea(getSelectedAreaId());
    const save = getGameState();
    const dungeon = generateDungeon({
      seed: `minewalker:${area.id}:${Date.now()}`,
      areaId: area.id,
      difficultyId: save.selectedDifficulty,
      entrance: { x: 4, y: 7 },
    });
    const generated = dungeon.field;
    const exitTile = getTile(
      generated,
      generated.width - 2,
      generated.height - 2,
    );
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

  private getPlayerCenter(): ContinuousPosition {
    return { x: this.player.x + 0.5, y: this.player.y + 0.5 };
  }

  private render(): void {
    this.clearObjects(this.tileObjects);
    this.flagIcons.clear();
    this.clearObjects(this.hudObjects);
    this.drawBackdrop();
    this.drawTiles();
    this.drawLighting();
    this.drawPlayer();
    this.drawMonsters();
    this.drawJoystick();
    this.publishExplorationUi();
    this.worldCamera.ignore(this.hudObjects);
    this.uiCamera.ignore(this.tileObjects);
    if (!this.cleared && !this.failed) {
      this.saveRunState();
    }
    if ((this.cleared || this.failed) && !this.resultQueued) {
      this.resultQueued = true;
      if (this.cleared) clearRun();
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
    const graphics = this.add.graphics();
    const theme = getAreaVisualTheme(getArea(getSelectedAreaId()).theme);
    this.tileObjects.push(graphics);
    for (const tile of this.field.tiles) {
      if (!this.isTileInActiveWindow(tile)) continue;
      const x = BOARD_X + tile.x * TILE_SIZE;
      const y = BOARD_Y + tile.y * TILE_SIZE;
      const visual = this.getTileVisual(tile);
      const variant = getTileVisualVariant(
        this.field.seed,
        tile.x,
        tile.y,
        tile.state,
      );
      const fill =
        visual === "wall"
          ? theme.wall[variant % theme.wall.length]
          : tile.state === "blocked"
            ? 0x151515
            : theme.floor[variant % theme.floor.length];
      graphics.fillStyle(
        isAdjacent(this.player, tile) && visual === "wall"
          ? lightenColor(fill, 18)
          : fill,
        1,
      );
      graphics.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      graphics.lineStyle(1, VISUAL_TOKENS.colors.rockOutline, 0.72);
      graphics.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
      if (visual === "wall") {
        graphics.fillStyle(theme.wallHighlight, 0.45);
        graphics.fillRoundedRect(
          x + 5 + (variant % 3) * 3,
          y + 7,
          14 + (variant % 2) * 5,
          9,
          3,
        );
        graphics.fillStyle(theme.crack, 0.65);
        graphics.fillRect(x + 12 + variant * 2, y + 25, 2, 12);
      } else {
        graphics.fillStyle(theme.wallHighlight, 0.18);
        graphics.fillRect(
          x + 7 + (variant % 4) * 6,
          y + 9 + (variant % 3) * 8,
          5,
          3,
        );
      }

      if (tile.isRevealed && tile.adjacentMineCount > 0) {
        this.tileObjects.push(
          this.add
            .text(
              x + TILE_SIZE / 2,
              y + TILE_SIZE / 2,
              String(tile.adjacentMineCount),
              {
                fontFamily: GAME_FONT_FAMILY,
                fontSize: "22px",
                fontStyle: "bold",
                color: this.getNumberColor(tile.adjacentMineCount),
              },
            )
            .setOrigin(0.5),
        );
      }
      if (tile.mark === "flag") {
        const icon = drawGameIcon(this, x + 24, y + 24, "flag", 0xff563f);
        this.flagIcons.set(`${tile.x},${tile.y}`, icon);
        this.tileObjects.push(icon);
      }
      if (
        tile.hasMine &&
        (tile.isRevealed ||
          tile.state === "cooledMine" ||
          tile.state === "disabledMine")
      ) {
        const icon: GameIcon =
          tile.state === "cooledMine"
            ? "snow"
            : tile.state === "disabledMine"
              ? "check"
              : "mine";
        this.tileObjects.push(
          drawGameIcon(this, x + 24, y + 24, icon, 0xffd2c2),
        );
      }
      if (tile.state === "exit") {
        this.tileObjects.push(
          drawGameIcon(this, x + 24, y + 24, "exit", 0xf5b83f),
        );
      }
    }
    for (const cache of this.deathCaches) {
      const marker = drawGameIcon(
        this,
        BOARD_X + (cache.position.x + 0.5) * TILE_SIZE,
        BOARD_Y + (cache.position.y + 0.5) * TILE_SIZE,
        "recovery",
        0xff6b57,
      );
      this.tileObjects.push(marker);
    }
  }

  /** 現在の表示範囲と余白に含まれるタイルだけを描画対象にする。 */
  private isTileInActiveWindow(tile: Tile): boolean {
    const overscan = BALANCE.presentation.chunkOverscanTiles;
    const halfColumns = Math.ceil(390 / this.worldCamera.zoom / TILE_SIZE / 2);
    const halfRows = Math.ceil(
      WORLD_HEIGHT / this.worldCamera.zoom / TILE_SIZE / 2,
    );
    return (
      Math.abs(tile.x - this.player.x) <= halfColumns + overscan &&
      Math.abs(tile.y - this.player.y) <= halfRows + overscan
    );
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
    const x = BOARD_X + this.playerPosition.x * TILE_SIZE;
    const y = BOARD_Y + this.playerPosition.y * TILE_SIZE;
    const outer = this.add.circle(x, y, TILE_SIZE * 3.5, theme.glow, 0.025);
    const middle = this.add.circle(x, y, TILE_SIZE * 2.2, theme.glow, 0.035);
    const inner = this.add.circle(
      x,
      y,
      TILE_SIZE * 1.15,
      VISUAL_TOKENS.colors.highlight,
      0.055,
    );
    this.playerLighting = [outer, middle, inner];
    this.tileObjects.push(outer, middle, inner);
  }

  private drawPlayer(): void {
    const x = BOARD_X + this.playerPosition.x * TILE_SIZE;
    const y = BOARD_Y + this.playerPosition.y * TILE_SIZE;
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
      this.playerImage = image;
      this.playerOutlineImage = outline;
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
    this.field = rebuildActiveMineCounts(this.field);
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
        this.handleFlag(currentTile(mine));
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
      markMine: () => this.handleFlag(currentTile(mine)),
      mineMarkedMine: () => {
        this.mode = "mine";
        this.handleTileInteraction(currentTile(mine));
      },
      disposeMine: () => {
        if (currentTile(mine).mark !== "flag") {
          this.handleFlag(currentTile(mine));
        }
        this.mode = "disable";
        this.handleTileInteraction(currentTile(mine));
      },
      falseDispose: () => {
        if (currentTile(safe).mark !== "flag") {
          this.handleFlag(currentTile(safe));
        }
        this.mode = "disable";
        this.handleTileInteraction(currentTile(safe));
      },
      triggerDefeat: () => {
        this.failed = false;
        this.player = { ...this.player, hp: 0, actionState: "dead" };
        this.commitDeath();
      },
      recoverLatestDeathCache: () => {
        this.failed = false;
        this.tryRecoverAtCurrentPosition();
      },
      toggleRun: () => {
        this.running = !this.running;
      },
      resetPerformance: () => this.performanceMonitor.reset(),
      startPerformance: () => this.performanceMonitor.start(),
      measureInput: () => {
        const receiptId = `e2e-${++this.inputReceiptSequence}`;
        this.performanceMonitor.recordInput(receiptId);
        requestAnimationFrame(() =>
          this.performanceMonitor.recordPresented(receiptId),
        );
      },
      performanceSnapshot: () => {
        this.performanceMonitor.setObjectCounts({
          gameObjects: this.children.list.length,
          texts: this.children.list.filter(
            (object) => object instanceof Phaser.GameObjects.Text,
          ).length,
          activeChunks: 1,
        });
        return this.performanceMonitor.stop();
      },
      snapshot: () => ({
        usedCapacity: getUsedCapacity(this.inventory),
        cleared: this.cleared,
        message: this.message,
        facing: this.facing,
        stamina: this.player.stamina,
        toolDurability: this.toolCondition.currentDurability,
        adjacentAtPlayer:
          getTile(this.field, this.player.x, this.player.y)
            ?.adjacentMineCount ?? 0,
        deathCacheCount: this.deathCaches.length,
        locomotion: this.running ? "run" : "walk",
        generatedStartSafe: this.generatedStartSafe,
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
            fontFamily: GAME_FONT_FAMILY,
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

  private readonly handleUiIntent = (intent: UiIntent): void => {
    if (!this.scene.isActive() || this.failed || this.cleared) return;
    if (intent.type === "selectExplorationAction") {
      this.mode = intent.action;
      if (intent.action === "potion") {
        this.usePotion();
        return;
      }
      this.message =
        intent.action === "bag"
          ? `バッグ ${getUsedCapacity(this.inventory)}/${this.inventory.capacity}`
          : `${getActionLabel(intent.action)}を選択。隣接する対象をタップ`;
      this.publishExplorationUi();
      return;
    }
    if (intent.type === "toggleRun") {
      this.running = !this.running;
      this.message = this.running
        ? "走行中：移動でスタミナを消費"
        : "歩行中：スタミナを温存";
      this.publishExplorationUi();
      return;
    }
    if (intent.type === "toggleObjective") {
      this.objectiveExpanded = !this.objectiveExpanded;
      this.publishExplorationUi();
      return;
    }
    if (intent.type === "dismissTutorial") {
      this.completeTutorial();
      this.publishExplorationUi();
      return;
    }
    hideGameUi();
    this.openMenu();
  };

  private publishExplorationUi(): void {
    const area = getArea(getSelectedAreaId());
    publishGameUiState({
      screen: "exploration",
      exploration: {
        areaName: area.name,
        depth: this.player.depth,
        maximumDepth: area.maxDepth,
        hp: { current: this.player.hp, maximum: this.player.maxHp },
        stamina: {
          current: this.player.stamina,
          maximum: this.player.maxStamina,
        },
        coins: this.player.coins,
        bagUsed: getUsedCapacity(this.inventory),
        bagCapacity: this.inventory.capacity,
        toolDurability: this.toolCondition.currentDurability,
        toolMaximumDurability: this.toolCondition.maxDurability,
        selectedAction: this.mode,
        running: this.running,
        message: this.message,
        objectiveExpanded: this.objectiveExpanded,
        tutorialStep: this.tutorialStep,
        coolants: this.inventory.coolants,
        disablers: this.inventory.disablers,
        potions: this.inventory.potions,
      },
    });
  }

  private advanceTutorial(completed: Exclude<TutorialStep, "complete">): void {
    this.tutorialStep = advanceTutorialStep(this.tutorialStep, completed);
    if (this.tutorialStep === "complete") {
      this.completeTutorial();
    }
  }

  private completeTutorial(): void {
    this.tutorialStep = "complete";
    const state = getGameState();
    if (state.settings.tutorialSeen) return;
    setGameState({
      ...state,
      settings: { ...state.settings, tutorialSeen: true },
    });
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
      this.stopContinuousMovement();
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
    this.stopContinuousMovement();
  };

  private startDirectionalMove(direction: MoveDirection): void {
    if (this.failed || this.cleared) {
      return;
    }
    this.facing = facingFromMoveDirection(direction);
    this.heldDirection = direction;
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
    this.tapMoveInProgress = true;
    const diagonal = previous.x !== next.x && previous.y !== next.y;
    const duration = diagonal
      ? Math.round(MOVE_DURATION * Math.SQRT2)
      : MOVE_DURATION;
    const targetPosition = { x: next.x + 0.5, y: next.y + 0.5 };
    const targetX = BOARD_X + targetPosition.x * TILE_SIZE;
    const targetY = BOARD_Y + targetPosition.y * TILE_SIZE;
    if (!this.playerSprite) {
      this.moving = false;
      this.tapMoveInProgress = false;
      this.render();
      return;
    }
    this.tweens.add({
      targets: this.playerSprite,
      x: targetX,
      y: targetY,
      duration,
      ease: "Linear",
      onUpdate: () => {
        if (!this.playerSprite) return;
        const frameKey =
          ASSET_KEYS.playerWalk[
            Math.floor(this.time.now / 90) % ASSET_KEYS.playerWalk.length
          ];
        if (this.textures.exists(frameKey)) {
          this.playerImage?.setTexture(frameKey);
          this.playerOutlineImage?.setTexture(frameKey);
        }
        this.playerPosition = {
          x: this.playerSprite.x / TILE_SIZE,
          y: this.playerSprite.y / TILE_SIZE,
        };
      },
      onComplete: () => {
        this.moving = false;
        this.tapMoveInProgress = false;
        this.playerPosition = targetPosition;
        this.advanceTutorial("move");
        this.saveRunState();
        this.tryRecoverAtCurrentPosition();
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
    this.input.off("pointerup", this.handleWorldPointerUp, this);
    this.input.keyboard?.off("keydown", this.handleKeyboardDown);
    this.input.keyboard?.off("keyup", this.handleKeyboardUp);
    this.pressedKeys.clear();
    this.worldCamera.stopFollow();
    this.unsubscribeUiIntent?.();
    this.unsubscribeUiIntent = undefined;
    hideGameUi();
    void saveCoordinator.flushAll("sceneShutdown");
  }

  private stopContinuousMovement(): void {
    if (!this.moving || this.tapMoveInProgress) {
      return;
    }
    this.moving = false;
    this.player = { ...this.player, actionState: "idle" };
    this.render();
  }

  private saveRunState(immediate = false): void {
    const snapshot: LegacyRunInput = {
      areaId: getSelectedAreaId(),
      field: this.field,
      player: this.player,
      playerPosition: this.playerPosition,
      inventory: this.inventory,
      monsters: this.monsters,
      defeatedMonsters: this.defeatedMonsters,
      bossDefeated: this.bossDefeated,
      difficultyId: getGameState().selectedDifficulty,
      tools: [this.toolCondition],
      deathCaches: this.deathCaches,
    };
    if (immediate) {
      saveRun(snapshot);
      return;
    }
    saveCoordinator.markDirty("run", snapshot, "explorationAction");
  }

  /** 単一のワールド入力をタイル操作へ変換する。 */
  private handleWorldPointerUp(pointer: Phaser.Input.Pointer): void {
    if (
      pointer.y < WORLD_TOP ||
      pointer.y > WORLD_TOP + WORLD_HEIGHT ||
      this.joystickPointerId === pointer.id
    ) {
      return;
    }
    const world = this.worldCamera.getWorldPoint(pointer.x, pointer.y);
    const tile = getTile(
      this.field,
      Math.floor((world.x - BOARD_X) / TILE_SIZE),
      Math.floor((world.y - BOARD_Y) / TILE_SIZE),
    );
    if (!tile) return;
    const receiptId = `pointer-${++this.inputReceiptSequence}`;
    this.performanceMonitor.recordInput(receiptId);
    if (pointer.getDuration() > 450) {
      this.handleFlag(tile);
      requestAnimationFrame(() =>
        this.performanceMonitor.recordPresented(receiptId),
      );
      return;
    }
    this.handleTileInteraction(tile);
    requestAnimationFrame(() =>
      this.performanceMonitor.recordPresented(receiptId),
    );
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
    if (this.mode === "mark") {
      this.handleFlag(tile);
      this.mode = "mine";
      return;
    }
    if (this.mode === "cool") {
      if (!this.canUseDisposalTool()) return;
      this.player = { ...this.player, stamina: this.player.stamina - 2 };
      const result = coolMine(this.field, this.inventory, tile);
      this.field = result.field;
      this.inventory = result.inventory;
      this.message = result.message;
      if (result.success) {
        this.toolCondition = {
          ...this.toolCondition,
          currentDurability: Math.max(
            0,
            this.toolCondition.currentDurability - 1,
          ),
        };
        this.feedback("cool", tile, 0x66ccff);
        this.advanceTutorial("treat");
      }
      if (result.success) this.mode = "mine";
      this.render();
      return;
    }
    if (this.mode === "disable") {
      if (!this.canUseDisposalTool()) return;
      this.player = { ...this.player, stamina: this.player.stamina - 2 };
      const result = disableMine(this.field, this.inventory, tile);
      this.field = result.field;
      this.inventory = result.inventory;
      this.message = result.message;
      if (result.success) {
        this.toolCondition = {
          ...this.toolCondition,
          currentDurability: Math.max(
            0,
            this.toolCondition.currentDurability - 1,
          ),
        };
        this.feedback("disable", tile, 0xffd65a);
        this.advanceTutorial("treat");
      }
      if (result.success) this.mode = "mine";
      this.render();
      return;
    }
    if (tile.isWalkable) {
      this.startMoveTo(tile);
      return;
    }
    if (tile.state === "exit") {
      this.player = { ...this.player, x: tile.x, y: tile.y };
      this.playerPosition = { x: tile.x + 0.5, y: tile.y + 0.5 };
      this.claimExitCheckpoint();
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
    if (!result.exploded) {
      this.advanceTutorial("read");
    }
    if (this.player.hp <= 0) this.commitDeath();
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
    const key = `${tile.x},${tile.y}`;
    const existing = this.flagIcons.get(key);
    const current = getTile(this.field, tile.x, tile.y);
    if (current?.mark === "flag") {
      this.advanceTutorial("mark");
    }
    if (existing) {
      existing.setVisible(current?.mark === "flag");
    } else if (current?.mark === "flag" && this.isTileInActiveWindow(current)) {
      const icon = drawGameIcon(
        this,
        BOARD_X + current.x * TILE_SIZE + TILE_SIZE / 2,
        BOARD_Y + current.y * TILE_SIZE + TILE_SIZE / 2,
        "flag",
        0xff563f,
      );
      this.flagIcons.set(key, icon);
      this.tileObjects.push(icon);
      this.uiCamera.ignore(icon);
    }
    this.publishExplorationUi();
    this.saveRunState();
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
        this.commitDeath();
        this.message = "探索失敗...";
      }
    }
    return true;
  }

  private canUseDisposalTool(): boolean {
    if (this.toolCondition.currentDurability <= 0) {
      this.message = "処理道具が壊れています";
      this.render();
      return false;
    }
    if (this.player.stamina < 2) {
      this.message = "スタミナが足りません";
      this.render();
      return false;
    }
    return true;
  }

  private claimExitCheckpoint(): void {
    this.saveRunState(true);
    const exploration = loadExplorationState();
    if (!exploration || typeof localStorage === "undefined") return;
    const checkpoint = exploration.checkpoints[0];
    if (!checkpoint) return;
    const eligible = {
      ...checkpoint,
      status: "eligible" as const,
      progress: Object.fromEntries(
        checkpoint.objectives.map((objective) => [
          objective.id,
          objective.required,
        ]),
      ),
    };
    const ready = {
      ...exploration,
      checkpoints: [eligible],
      dungeon: {
        ...exploration.dungeon,
        checkpoints: [eligible],
      },
    };
    const coordinator = new ExplorationCoordinator(ready, {
      persistent: this.getPersistentStateWithTool(),
      storage: localStorage,
    });
    const result = coordinator.dispatch({
      type: "claimCheckpoint",
      checkpointId: eligible.id,
    });
    const saved = result.accepted ? loadGame() : undefined;
    if (saved) setGameState(saved);
  }

  private commitDeath(): void {
    if (this.failed) return;
    this.saveRunState(true);
    const exploration = loadExplorationState();
    if (exploration && typeof localStorage !== "undefined") {
      const coordinator = new ExplorationCoordinator(exploration, {
        persistent: this.getPersistentStateWithTool(),
        storage: localStorage,
      });
      const result = coordinator.commitDeath(new Date().toISOString());
      if (result.accepted) {
        this.deathCaches = [...result.state.deathCaches];
        this.player = {
          ...this.player,
          x: result.state.player.gridPosition.x,
          y: result.state.player.gridPosition.y,
          hp: result.state.player.hp,
          stamina: result.state.player.stamina,
          actionState: "idle",
        };
        this.playerPosition = result.state.player.position;
        this.inventory = {
          ...this.inventory,
          items: result.state.inventory.items as InventoryState["items"],
        };
        const saved = loadGame();
        if (saved) setGameState(saved);
      }
    }
    this.failed = true;
  }

  private tryRecoverAtCurrentPosition(): void {
    const cache = this.deathCaches.find(
      (candidate) =>
        candidate.position.x === this.player.x &&
        candidate.position.y === this.player.y,
    );
    if (!cache || typeof localStorage === "undefined") return;
    const exploration = loadExplorationState();
    if (!exploration) return;
    const coordinator = new ExplorationCoordinator(exploration, {
      persistent: this.getPersistentStateWithTool(),
      storage: localStorage,
    });
    const result = coordinator.dispatch({
      type: "recoverDeathCache",
      cacheId: cache.id,
    });
    if (!result.accepted) {
      this.message = result.reason ?? "落とし物を回収できません";
      return;
    }
    this.deathCaches = [...result.state.deathCaches];
    this.inventory = {
      ...this.inventory,
      items: result.state.inventory.items as InventoryState["items"],
    };
    const saved = loadGame();
    if (saved) setGameState(saved);
    this.message = "落とし物を全て回収しました";
  }

  private getPersistentStateWithTool(): ReturnType<typeof getGameState> {
    const state = getGameState();
    return {
      ...state,
      toolConditions: {
        ...state.toolConditions,
        [this.toolCondition.equipmentId]: this.toolCondition,
      },
    };
  }

  private checkGeneratedStartSafety(): boolean {
    const radius = DIFFICULTIES[getGameState().selectedDifficulty].safeRadius;
    return this.field.tiles
      .filter(
        (tile) =>
          Math.max(
            Math.abs(tile.x - this.player.x),
            Math.abs(tile.y - this.player.y),
          ) <= radius,
      )
      .every((tile) => !tile.hasMine);
  }

  private readonly handleKeyboardDown = (event: KeyboardEvent): void => {
    const profile = getGameState().controlScheme;
    this.pressedKeys.add(event.code);
    if (event.code === profile.keyBindings.run) {
      this.running = profile.runBehavior === "toggle" ? !this.running : true;
    }
    if (event.code === (profile.keyBindings.mark ?? "KeyF")) {
      this.mode = "mark";
      this.message = "危険マークモード";
    }
    this.updateKeyboardDirection();
  };

  private readonly handleKeyboardUp = (event: KeyboardEvent): void => {
    const profile = getGameState().controlScheme;
    this.pressedKeys.delete(event.code);
    if (
      event.code === profile.keyBindings.run &&
      profile.runBehavior === "hold"
    ) {
      this.running = false;
    }
    this.updateKeyboardDirection();
  };

  /** 設定されたキーの同時押しを8方向入力へ正規化する。 */
  private updateKeyboardDirection(): void {
    const bindings = getGameState().controlScheme.keyBindings;
    const x =
      (this.pressedKeys.has(bindings.right) ? 1 : 0) -
      (this.pressedKeys.has(bindings.left) ? 1 : 0);
    const y =
      (this.pressedKeys.has(bindings.down) ? 1 : 0) -
      (this.pressedKeys.has(bindings.up) ? 1 : 0);
    if (x === 0 && y === 0) {
      if (this.joystickPointerId === undefined) this.heldDirection = undefined;
      return;
    }
    this.startDirectionalMove(
      directionFromAngle(Phaser.Math.RadToDeg(Math.atan2(y, x))),
    );
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

function getActionLabel(action: ExplorationAction): string {
  const labels: Readonly<Record<ExplorationAction, string>> = {
    mine: "採掘",
    mark: "危険マーク",
    cool: "冷却",
    disable: "解除",
    potion: "回復",
    bag: "バッグ",
  };
  return labels[action];
}
