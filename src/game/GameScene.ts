import Phaser from 'phaser';
import { BOARD_CONFIG, DEFAULT_BOARD_DIFFICULTY } from './boardConfig';
import { addDirectionOffset, DIRECTION, type Direction, type Position } from './direction';
import { generateBoard } from './boardGenerator';
import { GOAL_STATE, TILE_KIND, type Tile } from './types';

const ACTIVE_BOARD_CONFIG = BOARD_CONFIG[DEFAULT_BOARD_DIFFICULTY];
const GRID_W = ACTIVE_BOARD_CONFIG.width;
const GRID_H = ACTIVE_BOARD_CONFIG.height;
const MINE_COUNT = ACTIVE_BOARD_CONFIG.mineCount;

const ATTACK_REPEAT_INTERVAL_MS = 250;
const CELL_WIDTH_RATIO = 1.12;
const CELL_HEIGHT_RATIO = 0.98;
const PLAYER_MARKER_COLOR = '#ffe36a';
const PLAYER_MARKER_OUTLINE_COLOR = '#121a2b';

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
  private playerHp = 3;

  private gameEnded = false;
  private gameWon = false;

  private hpText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private helpModal!: Phaser.GameObjects.Container;

  private playerMarker!: Phaser.GameObjects.Text;

  private boardX = 0;
  private boardY = 0;
  private cellSize = 32;
  private cellWidth = 32;
  private cellHeight = 32;
  private bottomY = 0;
  private panelWidth = 0;
  private topPanelH = 0;
  private bottomPanelH = 0;
  private safeTop = 0;
  private safeBottom = 0;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#060d1b');
    this.computeLayout();
    this.drawFrames();
    this.addTopUi();
    this.addBottomUi();
    this.newRun();

    this.scale.on('resize', () => {
      this.scene.restart();
    });
  }

  private computeLayout(): void {
    const w = this.scale.gameSize.width;
    const h = this.scale.gameSize.height;
    const horizontalPadding = 8;
    const gap = 6;

    const rootStyle = getComputedStyle(document.documentElement);
    const safeTop = Number.parseInt(rootStyle.getPropertyValue('--safe-top'), 10);
    const safeBottom = Number.parseInt(rootStyle.getPropertyValue('--safe-bottom'), 10);
    this.safeTop = Number.isFinite(safeTop) ? safeTop : 0;
    this.safeBottom = Number.isFinite(safeBottom) ? safeBottom : 0;

    this.topPanelH = 54;
    this.bottomPanelH = 170;

    const maxBoardW = w - horizontalPadding * 2 - 10;
    const maxBoardH = h - this.safeTop - this.safeBottom - this.topPanelH - this.bottomPanelH - gap * 4;
    this.cellSize = Math.max(18, Math.floor(Math.min(maxBoardW / (GRID_W * CELL_WIDTH_RATIO), maxBoardH / (GRID_H * CELL_HEIGHT_RATIO))));
    this.cellWidth = Math.floor(this.cellSize * CELL_WIDTH_RATIO);
    this.cellHeight = Math.floor(this.cellSize * CELL_HEIGHT_RATIO);

    const boardWidth = this.cellWidth * GRID_W;
    const boardHeight = this.cellHeight * GRID_H;

    this.boardX = Math.floor((w - boardWidth) / 2);
    this.boardY = this.safeTop + this.topPanelH + gap;
    this.bottomY = this.boardY + boardHeight + gap;
    this.panelWidth = Math.min(w - horizontalPadding * 2, boardWidth + 10);
  }

  private drawFrames(): void {
    const w = this.scale.gameSize.width;

    this.add
      .rectangle(w / 2, this.safeTop + this.topPanelH / 2, this.panelWidth, this.topPanelH - 4, 0x081126)
      .setStrokeStyle(1, 0x28406d, 0.95);

    this.add
      .rectangle(
        w / 2,
        this.boardY + (GRID_H * this.cellHeight) / 2,
        GRID_W * this.cellWidth + 10,
        GRID_H * this.cellHeight + 10,
        0x0a1324
      )
      .setStrokeStyle(2, 0x476998, 0.95);

    this.add
      .rectangle(w / 2, this.bottomY + this.bottomPanelH / 2, this.panelWidth, this.bottomPanelH - 4, 0x081126)
      .setStrokeStyle(1, 0x28406d, 0.95);
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
    const left = Math.floor((this.scale.gameSize.width - this.panelWidth) / 2) + 12;
    const dpadSize = 44;
    const gap = 5;
    const controlHeight = dpadSize * 3 + gap * 2;
    const top = this.bottomY + this.bottomPanelH - controlHeight - 8;

    const centerX = left + dpadSize + gap;
    const centerY = top + dpadSize + gap;

    this.makeButton(centerX, top, dpadSize, dpadSize, '↑', () => this.onMoveInput(DIRECTION.UP));
    this.makeButton(centerX, top + (dpadSize + gap) * 2, dpadSize, dpadSize, '↓', () => this.onMoveInput(DIRECTION.DOWN));
    this.makeButton(left, centerY, dpadSize, dpadSize, '←', () => this.onMoveInput(DIRECTION.LEFT));
    this.makeButton(left + (dpadSize + gap) * 2, centerY, dpadSize, dpadSize, '→', () => this.onMoveInput(DIRECTION.RIGHT));

    const attackX = left + (dpadSize + gap) * 3 + 16;
    const attackW = Math.min(120, this.panelWidth - (attackX - left) - 12);
    this.makeRepeatingButton(attackX, top + 16, attackW, 68, '叩く', () => this.tryAttackForward());
  }

  private createHelpModal(): Phaser.GameObjects.Container {
    const w = this.scale.gameSize.width;
    const h = this.scale.gameSize.height;
    const modalW = Math.min(this.panelWidth, w - 20);
    const modalH = Math.min(300, h - this.safeTop - this.safeBottom - 32);
    const left = (w - modalW) / 2;
    const top = (h - modalH) / 2;

    const scrim = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.64).setInteractive();
    const panel = this.add.rectangle(left, top, modalW, modalH, 0x0b1830).setOrigin(0).setStrokeStyle(1, 0x6a8ec8, 0.95);
    const title = this.add.text(left + 12, top + 10, '遊び方', {
      color: '#f3f7ff',
      fontSize: '14px',
      fontStyle: 'bold'
    });
    const body = this.add.text(
      left + 12,
      top + 38,
      '・十字キーで移動\n・移動できなくても向きは変わる\n・叩くで正面の壁を壊す\n・数字は周囲8マスの地雷数\n・地雷を叩くとHPが減る\n・焼け跡マスは通れる\n・ゴールは開くまで見えない',
      {
        color: '#d7e6ff',
        fontSize: '12px',
        lineSpacing: 4,
        wordWrap: { width: modalW - 24 }
      }
    );
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
    onTrigger: () => void
  ): Phaser.GameObjects.Container {
    const box = this.add
      .rectangle(0, 0, w, h, 0x644022)
      .setOrigin(0)
      .setStrokeStyle(1, 0xc08b55, 0.95);
    const text = this.add
      .text(w / 2, h / 2, label, { color: '#fff4df', fontSize: '20px', fontStyle: 'bold' })
      .setOrigin(0.5);
    const c = this.add.container(x, y, [box, text]);

    let repeatingEvent: Phaser.Time.TimerEvent | null = null;
    const stopRepeat = () => {
      repeatingEvent?.remove(false);
      repeatingEvent = null;
      box.setFillStyle(0x644022);
    };

    box.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      box.setFillStyle(0x815631);
      onTrigger();
      repeatingEvent = this.time.addEvent({
        delay: ATTACK_REPEAT_INTERVAL_MS,
        loop: true,
        callback: onTrigger
      });
    });

    box.on('pointerup', stopRepeat);
    box.on('pointerout', stopRepeat);

    return c;
  }

  private newRun(): void {
    this.gameEnded = false;
    this.gameWon = false;
    this.playerHp = 3;

    const generatedBoard = generateBoard({ width: GRID_W, height: GRID_H, mineCount: MINE_COUNT });
    this.grid = generatedBoard.grid;
    this.playerPos = { ...generatedBoard.start };
    this.playerFacing = DIRECTION.UP;

    this.cellBg.flat().forEach((r) => r.destroy());
    this.cellText.flat().forEach((t) => t.destroy());
    this.cellBg = [];
    this.cellText = [];

    for (let y = 0; y < GRID_H; y += 1) {
      this.cellBg[y] = [];
      this.cellText[y] = [];
      for (let x = 0; x < GRID_W; x += 1) {
        const px = this.boardX + x * this.cellWidth;
        const py = this.boardY + y * this.cellHeight;
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
        color: PLAYER_MARKER_COLOR,
        stroke: PLAYER_MARKER_OUTLINE_COLOR,
        strokeThickness: 4,
        fontSize: Math.min(this.cellWidth, this.cellHeight) >= 26 ? '18px' : '14px',
        fontStyle: 'bold'
      })
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
        this.gameEnded = true;
        this.gameWon = false;
      }
      this.refreshUi();
      return;
    }

    targetTile.tileKind = TILE_KIND.FLOOR;
    this.redrawCell(target.x, target.y);
    this.refreshUi();
  }

  private checkGoalReached(): void {
    const tile = this.grid[this.playerPos.y][this.playerPos.x];
    if (tile.goalState === GOAL_STATE.REVEALED) {
      this.gameEnded = true;
      this.gameWon = true;
    }
  }

  private redrawAll(): void {
    for (let y = 0; y < GRID_H; y += 1) {
      for (let x = 0; x < GRID_W; x += 1) {
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
    const px = this.boardX + this.playerPos.x * this.cellWidth + this.cellWidth / 2;
    const py = this.boardY + this.playerPos.y * this.cellHeight + this.cellHeight / 2;
    this.playerMarker.setPosition(px, py);
    this.playerMarker.setText(FACING_GLYPH[this.playerFacing]);
  }

  private refreshUi(): void {
    this.hpText.setText(`HP: ${this.playerHp}`);

    if (this.gameEnded) {
      this.statusText.setText(this.gameWon ? 'CLEAR' : 'GAME OVER');
      return;
    }

    this.statusText.setText(`向き ${FACING_GLYPH[this.playerFacing]}`);
  }

  private isPassable(x: number, y: number): boolean {
    if (!this.inRange(x, y)) return false;
    return this.grid[y][x].isOpen;
  }

  private inRange(x: number, y: number): boolean {
    return x >= 0 && x < GRID_W && y >= 0 && y < GRID_H;
  }
}
