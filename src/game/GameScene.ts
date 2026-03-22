import Phaser from 'phaser';
import { BOARD_CONFIG, DEFAULT_BOARD_DIFFICULTY } from './boardConfig';
import {
  ATTACK_BOX_DEPTH_CELLS,
  ATTACK_BOX_FORWARD_OFFSET_CELLS,
  ATTACK_BOX_SIZE_CELLS,
  BOARD_DIVIDER_STYLE,
  GAME_OVERLAY_STYLE,
  HELP_MODAL_COPY,
  INITIAL_PLAYER_HP,
  INPUT_HIT_PADDING_PX,
  AUTO_ATTACK_INTERVAL_MS,
  MONSTER_HP,
  MONSTER_MARKER_STYLE,
  MONSTER_COLLISION_RADIUS_CELLS,
  MONSTER_SPEED_CELLS_PER_SECOND,
  MOVE_PAD_DEAD_ZONE_RATIO,
  MOVE_SPEED_CELLS_PER_SECOND,
  PLAYER_HIT_KNOCKBACK_CELLS,
  PLAYER_COLLISION_RADIUS_CELLS,
  PLAYER_MARKER_STYLE,
  PLAYER_MONSTER_CONTACT_RADIUS_CELLS,
  PLAYER_MONSTER_HIT_COOLDOWN_MS
} from './constants';
import { DIRECTION, DIRECTION_OFFSET, type Direction, type Position } from './direction';
import { generateBoard } from './boardGenerator';
import { GOAL_STATE, TILE_KIND, type Tile } from './types';

const ACTIVE_BOARD_CONFIG = BOARD_CONFIG[DEFAULT_BOARD_DIFFICULTY];
const MIN_CELL_SIZE = 24;
const BOARD_FRAME_PADDING = 10;
const MOVE_PAD_ACTIVE_TRAVEL_RATIO = 0.42;
const MOVE_SWEEP_STEP_CELLS = 0.08;

type MoveDirection = Direction;

interface Monster {
  pos: Position;
  hp: number;
  marker: Phaser.GameObjects.Container;
  scale: number;
}

type AttackTarget =
  | { kind: 'tile'; position: Position; distance: number }
  | { kind: 'monster'; monster: Monster; position: Position; distance: number };

const NUMBER_COLORS: Record<number, string> = {
  1: '#4ea7ff',
  2: '#32c36b',
  3: '#f55f57',
  4: '#7468ff',
  5: '#af433c',
  6: '#1fabb0',
  7: '#202944',
  8: '#4f4f4f'
};

export class GameScene extends Phaser.Scene {
  private grid: Tile[][] = [];
  private cellBg: Phaser.GameObjects.Rectangle[][] = [];
  private cellText: Phaser.GameObjects.Text[][] = [];

  private playerPos: Position = { x: 0, y: 0 };
  private playerFacing: Direction = DIRECTION.UP;
  private playerFacingAngle = 0;
  private playerHp = INITIAL_PLAYER_HP;

  private gameEnded = false;
  private gameWon = false;

  private hpText!: Phaser.GameObjects.Text;
  private stageText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private helpModal!: Phaser.GameObjects.Container;
  private restartCtaText!: Phaser.GameObjects.Text;
  private endOverlay!: Phaser.GameObjects.Container;
  private endOverlayScrim!: Phaser.GameObjects.Rectangle;
  private endOverlayPanel!: Phaser.GameObjects.Rectangle;
  private endOverlayMessage!: Phaser.GameObjects.Text;
  private endOverlaySubText!: Phaser.GameObjects.Text;
  private nextStageButton!: Phaser.GameObjects.Container;
  private moveInputEnabled = true;
  private attackInputEnabled = true;
  private autoAttackTimer: Phaser.Time.TimerEvent | null = null;
  private movePadOwnerPointerId: number | null = null;
  private movePadVector = { dx: 0, dy: 0 };
  private movePadDirection: MoveDirection | null = null;

  private playerMarker!: Phaser.GameObjects.Container;
  private monsters: Monster[] = [];
  private movePadBase!: Phaser.GameObjects.Arc;
  private movePadKnob!: Phaser.GameObjects.Arc;
  private movePadZone!: Phaser.GameObjects.Zone;
  private attackTargetHighlight!: Phaser.GameObjects.Rectangle;
  private currentAttackTarget: AttackTarget | null = null;
  private lastMonsterHitAt = -PLAYER_MONSTER_HIT_COOLDOWN_MS;
  private stageNumber = 1;

  private boardX = 0;
  private boardY = 0;
  private boardAreaH = 0;
  private gridY = 0;
  private cellSize = 32;
  private cellWidth = 32;
  private cellHeight = 32;
  private bottomY = 0;
  private panelWidth = 0;
  private topPanelH = 0;
  private bottomPanelH = 0;
  private safeTop = 0;
  private safeBottom = 0;

  private gridWidth = ACTIVE_BOARD_CONFIG.width;
  private gridHeight = ACTIVE_BOARD_CONFIG.height;
  private mineCount = ACTIVE_BOARD_CONFIG.mineCount;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#060d1b');
    this.input.addPointer(3);
    this.computeLayout();
    this.drawFrames();
    this.addTopUi();
    this.addBottomUi();
    this.addEndOverlay();
    this.newRun();

