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
  INPUT_REPEAT_INTERVAL_MS,
  MOVE_SPEED_CELLS_PER_SECOND,
  PLAYER_COLLISION_RADIUS_CELLS,
  PLAYER_MARKER_STYLE
} from './constants';
import { DIRECTION, DIRECTION_OFFSET, type Direction, type Position } from './direction';
import { generateBoard } from './boardGenerator';
import { GOAL_STATE, TILE_KIND, type Tile } from './types';

const ACTIVE_BOARD_CONFIG = BOARD_CONFIG[DEFAULT_BOARD_DIFFICULTY];
const MIN_CELL_SIZE = 24;
const BOARD_FRAME_PADDING = 10;

type MoveDirection = Direction;

type MoveButtonRef = {
  box: Phaser.GameObjects.Rectangle;
  x: number;
  y: number;
  w: number;
  h: number;
  direction: MoveDirection;
  activate: (pointer: Phaser.Input.Pointer) => void;
  release: (pointerId?: number) => void;
};

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

const FACING_GLYPH: Record<Direction, string> = {
  [DIRECTION.UP]: '↑',
  [DIRECTION.UP_RIGHT]: '↗',
  [DIRECTION.RIGHT]: '→',
  [DIRECTION.DOWN_RIGHT]: '↘',
  [DIRECTION.DOWN]: '↓',
  [DIRECTION.DOWN_LEFT]: '↙',
  [DIRECTION.LEFT]: '←',
  [DIRECTION.UP_LEFT]: '↖'
};

export class GameScene extends Phaser.Scene {
  private grid: Tile[][] = [];
  private cellBg: Phaser.GameObjects.Rectangle[][] = [];
  private cellText: Phaser.GameObjects.Text[][] = [];

  private playerPos: Position = { x: 0, y: 0 };
  private playerFacing: Direction = DIRECTION.UP;
  private playerHp = INITIAL_PLAYER_HP;

  private gameEnded = false;
  private gameWon = false;

  private hpText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private helpModal!: Phaser.GameObjects.Container;
  private restartCtaText!: Phaser.GameObjects.Text;
  private endOverlay!: Phaser.GameObjects.Container;
  private endOverlayScrim!: Phaser.GameObjects.Rectangle;
  private endOverlayPanel!: Phaser.GameObjects.Rectangle;
  private endOverlayMessage!: Phaser.GameObjects.Text;
  private endOverlaySubText!: Phaser.GameObjects.Text;
  private moveInputEnabled = true;
  private attackInputEnabled = true;
  private activeInputOwnership: Partial<Record<'attack', { pointerId: number; stop: () => void }>> = {};
  private moveButtonRefs: MoveButtonRef[] = [];
  private activeMovePointers = new Map<number, MoveDirection>();

