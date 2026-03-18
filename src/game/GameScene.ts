import Phaser from 'phaser';
import { BOARD_CONFIG, DEFAULT_BOARD_DIFFICULTY } from './boardConfig';
import {
  BOARD_DIVIDER_STYLE,
  GAME_OVERLAY_STYLE,
  HELP_MODAL_COPY,
  INPUT_HIT_PADDING_PX,
  INPUT_REPEAT_INTERVAL_MS,
  INITIAL_PLAYER_HP,
  PLAYER_MARKER_STYLE
} from './constants';
import { addDirectionOffset, DIRECTION, type Direction, type Position } from './direction';
import { generateBoard } from './boardGenerator';
import { GOAL_STATE, TILE_KIND, type Tile } from './types';

const ACTIVE_BOARD_CONFIG = BOARD_CONFIG[DEFAULT_BOARD_DIFFICULTY];
const MIN_CELL_SIZE = 24;
const BOARD_FRAME_PADDING = 10;

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
  [DIRECTION.DOWN]: '↓',
  [DIRECTION.LEFT]: '←',
  [DIRECTION.RIGHT]: '→'
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
  private activeInputOwnership: Partial<Record<'move' | 'attack', { pointerId: number; stop: () => void }>> = {};
  private moveButtonRefs: Array<{ box: Phaser.GameObjects.Rectangle; x: number; y: number; w: number; h: number }> = [];

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

    this.makeRepeatingButton(
      centerX,
      top,
      dpadSize,
      dpadSize,
      '↑',
      () => this.onMoveInput(DIRECTION.UP),
      0x2a385a,
      0x3a4d73,
      '#f1f7ff',
      16,
      INPUT_REPEAT_INTERVAL_MS,
      'move'
    );
    this.makeRepeatingButton(
      centerX,
      top + (dpadSize + dpadGap) * 2,
      dpadSize,
      dpadSize,
      '↓',
      () => this.onMoveInput(DIRECTION.DOWN),
      0x2a385a,
      0x3a4d73,
      '#f1f7ff',
      16,
      INPUT_REPEAT_INTERVAL_MS,
      'move'
    );
    this.makeRepeatingButton(
      left,
      centerY,
      dpadSize,
      dpadSize,
      '←',
      () => this.onMoveInput(DIRECTION.LEFT),
      0x2a385a,
      0x3a4d73,
      '#f1f7ff',
      16,
      INPUT_REPEAT_INTERVAL_MS,
      'move'
    );
    this.makeRepeatingButton(
      left + (dpadSize + dpadGap) * 2,
      centerY,
      dpadSize,
      dpadSize,
      '→',
      () => this.onMoveInput(DIRECTION.RIGHT),
      0x2a385a,
      0x3a4d73,
      '#f1f7ff',
      16,
      INPUT_REPEAT_INTERVAL_MS,
      'move'
    );

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
    inputChannel: 'move' | 'attack'
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

    const canTrigger = () => (inputChannel === 'move' ? this.moveInputEnabled : this.attackInputEnabled);
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

    if (inputChannel === 'move') {
      box.on('pointerover', (pointer: Phaser.Input.Pointer) => {
        if (!pointer.isDown) {
          return;
        }

        const currentOwner = this.activeInputOwnership.move;
        if (currentOwner?.pointerId === pointer.id) {
          startRepeat(pointer);
        }
      });
    }

    box.on('pointerup', (pointer: Phaser.Input.Pointer) => stopRepeat(pointer.id));
    box.on('pointerupoutside', (pointer: Phaser.Input.Pointer) => stopRepeat(pointer.id));
    box.on('pointerout', (pointer: Phaser.Input.Pointer) => {
      if (inputChannel === 'move' && pointer.isDown && this.activeInputOwnership.move?.pointerId === pointer.id) {
        return;
      }
      stopRepeat(pointer.id);
    });

    if (inputChannel === 'move') {
      this.moveButtonRefs.push({ box, x, y, w, h });
    }

    return c;
  }

  private handleMoveSlide(pointer: Phaser.Input.Pointer): void {
    if (!pointer.isDown) {
      return;
    }

    const owner = this.activeInputOwnership.move;
    if (!owner || owner.pointerId !== pointer.id) {
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

    hoveredButton?.box.emit('pointerover', pointer);
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

  private onMoveInput(direction: Direction): void {
    if (this.gameEnded) return;
    this.playerFacing = direction;

    const nextPos = addDirectionOffset(this.playerPos, direction);
    if (this.isPassable(nextPos.x, nextPos.y)) {
      this.playerPos = nextPos;
      this.checkGoalReached();
    }

    this.redrawPlayer();
    this.refreshUi();
  }

  private tryAttackForward(): void {
    if (this.gameEnded) return;

    const target = addDirectionOffset(this.playerPos, this.playerFacing);
    if (!this.inRange(target.x, target.y)) return;

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
    const tile = this.grid[this.playerPos.y][this.playerPos.x];
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
  }

  private lockInputs(): void {
    this.moveInputEnabled = false;
    this.attackInputEnabled = false;
    this.activeInputOwnership.move?.stop();
    this.activeInputOwnership.attack?.stop();
    this.activeInputOwnership = {};
  }

  private unlockInputs(): void {
    this.moveInputEnabled = true;
    this.attackInputEnabled = true;
    this.activeInputOwnership.move?.stop();
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
    const px = this.boardX + this.playerPos.x * this.cellSize + this.cellSize / 2;
    const py = this.gridY + this.playerPos.y * this.cellSize + this.cellSize / 2;
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

  private isPassable(x: number, y: number): boolean {
    if (!this.inRange(x, y)) return false;
    return this.grid[y][x].isOpen;
  }

  private inRange(x: number, y: number): boolean {
    return x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight;
  }
}