    this.startAutoAttack();

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.updateMovePad(pointer));
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => this.stopMovePad(pointer));
    this.input.on('gameout', () => this.forceStopMovePad());

    this.scale.on('resize', () => {
      this.scene.restart();
    });
  }

  update(_time: number, delta: number): void {
    if (this.gameEnded || !this.moveInputEnabled) {
      return;
    }

    const movement = this.getMoveVector();
    if (movement.dx !== 0 || movement.dy !== 0) {
      const step = MOVE_SPEED_CELLS_PER_SECOND * (delta / 1000);
      this.movePlayer(movement.dx * step, movement.dy * step);
    }

    this.updateMonsters(delta);
    this.checkMonsterContact();
  }

  private computeLayout(): void {
    const w = this.scale.gameSize.width;
    const h = this.scale.gameSize.height;
    const horizontalPadding = 8;

    const rootStyle = getComputedStyle(document.documentElement);
    const safeTop = Number.parseInt(rootStyle.getPropertyValue('--safe-top'), 10);
    const safeBottom = Number.parseInt(rootStyle.getPropertyValue('--safe-bottom'), 10);
    this.safeTop = Number.isFinite(safeTop) ? safeTop : 0;
    this.safeBottom = Number.isFinite(safeBottom) ? safeBottom : 0;

    const playableH = h - this.safeTop - this.safeBottom;
    this.topPanelH = 58;
    this.bottomPanelH = Math.max(132, Math.floor(playableH * 0.2));
    this.boardAreaH = Math.max(220, playableH - this.topPanelH - this.bottomPanelH);

    const maxBoardW = w - horizontalPadding * 2 - BOARD_FRAME_PADDING;
    const maxGridH = this.boardAreaH - BOARD_FRAME_PADDING;

    this.cellSize = Math.max(
      MIN_CELL_SIZE,
      Math.floor(Math.min(maxBoardW / ACTIVE_BOARD_CONFIG.width, maxGridH / ACTIVE_BOARD_CONFIG.height))
    );

    this.gridWidth = Math.max(ACTIVE_BOARD_CONFIG.width, Math.floor(maxBoardW / this.cellSize));
    this.gridHeight = Math.max(ACTIVE_BOARD_CONFIG.height, Math.floor(maxGridH / this.cellSize));

    this.cellSize = Math.max(
      MIN_CELL_SIZE,
      Math.floor(Math.min(maxBoardW / this.gridWidth, maxGridH / this.gridHeight))
    );
    this.cellWidth = this.cellSize;
    this.cellHeight = this.cellSize;

    const boardWidth = this.cellWidth * this.gridWidth;
    const boardHeight = this.cellHeight * this.gridHeight;

    const baseDensity = ACTIVE_BOARD_CONFIG.mineCount / (ACTIVE_BOARD_CONFIG.width * ACTIVE_BOARD_CONFIG.height);
    const targetMineCount = Math.round(this.gridWidth * this.gridHeight * baseDensity);
    const maxMineCount = Math.max(1, this.gridWidth * this.gridHeight - 67);
    this.mineCount = Phaser.Math.Clamp(targetMineCount, 1, maxMineCount);

    this.boardX = Math.floor((w - boardWidth) / 2);
    this.boardY = this.safeTop + this.topPanelH;
    this.gridY = this.boardY + Math.floor((this.boardAreaH - boardHeight) / 2);
    this.bottomY = this.boardY + this.boardAreaH;
    this.panelWidth = Math.min(w - horizontalPadding * 2, boardWidth + BOARD_FRAME_PADDING);
  }

  private drawFrames(): void {
    const w = this.scale.gameSize.width;
    const boardCenterX = this.boardX + (this.gridWidth * this.cellSize) / 2;
    const boardCenterY = this.gridY + (this.gridHeight * this.cellSize) / 2;

    this.add
      .rectangle(w / 2, this.safeTop + this.topPanelH / 2, this.panelWidth, this.topPanelH - 4, 0x081126)
      .setStrokeStyle(1, 0x28406d, 0.95);

    this.add
      .rectangle(
        boardCenterX,
        boardCenterY,
        this.gridWidth * this.cellSize + BOARD_FRAME_PADDING,
        this.gridHeight * this.cellSize + BOARD_FRAME_PADDING,
        0x0a1324
      )
      .setStrokeStyle(2, 0x476998, 0.95);

    this.add
      .rectangle(w / 2, this.bottomY + this.bottomPanelH / 2, this.panelWidth, this.bottomPanelH - 4, 0x081126)
      .setStrokeStyle(1, 0x28406d, 0.95);

    this.add
      .line(boardCenterX, this.bottomY + 1, 0, 0, 0, 1, BOARD_DIVIDER_STYLE.color, BOARD_DIVIDER_STYLE.alpha)
      .setLineWidth(BOARD_DIVIDER_STYLE.width)
      .setOrigin(0.5, 0);
  }

  private addTopUi(): void {
    const left = Math.floor((this.scale.gameSize.width - this.panelWidth) / 2) + 10;
    const right = left + this.panelWidth - 20;

    this.hpText = this.add.text(left, this.safeTop + 18, '', {
      color: '#f0f6ff',
      fontSize: '16px',
      fontStyle: 'bold'
    });

    this.stageText = this.add.text(left + 64, this.safeTop + 18, '', {
      color: '#cddcff',
      fontSize: '14px',
      fontStyle: 'bold'
    });

    const helpBtn = this.makeButton(right - 72, this.safeTop + 12, 32, 32, '?', () => {
      this.helpModal.setVisible(true);
    });
    const restartBtn = this.makeButton(right - 36, this.safeTop + 12, 32, 32, '↺', () => {
      this.newRun();
    });
    helpBtn.setDepth(5);
    restartBtn.setDepth(5);

    this.statusText = this.add
      .text(right - 84, this.safeTop + 20, '', {
        color: '#f0f6ff',
        fontSize: '13px',
        fontStyle: 'bold'
      })
      .setOrigin(1, 0);

    this.helpModal = this.createHelpModal();
  }

  private addBottomUi(): void {
    const panelLeft = Math.floor((this.scale.gameSize.width - this.panelWidth) / 2);
    const left = panelLeft + 12;
    const top = this.bottomY + 10;
    const contentH = Math.max(110, this.bottomPanelH - 20);
    const panelInnerWidth = this.panelWidth - 24;

    const attackSize = Math.max(72, Math.min(92, contentH - 10));
    const attackRadius = Math.floor(attackSize / 2);
    const attackCenterX = panelLeft + this.panelWidth - attackRadius - 16;
    const attackCenterY = top + Math.floor(contentH / 2);

    const reservedRightWidth = attackSize + 28;
    const availablePadWidth = Math.max(88, panelInnerWidth - reservedRightWidth);
    const padSize = Math.min(Math.min(104, contentH - 8), availablePadWidth);
    const padRadius = Math.floor(padSize / 2);
    const padCenterX = panelLeft + Math.floor(availablePadWidth / 2) + 12;
    const padCenterY = top + Math.floor(contentH / 2);

    this.makeMovePad(padCenterX, padCenterY, padRadius);

    this.makeCircleButton(
      attackCenterX,
      attackCenterY,
      attackRadius,
      'AUTO',
      0x37506f,
      '#dff3ff',
      18
    );

    this.restartCtaText = this.add
      .text(left + this.panelWidth / 2 - 12, this.bottomY + this.bottomPanelH - 22, '', {
        color: '#ffddab',
        fontSize: '12px',
        fontStyle: 'bold'
      })
      .setOrigin(0.5, 0.5)
      .setDepth(3);
  }

  private makeMovePad(centerX: number, centerY: number, radius: number): void {
    this.movePadBase = this.add.circle(centerX, centerY, radius, 0x21314f, 0.96).setStrokeStyle(2, 0xc08b55, 0.95);

    this.add.circle(centerX, centerY, Math.max(18, Math.floor(radius * 0.34)), 0x18243d, 0.95).setStrokeStyle(1, 0x48638f, 0.85);

    this.movePadKnob = this.add
      .circle(centerX, centerY, Math.max(20, Math.floor(radius * 0.36)), 0x4a628c, 0.98)
      .setStrokeStyle(2, 0xe2efff, 0.95)
      .setDepth(3);

    this.movePadZone = this.add.zone(centerX - radius, centerY - radius, radius * 2, radius * 2).setOrigin(0).setDepth(4);
    this.movePadZone
      .setInteractive(new Phaser.Geom.Circle(radius, radius, radius + INPUT_HIT_PADDING_PX), Phaser.Geom.Circle.Contains)
      .on('pointerdown', (pointer: Phaser.Input.Pointer) => this.startMovePad(pointer))
      .on('pointermove', (pointer: Phaser.Input.Pointer) => this.updateMovePad(pointer))
      .on('pointerup', (pointer: Phaser.Input.Pointer) => this.stopMovePad(pointer))
      .on('pointerupoutside', (pointer: Phaser.Input.Pointer) => this.stopMovePad(pointer))
      .on('pointerout', (pointer: Phaser.Input.Pointer) => {
        if (!pointer.isDown) {
          this.stopMovePad(pointer);
        }
      });
  }

  private addEndOverlay(): void {
    const boardWidth = this.gridWidth * this.cellSize + BOARD_FRAME_PADDING;
    const boardHeight = this.gridHeight * this.cellSize + BOARD_FRAME_PADDING;
    const centerX = this.boardX + (this.gridWidth * this.cellSize) / 2;
    const centerY = this.gridY + (this.gridHeight * this.cellSize) / 2;

    this.endOverlayScrim = this.add
      .rectangle(centerX, centerY, boardWidth, boardHeight, GAME_OVERLAY_STYLE.scrimColor, GAME_OVERLAY_STYLE.scrimAlpha)
      .setDepth(15)
      .setVisible(false);
    this.endOverlayPanel = this.add
      .rectangle(centerX, centerY, Math.min(boardWidth - 24, 240), 88, GAME_OVERLAY_STYLE.panelColor, 0.96)
      .setStrokeStyle(2, GAME_OVERLAY_STYLE.panelStroke, 1)
      .setDepth(16)
      .setVisible(false);
    this.endOverlayMessage = this.add
      .text(centerX, centerY - 10, '', {
        color: GAME_OVERLAY_STYLE.textColor,
        fontSize: '20px',
        fontStyle: 'bold',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(17)
      .setVisible(false);
    this.endOverlaySubText = this.add
      .text(centerX, centerY + 14, GAME_OVERLAY_STYLE.subText, {
        color: GAME_OVERLAY_STYLE.subTextColor,
        fontSize: '12px',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(17)
      .setVisible(false);
    this.nextStageButton = this.makeButton(centerX - 42, centerY + 30, 84, 30, '次へ', () => {
      if (!this.gameEnded || !this.gameWon) {
        return;
      }
      this.stageNumber += 1;
      this.newRun();
    })
      .setDepth(17)
      .setVisible(false);

    this.endOverlay = this.add.container(0, 0, [this.endOverlayScrim, this.endOverlayPanel, this.endOverlayMessage, this.endOverlaySubText, this.nextStageButton]).setDepth(15).setVisible(false);
  }

  private createHelpModal(): Phaser.GameObjects.Container {
    const w = this.scale.gameSize.width;
    const h = this.scale.gameSize.height;
    const modalW = Math.min(this.panelWidth, w - 20);
    const modalH = Math.min(280, h - this.safeTop - this.safeBottom - 32);
    const left = (w - modalW) / 2;
    const top = (h - modalH) / 2;

    const scrim = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.64).setInteractive();
    const panel = this.add.rectangle(left, top, modalW, modalH, 0x0b1830).setOrigin(0).setStrokeStyle(1, 0x6a8ec8, 0.95);
    const title = this.add.text(left + 12, top + 10, '遊び方', {
      color: '#f3f7ff',
      fontSize: '14px',
      fontStyle: 'bold'
    });
    const body = this.add.text(left + 12, top + 38, HELP_MODAL_COPY.join('\n'), {
      color: '#d7e6ff',
      fontSize: '12px',
      lineSpacing: 4,
      wordWrap: { width: modalW - 24 }
    });
    const closeBtn = this.makeButton(left + modalW - 68, top + modalH - 38, 56, 28, '閉じる', () => {
      modal.setVisible(false);
    });
    const modal = this.add.container(0, 0, [scrim, panel, title, body, closeBtn]).setDepth(20).setVisible(false);

    scrim.on('pointerdown', () => modal.setVisible(false));
    return modal;
  }

  private makeButton(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    onTap: () => void
  ): Phaser.GameObjects.Container {
    const box = this.add
      .rectangle(0, 0, w, h, 0x2a385a)
      .setOrigin(0)
      .setStrokeStyle(1, 0x7796c7, 0.9);
    const text = this.add
      .text(w / 2, h / 2, label, { color: '#f1f7ff', fontSize: '16px', fontStyle: 'bold' })
      .setOrigin(0.5);
    const c = this.add.container(x, y, [box, text]);
    box.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      box.setFillStyle(0x3a4d73);
    });
    box.on('pointerup', () => {
      box.setFillStyle(0x2a385a);
      onTap();
    });
    box.on('pointerout', () => box.setFillStyle(0x2a385a));
    return c;
  }

  private makeCircleButton(
    centerX: number,
    centerY: number,
    radius: number,
    label: string,
    fillColor: number,
    textColor: string,
    fontSize: number
  ): Phaser.GameObjects.Container {
    const box = this.add.circle(0, 0, radius, fillColor).setStrokeStyle(2, 0x86c5ff, 0.95);
    const text = this.add
      .text(0, 0, label, { color: textColor, fontSize: `${fontSize}px`, fontStyle: 'bold' })
      .setOrigin(0.5);

    return this.add.container(centerX, centerY, [box, text]);
  }

  private startMovePad(pointer: Phaser.Input.Pointer): void {
    if (!this.moveInputEnabled || (this.movePadOwnerPointerId !== null && this.movePadOwnerPointerId !== pointer.id)) {
      return;
    }

    this.movePadOwnerPointerId = pointer.id;
    this.updateMovePad(pointer);
  }

  private updateMovePad(pointer: Phaser.Input.Pointer): void {
    if (!this.moveInputEnabled || this.movePadOwnerPointerId !== pointer.id || !pointer.isDown) {
      return;
    }

    const centerX = this.movePadBase.x;
    const centerY = this.movePadBase.y;
    const rawDx = pointer.x - centerX;
    const rawDy = pointer.y - centerY;
    const distance = Math.hypot(rawDx, rawDy);
    const normalizedDistance = this.movePadBase.radius === 0 ? 0 : Phaser.Math.Clamp(distance / this.movePadBase.radius, 0, 1);

    if (normalizedDistance <= MOVE_PAD_DEAD_ZONE_RATIO) {
      this.movePadVector = { dx: 0, dy: 0 };
      this.movePadDirection = null;
      this.refreshMovePadVisuals();
      this.refreshUi();
      return;
    }

    const direction = this.directionFromVector(rawDx, rawDy);
    const angleDeg = Math.round((Phaser.Math.RadToDeg(Math.atan2(rawDy, rawDx)) + 90) / 5) * 5;
    const radians = Phaser.Math.DegToRad(angleDeg - 90);

    this.movePadVector = {
      dx: Math.cos(radians),
      dy: Math.sin(radians)
    };
    this.movePadDirection = direction;
    this.setFacingFromInput(rawDx, rawDy, direction);
    this.refreshMovePadVisuals(rawDx, rawDy);
    this.redrawPlayer();
    this.refreshUi();
  }

  private stopMovePad(pointer: Phaser.Input.Pointer): void {
    if (this.movePadOwnerPointerId !== pointer.id) {
      return;
    }

    this.forceStopMovePad();
  }

  private forceStopMovePad(): void {
    this.movePadOwnerPointerId = null;
    this.movePadVector = { dx: 0, dy: 0 };
    this.movePadDirection = null;
    this.refreshMovePadVisuals();
    this.refreshUi();
  }

  private refreshMovePadVisuals(rawDx = 0, rawDy = 0): void {
    const centerX = this.movePadBase.x;
    const centerY = this.movePadBase.y;
    const active = this.moveInputEnabled && this.movePadDirection !== null;
    const knobTravel = Math.floor(this.movePadBase.radius * MOVE_PAD_ACTIVE_TRAVEL_RATIO);
    const distance = Math.hypot(rawDx, rawDy);
    const scale = distance === 0 ? 0 : Math.min(knobTravel, distance) / distance;

    this.movePadBase.setFillStyle(active ? 0x2d4168 : 0x21314f, 0.96);
    this.movePadKnob.setPosition(centerX + rawDx * scale, centerY + rawDy * scale);
    this.movePadKnob.setFillStyle(active ? 0x6e8fbf : 0x4a628c, 0.98);
  }

  private directionFromVector(dx: number, dy: number): MoveDirection {
    const angle = Phaser.Math.RadToDeg(Math.atan2(dy, dx));

    if (angle >= -22.5 && angle < 22.5) {
      return DIRECTION.RIGHT;
    }
    if (angle >= 22.5 && angle < 67.5) {
      return DIRECTION.DOWN_RIGHT;
    }
    if (angle >= 67.5 && angle < 112.5) {
      return DIRECTION.DOWN;
    }
    if (angle >= 112.5 && angle < 157.5) {
      return DIRECTION.DOWN_LEFT;
    }
    if (angle >= 157.5 || angle < -157.5) {
      return DIRECTION.LEFT;
    }
    if (angle >= -157.5 && angle < -112.5) {
      return DIRECTION.UP_LEFT;
    }
    if (angle >= -112.5 && angle < -67.5) {
      return DIRECTION.UP;
    }

    return DIRECTION.UP_RIGHT;
  }


  private formatDirection(direction: Direction): string {
    switch (direction) {
      case DIRECTION.UP:
        return '↑';
      case DIRECTION.UP_RIGHT:
        return '↗';
      case DIRECTION.RIGHT:
        return '→';
      case DIRECTION.DOWN_RIGHT:
        return '↘';
      case DIRECTION.DOWN:
        return '↓';
      case DIRECTION.DOWN_LEFT:
        return '↙';
      case DIRECTION.LEFT:
        return '←';
      case DIRECTION.UP_LEFT:
        return '↖';
    }
  }

  private startAutoAttack(): void {
    this.autoAttackTimer?.remove(false);
    this.autoAttackTimer = this.time.addEvent({
      delay: AUTO_ATTACK_INTERVAL_MS,
      loop: true,
      callback: () => {
        if (!this.attackInputEnabled || this.gameEnded) {
          return;
        }

        this.tryAttackForward();
      }
    });
  }

  private newRun(): void {
    this.unlockInputs();
    this.gameEnded = false;
    this.gameWon = false;
    this.playerHp = INITIAL_PLAYER_HP;

    const generatedBoard = generateBoard({ width: this.gridWidth, height: this.gridHeight, mineCount: this.mineCount });
    this.grid = generatedBoard.grid;
    this.playerPos = { x: generatedBoard.start.x + 0.5, y: generatedBoard.start.y + 0.5 };
    this.playerFacing = DIRECTION.UP;
    this.playerFacingAngle = 0;
    this.currentAttackTarget = null;
    this.lastMonsterHitAt = -PLAYER_MONSTER_HIT_COOLDOWN_MS;
    this.monsters.forEach((monster) => monster.marker.destroy());
    this.monsters = [];

    this.cellBg.flat().forEach((r) => r.destroy());
    this.cellText.flat().forEach((t) => t.destroy());
    this.cellBg = [];
    this.cellText = [];

    for (let y = 0; y < this.gridHeight; y += 1) {
      this.cellBg[y] = [];
      this.cellText[y] = [];
      for (let x = 0; x < this.gridWidth; x += 1) {
        const px = this.boardX + x * this.cellSize;
        const py = this.gridY + y * this.cellSize;
        const rect = this.add
          .rectangle(px, py, this.cellWidth - 2, this.cellHeight - 2, 0x4a556f)
          .setOrigin(0)
          .setStrokeStyle(1, 0x2a3447, 0.95);
        const txt = this.add
          .text(px + this.cellWidth / 2, py + this.cellHeight / 2, '', {
            color: '#f3f5ff',
            fontSize: Math.min(this.cellWidth, this.cellHeight) >= 26 ? '16px' : '13px',
            fontStyle: 'bold'
          })
          .setOrigin(0.5);

        this.cellBg[y][x] = rect;
        this.cellText[y][x] = txt;
      }
    }

    this.attackTargetHighlight?.destroy();
    this.attackTargetHighlight = this.add
      .rectangle(0, 0, this.cellWidth - 4, this.cellHeight - 4)
      .setOrigin(0)
      .setFillStyle(0x000000, 0)
      .setStrokeStyle(3, 0xffb54d, 0.95)
      .setDepth(9)
      .setVisible(false);

    this.playerMarker?.destroy();
    this.playerMarker = this.createPlayerMarker().setDepth(10);

    this.redrawAll();
    this.refreshMovePadVisuals();
    this.refreshUi();
  }

  private movePlayer(dx: number, dy: number): void {
    this.updateFacingFromVector(dx, dy);

    const movedPosition = this.resolveMovementForEntity(this.playerPos, dx, dy, PLAYER_COLLISION_RADIUS_CELLS);

    if (movedPosition.x !== this.playerPos.x || movedPosition.y !== this.playerPos.y) {
      this.playerPos = movedPosition;
      this.checkGoalReached();
      this.checkMonsterContact();
      this.redrawPlayer();
      this.refreshUi();
      return;
    }

    this.redrawPlayer();
    this.refreshUi();
  }

  private clampAxis(value: number, maxCells: number, radius: number): number {
    return Phaser.Math.Clamp(value, radius, maxCells - radius);
  }

  private tryAttackForward(): void {
    if (this.gameEnded || !this.attackInputEnabled) return;

    const target = this.findAttackTarget();
    if (!target) return;

    const projectile = this.add.circle(
      this.boardX + this.playerPos.x * this.cellSize,
      this.gridY + this.playerPos.y * this.cellSize,
      Math.max(4, Math.floor(this.cellSize * 0.11)),
      0x45f0ff,
      1
    ).setDepth(12).setStrokeStyle(2, 0xd8feff, 1);

    const targetX = this.boardX + (target.kind === 'monster' ? target.monster.pos.x : target.position.x + 0.5) * this.cellSize;
    const targetY = this.gridY + (target.kind === 'monster' ? target.monster.pos.y : target.position.y + 0.5) * this.cellSize;

    this.tweens.add({
      targets: projectile,
      x: targetX,
      y: targetY,
      duration: 90,
      ease: 'Linear',
      onComplete: () => {
        projectile.destroy();
        this.resolveAttackHit(target);
      }
    });
  }

  private resolveAttackHit(target: AttackTarget): void {
    if (this.gameEnded) {
      return;
    }

    if (target.kind === 'monster') {
      if (!this.monsters.includes(target.monster)) {
        this.refreshAttackTargetHighlight();
        this.refreshUi();
        return;
      }
      target.monster.hp -= 1;
      if (target.monster.hp <= 0) {
        target.monster.marker.destroy();
        this.monsters = this.monsters.filter((monster) => monster !== target.monster);
      }
      this.refreshAttackTargetHighlight();
      this.refreshUi();
      return;
    }

    const targetTile = this.grid[target.position.y][target.position.x];
    if (targetTile.isOpen) return;

    targetTile.isOpen = true;

    if (targetTile.goalState === GOAL_STATE.HIDDEN) {
      targetTile.goalState = GOAL_STATE.REVEALED;
      targetTile.tileKind = TILE_KIND.GOAL;
      this.redrawCell(target.position.x, target.position.y);
      this.refreshUi();
      this.refreshAttackTargetHighlight();
      return;
    }

    if (targetTile.hasMine) {
      targetTile.tileKind = TILE_KIND.SCORCHED;
      this.spawnMonster(target.position);
      this.redrawCell(target.position.x, target.position.y);
      this.refreshUi();
      this.refreshAttackTargetHighlight();
      return;
    }

    targetTile.tileKind = TILE_KIND.FLOOR;
    const openedPositions = this.expandOpenAreaFrom(target.position);
    this.redrawCells(openedPositions);
    this.refreshUi();
    this.refreshAttackTargetHighlight();
  }

  private findAttackTarget(): AttackTarget | null {
    const facingVector = this.getFacingUnitVector();
    const sideVector = { x: -facingVector.y, y: facingVector.x };
    const boxCenterX = this.playerPos.x + facingVector.x * ATTACK_BOX_FORWARD_OFFSET_CELLS;
    const boxCenterY = this.playerPos.y + facingVector.y * ATTACK_BOX_FORWARD_OFFSET_CELLS;
    const halfSize = ATTACK_BOX_SIZE_CELLS / 2;
    const candidates: AttackTarget[] = [];

    const minX = Math.max(0, Math.floor(boxCenterX - ATTACK_BOX_DEPTH_CELLS));
    const maxX = Math.min(this.gridWidth - 1, Math.ceil(boxCenterX + ATTACK_BOX_DEPTH_CELLS));
    const minY = Math.max(0, Math.floor(boxCenterY - ATTACK_BOX_DEPTH_CELLS));
    const maxY = Math.min(this.gridHeight - 1, Math.ceil(boxCenterY + ATTACK_BOX_DEPTH_CELLS));

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const tile = this.grid[y][x];
        if (tile.isOpen) {
          continue;
        }

        const tileCenterX = x + 0.5;
        const tileCenterY = y + 0.5;
        const relativeX = tileCenterX - this.playerPos.x;
        const relativeY = tileCenterY - this.playerPos.y;
        const forwardDistance = relativeX * facingVector.x + relativeY * facingVector.y;
        const lateralDistance = Math.abs(relativeX * sideVector.x + relativeY * sideVector.y);

        const intersects =
          forwardDistance >= ATTACK_BOX_FORWARD_OFFSET_CELLS - 0.75 &&
          forwardDistance <= ATTACK_BOX_FORWARD_OFFSET_CELLS + ATTACK_BOX_DEPTH_CELLS &&
          lateralDistance <= halfSize + 0.5;

        if (!intersects) {
          continue;
        }

        const distance = Phaser.Math.Distance.Between(this.playerPos.x, this.playerPos.y, tileCenterX, tileCenterY);
        candidates.push({ kind: 'tile', position: { x, y }, distance });
      }
    }

    for (const monster of this.monsters) {
      const relativeX = monster.pos.x - this.playerPos.x;
      const relativeY = monster.pos.y - this.playerPos.y;
      const forwardDistance = relativeX * facingVector.x + relativeY * facingVector.y;
      const lateralDistance = Math.abs(relativeX * sideVector.x + relativeY * sideVector.y);
      const intersects =
        forwardDistance >= 0 &&
        forwardDistance <= ATTACK_BOX_FORWARD_OFFSET_CELLS + ATTACK_BOX_DEPTH_CELLS &&
        lateralDistance <= halfSize + MONSTER_COLLISION_RADIUS_CELLS;

      if (!intersects) {
        continue;
      }

      candidates.push({
        kind: 'monster',
        monster,
        position: { x: Math.floor(monster.pos.x), y: Math.floor(monster.pos.y) },
        distance: Phaser.Math.Distance.Between(this.playerPos.x, this.playerPos.y, monster.pos.x, monster.pos.y)
      });
    }

    candidates.sort((a, b) => a.distance - b.distance);
    return candidates[0] ?? null;
  }

  private expandOpenAreaFrom(origin: Position): Position[] {
    const openedPositions: Position[] = [];
    const queue: Position[] = [origin];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        continue;
      }

      const key = `${current.x},${current.y}`;
      if (visited.has(key) || !this.inRange(current.x, current.y)) {
        continue;
      }
      visited.add(key);

      const tile = this.grid[current.y][current.x];
      if (tile.hasMine || tile.tileKind === TILE_KIND.SCORCHED) {
        continue;
      }

      if (!tile.isOpen) {
        tile.isOpen = true;
        if (tile.goalState === GOAL_STATE.HIDDEN) {
          tile.goalState = GOAL_STATE.REVEALED;
          tile.tileKind = TILE_KIND.GOAL;
        } else if (tile.tileKind === TILE_KIND.WALL) {
          tile.tileKind = TILE_KIND.FLOOR;
        }
      }

      openedPositions.push(current);

      if (tile.goalState === GOAL_STATE.REVEALED || tile.adjacentMineCount > 0) {
        continue;
      }

      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) {
            continue;
          }

          const nextX = current.x + dx;
          const nextY = current.y + dy;
          if (!this.inRange(nextX, nextY)) {
            continue;
          }

          const neighbor = this.grid[nextY][nextX];
          if (neighbor.hasMine || neighbor.tileKind === TILE_KIND.SCORCHED) {
            continue;
          }

          queue.push({ x: nextX, y: nextY });
        }
      }
    }

    return openedPositions;
  }

  private redrawCells(positions: Position[]): void {
    positions.forEach(({ x, y }) => this.redrawCell(x, y));
  }

  private checkGoalReached(): void {
    const currentCell = this.getPlayerCell();
    const tile = this.grid[currentCell.y][currentCell.x];
    if (tile.goalState === GOAL_STATE.REVEALED) {
      this.setEndState(true);
    }
  }

  private setEndState(didWin: boolean): void {
    this.gameEnded = true;
    this.gameWon = didWin;
    this.lockInputs();
    this.endOverlayMessage.setText(didWin ? 'CLEAR!' : 'GAME OVER');
    this.endOverlaySubText.setText(didWin ? '次のステージへ進もう' : GAME_OVERLAY_STYLE.subText);
    this.endOverlay.setVisible(true);
    this.endOverlayScrim.setVisible(true);
    this.endOverlayPanel.setVisible(true);
    this.endOverlayMessage.setVisible(true);
    this.endOverlaySubText.setVisible(true);
    this.nextStageButton.setVisible(didWin);
    this.attackTargetHighlight?.setVisible(false);
    this.currentAttackTarget = null;
    this.refreshUi();
  }

  private lockInputs(): void {
    this.moveInputEnabled = false;
    this.attackInputEnabled = false;
    this.movePadOwnerPointerId = null;
    this.movePadVector = { dx: 0, dy: 0 };
    this.movePadDirection = null;
    this.refreshMovePadVisuals();
  }

  private unlockInputs(): void {
    this.moveInputEnabled = true;
    this.attackInputEnabled = true;
    this.movePadOwnerPointerId = null;
    this.movePadVector = { dx: 0, dy: 0 };
    this.movePadDirection = null;
    this.refreshMovePadVisuals();
    if (this.endOverlay) {
      this.endOverlay.setVisible(false);
      this.endOverlay.list.forEach((child) => {
        const visibleChild = child as Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text | Phaser.GameObjects.Container;
        visibleChild.setVisible(false);
      });
    }
  }

  private redrawAll(): void {
    for (let y = 0; y < this.gridHeight; y += 1) {
      for (let x = 0; x < this.gridWidth; x += 1) {
        this.redrawCell(x, y);
      }
    }
    this.redrawPlayer();
  }

  private redrawCell(x: number, y: number): void {
    const cell = this.grid[y][x];
    const bg = this.cellBg[y][x];
    const txt = this.cellText[y][x];

    if (!cell.isOpen) {
      bg.setFillStyle(0x4b5569);
      bg.setStrokeStyle(1, 0x30384a, 1);
      txt.setText('');
      return;
    }

    if (cell.goalState === GOAL_STATE.REVEALED) {
      bg.setFillStyle(0x2d6849);
      bg.setStrokeStyle(1, 0x76d39e, 1);
      txt.setColor('#d8ffe9');
      txt.setText('G');
      return;
    }

    if (cell.tileKind === TILE_KIND.SCORCHED) {
      bg.setFillStyle(0x5d3b30);
      bg.setStrokeStyle(1, 0x8c5f4f, 1);
      txt.setColor(NUMBER_COLORS[cell.adjacentMineCount] ?? '#f7e7df');
      txt.setText(cell.adjacentMineCount > 0 ? String(cell.adjacentMineCount) : '');
      return;
    }

    if (cell.tileKind === TILE_KIND.START) {
      bg.setFillStyle(0x8ac0c8);
      bg.setStrokeStyle(1, 0xafdce3, 1);
    } else {
      bg.setFillStyle(0xdce4ef);
      bg.setStrokeStyle(1, 0xa8b5c7, 1);
    }

    txt.setColor(NUMBER_COLORS[cell.adjacentMineCount] ?? '#3a4a60');
    txt.setText(cell.adjacentMineCount > 0 ? String(cell.adjacentMineCount) : '');
  }

  private createPlayerMarker(): Phaser.GameObjects.Container {
    const bodyRadius = Math.max(7, Math.floor(this.cellSize * 0.23));
    const outlineBody = this.add.circle(0, 0, bodyRadius + 2, PLAYER_MARKER_STYLE.outlineColor, 1);
    const body = this.add.circle(0, 0, bodyRadius, PLAYER_MARKER_STYLE.bodyColor, 1);
    const visor = this.add.ellipse(0, -bodyRadius * 0.55, bodyRadius * 1.2, Math.max(6, bodyRadius * 0.82), PLAYER_MARKER_STYLE.visorColor, 1);
    const backpack = this.add.circle(0, bodyRadius * 0.48, Math.max(3, bodyRadius * 0.34), PLAYER_MARKER_STYLE.pointerColor, 1);

    return this.add.container(0, 0, [outlineBody, body, visor, backpack]);
  }

  private createMonsterMarker(): Phaser.GameObjects.Container {
    const size = Math.max(8, Math.floor(this.cellSize * 0.18));
    const outline = this.add.circle(0, 0, size + 4, MONSTER_MARKER_STYLE.outlineColor, 1);
    const body = this.add.circle(0, 0, size + 2, MONSTER_MARKER_STYLE.bodyColor, 1);
    const hornLeft = this.add.triangle(-size * 0.45, -size * 0.95, 0, 0, size * 0.7, size * 0.9, -size * 0.35, size * 0.85, MONSTER_MARKER_STYLE.bodyColor, 1);
    const hornRight = this.add.triangle(size * 0.45, -size * 0.95, 0, 0, size * 0.35, size * 0.85, -size * 0.7, size * 0.9, MONSTER_MARKER_STYLE.bodyColor, 1);
    const eyeLeft = this.add.circle(-size * 0.45, -1, Math.max(1.5, size * 0.18), MONSTER_MARKER_STYLE.eyeColor, 1);
    const eyeRight = this.add.circle(size * 0.45, -1, Math.max(1.5, size * 0.18), MONSTER_MARKER_STYLE.eyeColor, 1);

    return this.add.container(0, 0, [outline, hornLeft, hornRight, body, eyeLeft, eyeRight]);
  }

  private redrawPlayer(): void {
    const px = this.boardX + this.playerPos.x * this.cellSize;
    const py = this.gridY + this.playerPos.y * this.cellSize;
    this.playerMarker.setPosition(px, py);
    this.playerMarker.setRotation(Phaser.Math.DegToRad(this.playerFacingAngle));
    this.refreshAttackTargetHighlight();
  }


  private updateMonsters(delta: number): void {
    if (this.monsters.length === 0) {
      return;
    }

    const moveDistance = this.getMonsterSpeed() * (delta / 1000);
    for (const monster of this.monsters) {
      const toPlayerX = this.playerPos.x - monster.pos.x;
      const toPlayerY = this.playerPos.y - monster.pos.y;
      const distance = Math.hypot(toPlayerX, toPlayerY);
      if (distance === 0) {
        continue;
      }

      const scale = Math.min(moveDistance, distance) / distance;
      monster.pos = this.resolveMovementForEntity(
        monster.pos,
        toPlayerX * scale,
        toPlayerY * scale,
        this.getMonsterCollisionRadius(monster)
      );
      this.redrawMonster(monster);
    }
  }

  private spawnMonster(position: Position): void {
    const marker = this.createMonsterMarker().setDepth(11);

    const monster: Monster = {
      pos: { x: position.x + 0.5, y: position.y + 0.5 },
      hp: this.getMonsterBaseHp(),
      marker,
      scale: this.getMonsterScale()
    };
    marker.setScale(monster.scale);
    this.monsters.push(monster);
    this.redrawMonster(monster);
    this.checkMonsterContact();
  }

  private redrawMonster(monster: Monster): void {
    const px = this.boardX + monster.pos.x * this.cellSize;
    const py = this.gridY + monster.pos.y * this.cellSize;
    monster.marker.setPosition(px, py);
  }

  private resolveMovementForEntity(origin: Position, dx: number, dy: number, radius: number): Position {
    const totalDistance = Math.hypot(dx, dy);
    if (totalDistance === 0) {
      return origin;
    }

    const sweepSteps = Math.max(1, Math.ceil(totalDistance / MOVE_SWEEP_STEP_CELLS));
    const stepX = dx / sweepSteps;
    const stepY = dy / sweepSteps;
    let nextX = origin.x;
    let nextY = origin.y;

    for (let i = 0; i < sweepSteps; i += 1) {
      const candidateX = nextX + stepX;
      if (!this.collidesAt(candidateX, nextY, radius)) {
        nextX = this.clampAxis(candidateX, this.gridWidth, radius);
      }

      const candidateY = nextY + stepY;
      if (!this.collidesAt(nextX, candidateY, radius)) {
        nextY = this.clampAxis(candidateY, this.gridHeight, radius);
      }
    }

    return { x: nextX, y: nextY };
  }

  private checkMonsterContact(): void {
    if (this.gameEnded) {
      return;
    }

    const now = this.time.now;
    if (now - this.lastMonsterHitAt < PLAYER_MONSTER_HIT_COOLDOWN_MS) {
      return;
    }

    const touchedMonster = this.monsters.find(
      (monster) =>
        Phaser.Math.Distance.Between(this.playerPos.x, this.playerPos.y, monster.pos.x, monster.pos.y) <= this.getMonsterContactRadius(monster)
    );

    if (touchedMonster) {
      this.lastMonsterHitAt = now;
      this.playerHp = Math.max(0, this.playerHp - 1);
      this.applyPlayerKnockback(touchedMonster);
      this.redrawPlayer();
      if (this.playerHp <= 0) {
        this.setEndState(false);
        return;
      }
      this.refreshUi();
    }
  }

  private applyPlayerKnockback(monster: Monster): void {
    const fromMonsterX = this.playerPos.x - monster.pos.x;
    const fromMonsterY = this.playerPos.y - monster.pos.y;
    const distance = Math.hypot(fromMonsterX, fromMonsterY) || 1;
    const knockbackX = (fromMonsterX / distance) * PLAYER_HIT_KNOCKBACK_CELLS;
    const knockbackY = (fromMonsterY / distance) * PLAYER_HIT_KNOCKBACK_CELLS;
    this.playerPos = this.resolveMovementForEntity(this.playerPos, knockbackX, knockbackY, PLAYER_COLLISION_RADIUS_CELLS);
  }

  private refreshUi(): void {
    this.hpText.setText(`HP: ${this.playerHp}`);
    this.stageText.setText(`STAGE ${this.stageNumber}`);

    if (this.gameEnded) {
      this.statusText.setText(this.gameWon ? 'CLEAR' : 'GAME OVER');
      this.restartCtaText.setText('↺でもう一度あそぶ');
      return;
    }

    this.restartCtaText.setText('');
    this.statusText.setText(
      this.currentAttackTarget
        ? `狙い ${this.currentAttackTarget.position.x + 1},${this.currentAttackTarget.position.y + 1}${this.currentAttackTarget.kind === 'monster' ? ' 敵' : ''}`
        : `向き ${this.formatDirection(this.playerFacing)}`
    );
  }

  private getMoveVector(): { dx: number; dy: number } {
    return { ...this.movePadVector };
  }

  private updateFacingFromVector(dx: number, dy: number): void {
    if (dx === 0 && dy === 0) {
      return;
    }

    this.setFacingFromInput(dx, dy, this.directionFromVector(dx, dy));
  }

  private setFacingFromInput(dx: number, dy: number, fallbackDirection: Direction): void {
    if (dx === 0 && dy === 0) {
      return;
    }

    this.playerFacing = fallbackDirection;
    const angle = Phaser.Math.RadToDeg(Math.atan2(dy, dx)) + 90;
    this.playerFacingAngle = Math.round(angle / 5) * 5;
  }

  private getFacingUnitVector(): Position {
    const radians = Phaser.Math.DegToRad(this.playerFacingAngle - 90);
    return {
      x: Math.cos(radians),
      y: Math.sin(radians)
    };
  }

  private getMonsterSpeed(): number {
    return MONSTER_SPEED_CELLS_PER_SECOND * Math.pow(1.03, this.stageNumber - 1);
  }

  private getMonsterBaseHp(): number {
    return MONSTER_HP + Math.floor((this.stageNumber - 1) / 5);
  }

  private getMonsterScale(): number {
    return 1 + Math.floor((this.stageNumber - 1) / 10) * 0.1;
  }

  private getMonsterCollisionRadius(monster: Monster): number {
    return MONSTER_COLLISION_RADIUS_CELLS * monster.scale;
  }

  private getMonsterContactRadius(monster: Monster): number {
    return PLAYER_MONSTER_CONTACT_RADIUS_CELLS + (monster.scale - 1) * 0.08;
  }

  private collidesAt(x: number, y: number, radius: number): boolean {
    const minX = Math.floor(x - radius);
    const maxX = Math.floor(x + radius);
    const minY = Math.floor(y - radius);
    const maxY = Math.floor(y + radius);

    for (let tileY = minY; tileY <= maxY; tileY += 1) {
      for (let tileX = minX; tileX <= maxX; tileX += 1) {
        if (!this.inRange(tileX, tileY)) {
          return true;
        }
        if (this.grid[tileY][tileX].isOpen) {
          continue;
        }

        const closestX = Phaser.Math.Clamp(x, tileX, tileX + 1);
        const closestY = Phaser.Math.Clamp(y, tileY, tileY + 1);
        const distance = Phaser.Math.Distance.Between(x, y, closestX, closestY);
        if (distance < radius) {
          return true;
        }
      }
    }

    return false;
  }

  private getPlayerCell(): Position {
    return {
      x: Phaser.Math.Clamp(Math.floor(this.playerPos.x), 0, this.gridWidth - 1),
      y: Phaser.Math.Clamp(Math.floor(this.playerPos.y), 0, this.gridHeight - 1)
    };
  }

  private refreshAttackTargetHighlight(): void {
    if (!this.attackTargetHighlight) {
      return;
    }

    if (this.gameEnded) {
      this.currentAttackTarget = null;
      this.attackTargetHighlight.setVisible(false);
      return;
    }

    const target = this.findAttackTarget();
    this.currentAttackTarget = target;

    if (!target) {
      this.attackTargetHighlight.setVisible(false);
      return;
    }

    this.attackTargetHighlight
      .setPosition(this.boardX + target.position.x * this.cellSize + 1, this.gridY + target.position.y * this.cellSize + 1)
      .setVisible(true);
  }

  private inRange(x: number, y: number): boolean {
    return x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight;
  }
}