  private playerMarker!: Phaser.GameObjects.Text;

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
    this.input.on('pointermove', this.handleMoveSlide, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointermove', this.handleMoveSlide, this);
    });
    this.drawFrames();
    this.addTopUi();
    this.addBottomUi();
    this.addEndOverlay();
    this.newRun();

    this.scale.on('resize', () => {
      this.scene.restart();
    });
  }

  update(_time: number, delta: number): void {
    if (this.gameEnded || !this.moveInputEnabled) {
      return;
    }

    const movement = this.getMoveVector();
    if (movement.dx === 0 && movement.dy === 0) {
      return;
    }

    const step = MOVE_SPEED_CELLS_PER_SECOND * (delta / 1000);
    this.movePlayer(movement.dx * step, movement.dy * step);
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

    this.add
      .text(boardCenterX, this.bottomY + 8, '操作エリア', {
        color: BOARD_DIVIDER_STYLE.labelColor,
        fontSize: `${BOARD_DIVIDER_STYLE.labelFontSize}px`,
        fontStyle: 'bold'
      })
      .setOrigin(0.5, 0)
      .setDepth(2);
  }

  private addTopUi(): void {
    const left = Math.floor((this.scale.gameSize.width - this.panelWidth) / 2) + 10;
    const right = left + this.panelWidth - 20;

    this.hpText = this.add.text(left, this.safeTop + 18, '', {
      color: '#f0f6ff',
      fontSize: '16px',
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
    this.moveButtonRefs = [];
    const left = Math.floor((this.scale.gameSize.width - this.panelWidth) / 2) + 12;
    const top = this.bottomY + 10;
    const dpadGap = 6;
    const contentH = Math.max(110, this.bottomPanelH - 20);
    const dpadSize = Math.max(34, Math.min(48, Math.floor((contentH - dpadGap * 2) / 3)));

    const centerX = left + dpadSize + dpadGap;
    const centerY = top + dpadSize + dpadGap;

    this.makeMoveButton(centerX, top, dpadSize, dpadSize, '↑', DIRECTION.UP);
    this.makeMoveButton(centerX, top + (dpadSize + dpadGap) * 2, dpadSize, dpadSize, '↓', DIRECTION.DOWN);
    this.makeMoveButton(left, centerY, dpadSize, dpadSize, '←', DIRECTION.LEFT);
    this.makeMoveButton(left + (dpadSize + dpadGap) * 2, centerY, dpadSize, dpadSize, '→', DIRECTION.RIGHT);

    const attackX = left + (dpadSize + dpadGap) * 3 + 16;
    const attackW = Math.min(124, this.panelWidth - (attackX - left) - 12);
    const attackH = Math.min(72, contentH - 12);
    this.makeRepeatingButton(
      attackX,
      top + Math.floor((contentH - attackH) / 2),
      attackW,
      attackH,
      '叩く',
      () => this.tryAttackForward(),
      0x644022,
      0x815631,
      '#fff4df',
      20,
      INPUT_REPEAT_INTERVAL_MS,
      'attack'
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
      .text(centerX, centerY + 18, GAME_OVERLAY_STYLE.subText, {
        color: GAME_OVERLAY_STYLE.subTextColor,
        fontSize: '12px',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(17)
      .setVisible(false);

    this.endOverlay = this.add.container(0, 0, [this.endOverlayScrim, this.endOverlayPanel, this.endOverlayMessage, this.endOverlaySubText]).setDepth(15).setVisible(false);
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

  private makeMoveButton(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    direction: MoveDirection
  ): Phaser.GameObjects.Container {
    const idleColor = 0x2a385a;
    const activeColor = 0x3a4d73;
    const box = this.add
      .rectangle(0, 0, w, h, idleColor)
      .setOrigin(0)
      .setStrokeStyle(1, 0xc08b55, 0.95);
    const text = this.add
      .text(w / 2, h / 2, label, { color: '#f1f7ff', fontSize: '16px', fontStyle: 'bold' })
      .setOrigin(0.5);
    const c = this.add.container(x, y, [box, text]);
    const pointerIds = new Set<number>();

    const refreshVisual = () => {
      const active = pointerIds.size > 0 && this.moveInputEnabled;
      box.setFillStyle(active ? activeColor : idleColor);
      text.setY(h / 2 + (active ? 1 : 0));
    };

    const activate = (pointer: Phaser.Input.Pointer) => {
      if (!this.moveInputEnabled) {
        return;
      }
      const previousDirection = this.activeMovePointers.get(pointer.id);
      if (previousDirection && previousDirection !== direction) {
        this.releaseMovePointer(pointer.id, previousDirection);
      }
      this.activeMovePointers.set(pointer.id, direction);
      pointerIds.add(pointer.id);
      this.playerFacing = direction;
      refreshVisual();
      this.redrawPlayer();
      this.refreshUi();
    };

    const release = (pointerId?: number) => {
      if (pointerId === undefined) {
        pointerIds.forEach((id) => {
          if (this.activeMovePointers.get(id) === direction) {
            this.activeMovePointers.delete(id);
          }
        });
        pointerIds.clear();
      } else {
        pointerIds.delete(pointerId);
        if (this.activeMovePointers.get(pointerId) === direction) {
          this.activeMovePointers.delete(pointerId);
        }
      }
      refreshVisual();
    };

    box
      .setInteractive(
        new Phaser.Geom.Rectangle(-INPUT_HIT_PADDING_PX, -INPUT_HIT_PADDING_PX, w + INPUT_HIT_PADDING_PX * 2, h + INPUT_HIT_PADDING_PX * 2),
        Phaser.Geom.Rectangle.Contains
      )
      .on('pointerdown', (pointer: Phaser.Input.Pointer) => activate(pointer))
      .on('pointerover', (pointer: Phaser.Input.Pointer) => {
        if (pointer.isDown) {
          activate(pointer);
        }
      })
      .on('pointerup', (pointer: Phaser.Input.Pointer) => release(pointer.id))
      .on('pointerupoutside', (pointer: Phaser.Input.Pointer) => release(pointer.id))
      .on('pointerout', (pointer: Phaser.Input.Pointer) => {
        if (!pointer.isDown) {
          release(pointer.id);
        }
      });

    this.moveButtonRefs.push({ box, x, y, w, h, direction, activate, release });
    return c;
  }

  private makeRepeatingButton(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    onTrigger: () => void,
    idleColor: number,
    activeColor: number,
    textColor: string,
    fontSize: number,
    repeatIntervalMs: number,
    inputChannel: 'attack'
  ): Phaser.GameObjects.Container {
    const box = this.add
      .rectangle(0, 0, w, h, idleColor)
      .setOrigin(0)
      .setStrokeStyle(1, 0xc08b55, 0.95);
    const text = this.add
      .text(w / 2, h / 2, label, { color: textColor, fontSize: `${fontSize}px`, fontStyle: 'bold' })
      .setOrigin(0.5);
    const c = this.add.container(x, y, [box, text]);

    let repeatingEvent: Phaser.Time.TimerEvent | null = null;
    let activePointerId: number | null = null;

    const canTrigger = () => this.attackInputEnabled;
    const clearOwnership = () => {
      if (this.activeInputOwnership[inputChannel]?.stop === stopRepeat) {
        delete this.activeInputOwnership[inputChannel];
      }
    };

    const stopRepeat = (pointerId?: number) => {
      if (pointerId !== undefined && activePointerId !== pointerId) {
        return;
      }

      repeatingEvent?.remove(false);
      repeatingEvent = null;
      activePointerId = null;
      clearOwnership();
      box.setFillStyle(idleColor);
      text.setY(h / 2);
    };

    const startRepeat = (pointer: Phaser.Input.Pointer) => {
      if (!canTrigger()) {
        return;
      }

      const currentOwner = this.activeInputOwnership[inputChannel];
      if (currentOwner?.pointerId === pointer.id && repeatingEvent) {
        return;
      }

      currentOwner?.stop();

      activePointerId = pointer.id;
      this.activeInputOwnership[inputChannel] = {
        pointerId: pointer.id,
        stop: stopRepeat
      };
      box.setFillStyle(activeColor);
      text.setY(h / 2 + 1);
      onTrigger();
      repeatingEvent = this.time.addEvent({
        delay: repeatIntervalMs,
        loop: true,
        callback: () => {
          if (!canTrigger() || this.activeInputOwnership[inputChannel]?.stop !== stopRepeat) {
            stopRepeat();
            return;
          }
          onTrigger();
        }
      });
    };

    box
      .setInteractive(
        new Phaser.Geom.Rectangle(-INPUT_HIT_PADDING_PX, -INPUT_HIT_PADDING_PX, w + INPUT_HIT_PADDING_PX * 2, h + INPUT_HIT_PADDING_PX * 2),
        Phaser.Geom.Rectangle.Contains
      )
      .on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        startRepeat(pointer);
      });

    box.on('pointerup', (pointer: Phaser.Input.Pointer) => stopRepeat(pointer.id));
    box.on('pointerupoutside', (pointer: Phaser.Input.Pointer) => stopRepeat(pointer.id));
    box.on('pointerout', (pointer: Phaser.Input.Pointer) => stopRepeat(pointer.id));

    return c;
  }

  private handleMoveSlide(pointer: Phaser.Input.Pointer): void {
    if (!pointer.isDown || !this.moveInputEnabled) {
      return;
    }

    const hoveredButton = this.moveButtonRefs.find(({ x, y, w, h }) =>
      Phaser.Geom.Rectangle.Contains(
        new Phaser.Geom.Rectangle(
          x - INPUT_HIT_PADDING_PX,
          y - INPUT_HIT_PADDING_PX,
          w + INPUT_HIT_PADDING_PX * 2,
          h + INPUT_HIT_PADDING_PX * 2
        ),
        pointer.x,
        pointer.y
      )
    );

    if (hoveredButton) {
      hoveredButton.activate(pointer);
      return;
    }

    const direction = this.activeMovePointers.get(pointer.id);
    if (direction) {
      this.releaseMovePointer(pointer.id, direction);
    }
  }

  private newRun(): void {
    this.unlockInputs();
    this.gameEnded = false;
    this.gameWon = false;
    this.playerHp = INITIAL_PLAYER_HP;

    const generatedBoard = generateBoard({ width: this.gridWidth, height: this.gridHeight, mineCount: this.mineCount });
    this.grid = generatedBoard.grid;
    this.playerPos = { ...generatedBoard.start };
    this.playerFacing = DIRECTION.UP;

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

    this.playerMarker?.destroy();
    this.playerMarker = this.add
      .text(0, 0, '', {
        color: PLAYER_MARKER_STYLE.color,
        fontSize: `${this.cellSize >= 26 ? PLAYER_MARKER_STYLE.largeFontSize : PLAYER_MARKER_STYLE.smallFontSize}px`,
        fontStyle: 'bold'
      })
      .setStroke(
        PLAYER_MARKER_STYLE.strokeColor,
        this.cellSize >= 26 ? PLAYER_MARKER_STYLE.largeStroke : PLAYER_MARKER_STYLE.smallStroke
      )
      .setShadow(0, PLAYER_MARKER_STYLE.shadowOffsetY, PLAYER_MARKER_STYLE.shadowColor, PLAYER_MARKER_STYLE.shadowBlur, true, true)
      .setOrigin(0.5)
      .setDepth(10);

    this.redrawAll();
    this.refreshUi();
  }

  private movePlayer(dx: number, dy: number): void {
    this.updateFacingFromVector(dx, dy);

    let nextX = this.playerPos.x;
    let nextY = this.playerPos.y;

    if (dx !== 0) {
      const candidateX = this.playerPos.x + dx;
      if (!this.collidesAt(candidateX, this.playerPos.y)) {
        nextX = Phaser.Math.Clamp(candidateX, PLAYER_COLLISION_RADIUS_CELLS, this.gridWidth - 1 - PLAYER_COLLISION_RADIUS_CELLS);
      }
    }

    if (dy !== 0) {
      const candidateY = this.playerPos.y + dy;
      if (!this.collidesAt(nextX, candidateY)) {
        nextY = Phaser.Math.Clamp(candidateY, PLAYER_COLLISION_RADIUS_CELLS, this.gridHeight - 1 - PLAYER_COLLISION_RADIUS_CELLS);
      }
    }

    if (nextX !== this.playerPos.x || nextY !== this.playerPos.y) {
      this.playerPos = { x: nextX, y: nextY };
      this.checkGoalReached();
      this.redrawPlayer();
      this.refreshUi();
      return;
    }

    this.redrawPlayer();
    this.refreshUi();
  }

  private tryAttackForward(): void {
    if (this.gameEnded || !this.attackInputEnabled) return;

    const target = this.findAttackTarget();
    if (!target) return;

    const targetTile = this.grid[target.y][target.x];
    if (targetTile.isOpen) return;

    targetTile.isOpen = true;

    if (targetTile.goalState === GOAL_STATE.HIDDEN) {
      targetTile.goalState = GOAL_STATE.REVEALED;
      targetTile.tileKind = TILE_KIND.GOAL;
      this.redrawCell(target.x, target.y);
      this.refreshUi();
      return;
    }

    if (targetTile.hasMine) {
      this.playerHp -= 1;
      targetTile.tileKind = TILE_KIND.SCORCHED;
      this.redrawCell(target.x, target.y);

      if (this.playerHp <= 0) {
        this.setEndState(false);
      }
      this.refreshUi();
      return;
    }

    targetTile.tileKind = TILE_KIND.FLOOR;
    const openedPositions = this.expandOpenAreaFrom(target);
    this.redrawCells(openedPositions);
    this.refreshUi();
  }

  private findAttackTarget(): Position | null {
    const facingOffset = DIRECTION_OFFSET[this.playerFacing];
    const boxCenterX = this.playerPos.x + facingOffset.x * ATTACK_BOX_FORWARD_OFFSET_CELLS;
    const boxCenterY = this.playerPos.y + facingOffset.y * ATTACK_BOX_FORWARD_OFFSET_CELLS;
    const halfSize = ATTACK_BOX_SIZE_CELLS / 2;
    const candidates: Array<{ position: Position; distance: number }> = [];

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

        const tileMinX = x;
        const tileMaxX = x + 1;
        const tileMinY = y;
        const tileMaxY = y + 1;

        const intersects =
          tileMaxX >= boxCenterX - halfSize &&
          tileMinX <= boxCenterX + halfSize &&
          tileMaxY >= boxCenterY - halfSize &&
          tileMinY <= boxCenterY + halfSize;

        if (!intersects) {
          continue;
        }

        const distance = Phaser.Math.Distance.Between(this.playerPos.x, this.playerPos.y, x + 0.5, y + 0.5);
        candidates.push({ position: { x, y }, distance });
      }
    }

    candidates.sort((a, b) => a.distance - b.distance);
    return candidates[0]?.position ?? null;
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
    this.endOverlay.setVisible(true);
    this.endOverlayScrim.setVisible(true);
    this.endOverlayPanel.setVisible(true);
    this.endOverlayMessage.setVisible(true);
    this.endOverlaySubText.setVisible(true);
    this.refreshUi();
  }

  private lockInputs(): void {
    this.moveInputEnabled = false;
    this.attackInputEnabled = false;
    this.activeMovePointers.clear();
    this.moveButtonRefs.forEach((button) => button.release());
    this.activeInputOwnership.attack?.stop();
    this.activeInputOwnership = {};
  }

  private unlockInputs(): void {
    this.moveInputEnabled = true;
    this.attackInputEnabled = true;
    this.activeMovePointers.clear();
    this.moveButtonRefs.forEach((button) => button.release());
    this.activeInputOwnership.attack?.stop();
    this.activeInputOwnership = {};
    if (this.endOverlay) {
      this.endOverlay.setVisible(false);
      this.endOverlay.list.forEach((child) => {
        const visibleChild = child as Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text;
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

  private redrawPlayer(): void {
    const px = this.boardX + (this.playerPos.x + 0.5) * this.cellSize;
    const py = this.gridY + (this.playerPos.y + 0.5) * this.cellSize;
    this.playerMarker.setPosition(px, py);
    this.playerMarker.setText(FACING_GLYPH[this.playerFacing]);
  }

  private refreshUi(): void {
    this.hpText.setText(`HP: ${this.playerHp}`);

    if (this.gameEnded) {
      this.statusText.setText(this.gameWon ? 'CLEAR' : 'GAME OVER');
      this.restartCtaText.setText('↺でもう一度あそぶ');
      return;
    }

    this.restartCtaText.setText('');
    this.statusText.setText(`向き ${FACING_GLYPH[this.playerFacing]}`);
  }

  private getMoveVector(): { dx: number; dy: number } {
    let dx = 0;
    let dy = 0;

    this.activeMovePointers.forEach((direction) => {
      const offset = DIRECTION_OFFSET[direction];
      dx += offset.x;
      dy += offset.y;
    });

    dx = Phaser.Math.Clamp(dx, -1, 1);
    dy = Phaser.Math.Clamp(dy, -1, 1);

    if (dx !== 0 || dy !== 0) {
      const length = Math.hypot(dx, dy);
      dx /= length;
      dy /= length;
    }

    return { dx, dy };
  }

  private updateFacingFromVector(dx: number, dy: number): void {
    if (dx === 0 && dy === 0) {
      return;
    }

    const horizontal = dx > 0.2 ? 'RIGHT' : dx < -0.2 ? 'LEFT' : null;
    const vertical = dy > 0.2 ? 'DOWN' : dy < -0.2 ? 'UP' : null;

    if (horizontal && vertical) {
      this.playerFacing = DIRECTION[`${vertical}_${horizontal}` as keyof typeof DIRECTION];
      return;
    }

    if (horizontal) {
      this.playerFacing = DIRECTION[horizontal];
      return;
    }

    if (vertical) {
      this.playerFacing = DIRECTION[vertical];
    }
  }

  private collidesAt(x: number, y: number): boolean {
    const minX = Math.floor(x - PLAYER_COLLISION_RADIUS_CELLS);
    const maxX = Math.floor(x + PLAYER_COLLISION_RADIUS_CELLS);
    const minY = Math.floor(y - PLAYER_COLLISION_RADIUS_CELLS);
    const maxY = Math.floor(y + PLAYER_COLLISION_RADIUS_CELLS);

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
        if (distance < PLAYER_COLLISION_RADIUS_CELLS) {
          return true;
        }
      }
    }

    return false;
  }

  private getPlayerCell(): Position {
    return {
      x: Phaser.Math.Clamp(Math.floor(this.playerPos.x + 0.5), 0, this.gridWidth - 1),
      y: Phaser.Math.Clamp(Math.floor(this.playerPos.y + 0.5), 0, this.gridHeight - 1)
    };
  }

  private releaseMovePointer(pointerId: number, direction: MoveDirection): void {
    const button = this.moveButtonRefs.find((item) => item.direction === direction);
    button?.release(pointerId);
  }

  private inRange(x: number, y: number): boolean {
    return x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight;
  }
}
