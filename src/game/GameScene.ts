import Phaser from 'phaser';

type CellKind = 'safe' | 'mine';

interface Cell {
  hidden: boolean;
  flagged: boolean;
  revealed: boolean;
  kind: CellKind;
  adjacentMines: number;
}

const GRID_W = 10;
const GRID_H = 14;
const MINE_COUNT = 24;
const LONG_PRESS_MS = 420;
const TAP_MOVE_TOLERANCE = 14;

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

const CELL_SYMBOL: Record<Exclude<CellKind, 'safe'>, string> = { mine: '✹' };

export class GameScene extends Phaser.Scene {
  private grid: Cell[][] = [];
  private cellBg: Phaser.GameObjects.Rectangle[][] = [];
  private cellText: Phaser.GameObjects.Text[][] = [];

  private gameEnded = false;
  private flagMode = false;
  private gameWon = false;
  private firstRevealDone = false;
  private elapsedSeconds = 0;
  private openedSafeCells = 0;
  private timerEvent: Phaser.Time.TimerEvent | null = null;

  private minesText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private flagModeText!: Phaser.GameObjects.Text;
  private helpModal!: Phaser.GameObjects.Container;

  private boardX = 0;
  private boardY = 0;
  private cellSize = 32;
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

    this.topPanelH = 58;
    this.bottomPanelH = 52;

    const maxBoardW = w - horizontalPadding * 2 - 10;
    const maxBoardH = h - this.safeTop - this.safeBottom - this.topPanelH - this.bottomPanelH - gap * 4;
    this.cellSize = Math.max(20, Math.floor(Math.min(maxBoardW / GRID_W, maxBoardH / GRID_H)));

    const boardWidth = this.cellSize * GRID_W;
    const boardHeight = this.cellSize * GRID_H;

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
        this.boardY + (GRID_H * this.cellSize) / 2,
        GRID_W * this.cellSize + 10,
        GRID_H * this.cellSize + 10,
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

    this.minesText = this.add.text(left, this.safeTop + 18, '', {
      color: '#f0f6ff',
      fontSize: '15px',
      fontStyle: 'bold'
    });

    this.timerText = this.add
      .text(right, this.safeTop + 18, '', {
        color: '#f0f6ff',
        fontSize: '15px',
        fontStyle: 'bold'
      })
      .setOrigin(1, 0);
  }

  private addBottomUi(): void {
    const left = Math.floor((this.scale.gameSize.width - this.panelWidth) / 2) + 10;
    const buttonGap = 6;
    const buttonWidth = Math.floor((this.panelWidth - 20 - buttonGap * 2) / 3);
    const controlY = this.bottomY + 10;

    const flagBtn = this.makeButton(left, controlY, buttonWidth, 32, '', () => {
      this.flagMode = !this.flagMode;
      this.refreshUi();
    });
    this.flagModeText = flagBtn.list[1] as Phaser.GameObjects.Text;

    const restartBtn = this.makeButton(left + buttonWidth + buttonGap, controlY, buttonWidth, 32, 'リスタート', () => {
      this.newRun();
    });

    const helpBtn = this.makeButton(left + (buttonWidth + buttonGap) * 2, controlY, buttonWidth, 32, '?', () => {
      this.helpModal.setVisible(true);
    });

    this.helpModal = this.createHelpModal();

    [flagBtn, restartBtn, helpBtn].forEach((btn) => btn.setDepth(5));
  }

  private createHelpModal(): Phaser.GameObjects.Container {
    const w = this.scale.gameSize.width;
    const h = this.scale.gameSize.height;
    const modalW = Math.min(this.panelWidth, w - 20);
    const modalH = Math.min(270, h - this.safeTop - this.safeBottom - 32);
    const left = (w - modalW) / 2;
    const top = (h - modalH) / 2;

    const scrim = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.64).setInteractive();
    const panel = this.add.rectangle(left, top, modalW, modalH, 0x0b1830).setOrigin(0).setStrokeStyle(1, 0x6a8ec8, 0.95);
    const title = this.add.text(left + 12, top + 10, '遊び方', {
      color: '#f3f7ff',
      fontSize: '14px',
      fontStyle: 'bold'
    });
    const body = this.add.text(left + 12, top + 38, '【基本操作】\n・タップ: マスを開く\n・数字以外をすべて開くとクリア\n\n【flag mode】\n・ON中のタップは旗のON/OFF\n・長押しでも旗を立てられる\n\n【chord】\n・数字マスをタップ\n・周囲の旗数=数字 のとき周囲を同時に開く', {
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
      .text(w / 2, h / 2, label, { color: '#f1f7ff', fontSize: '13px', fontStyle: 'bold' })
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

  private newRun(): void {
    this.gameEnded = false;
    this.gameWon = false;
    this.flagMode = false;
    this.firstRevealDone = false;
    this.elapsedSeconds = 0;
    this.openedSafeCells = 0;
    this.timerEvent?.remove(false);
    this.timerEvent = null;

    this.grid = this.buildGrid();
    this.computeAdjacency();

    this.cellBg.flat().forEach((r) => r.destroy());
    this.cellText.flat().forEach((t) => t.destroy());
    this.cellBg = [];
    this.cellText = [];

    for (let y = 0; y < GRID_H; y += 1) {
      this.cellBg[y] = [];
      this.cellText[y] = [];
      for (let x = 0; x < GRID_W; x += 1) {
        const px = this.boardX + x * this.cellSize;
        const py = this.boardY + y * this.cellSize;
        const rect = this.add
          .rectangle(px, py, this.cellSize - 2, this.cellSize - 2, 0x4a556f)
          .setOrigin(0)
          .setStrokeStyle(1, 0x2a3447, 0.95);
        const txt = this.add
          .text(px + this.cellSize / 2, py + this.cellSize / 2, '', {
            color: '#f3f5ff',
            fontSize: this.cellSize >= 30 ? '19px' : '16px',
            fontStyle: 'bold'
          })
          .setOrigin(0.5);

        const zone = this.add.zone(px, py, this.cellSize - 2, this.cellSize - 2).setOrigin(0);
        this.bindCellPointer(zone, x, y);

        this.cellBg[y][x] = rect;
        this.cellText[y][x] = txt;
      }
    }

    this.refreshUi();
    this.redrawAll();
  }

  private bindCellPointer(zone: Phaser.GameObjects.Zone, x: number, y: number): void {
    zone.setInteractive();
    let downAt = 0;
    let downX = 0;
    let downY = 0;
    let longPressed = false;
    let pressTimer: Phaser.Time.TimerEvent | null = null;

    zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      downAt = this.time.now;
      downX = pointer.x;
      downY = pointer.y;
      longPressed = false;

      pressTimer?.remove(false);
      pressTimer = this.time.delayedCall(LONG_PRESS_MS, () => {
        if (this.gameEnded) return;
        if (!pointer.isDown) return;
        const moved = Phaser.Math.Distance.Between(pointer.x, pointer.y, downX, downY);
        if (moved > TAP_MOVE_TOLERANCE) return;
        longPressed = true;
        this.toggleFlag(x, y);
      });
    });

    zone.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.gameEnded) return;
      pressTimer?.remove(false);
      pressTimer = null;

      const moved = Phaser.Math.Distance.Between(pointer.x, pointer.y, downX, downY);
      if (moved > TAP_MOVE_TOLERANCE) return;

      const held = this.time.now - downAt;
      if (longPressed || held >= LONG_PRESS_MS) return;
      this.onCellTap(x, y);
    });

    zone.on('pointerout', () => {
      pressTimer?.remove(false);
      pressTimer = null;
    });
  }

  private onCellTap(x: number, y: number): void {
    if (this.gameEnded) return;
    const target = this.grid[y][x];

    if (target.revealed) {
      this.tryChord(x, y);
      return;
    }

    if (this.flagMode) {
      this.toggleFlag(x, y);
      return;
    }

    this.revealAction(x, y);
  }

  private tryChord(x: number, y: number): void {
    const cell = this.grid[y][x];
    if (!cell.revealed || cell.adjacentMines <= 0) return;

    const around = this.neighbors(x, y);
    const flagCount = around.filter(([nx, ny]) => this.grid[ny][nx].flagged).length;
    if (flagCount !== cell.adjacentMines) return;

    let opened = 0;
    for (const [nx, ny] of around) {
      const n = this.grid[ny][nx];
      if (n.hidden && !n.flagged) {
        opened += this.revealCell(nx, ny);
      }
    }

    if (opened === 0) return;
    this.refreshUi();
    for (const [nx, ny] of around) {
      this.redrawCell(nx, ny);
    }
    this.checkEndState();
  }

  private buildGrid(): Cell[][] {
    const grid: Cell[][] = [];
    for (let y = 0; y < GRID_H; y += 1) {
      grid[y] = [];
      for (let x = 0; x < GRID_W; x += 1) {
        grid[y][x] = {
          hidden: true,
          flagged: false,
          revealed: false,
          kind: 'safe',
          adjacentMines: 0
        };
      }
    }

    const minePositions = new Set<number>();
    while (minePositions.size < MINE_COUNT) {
      minePositions.add(Phaser.Math.Between(0, GRID_W * GRID_H - 1));
    }

    for (const idx of minePositions) {
      const x = idx % GRID_W;
      const y = Math.floor(idx / GRID_W);
      grid[y][x].kind = 'mine';
    }

    return grid;
  }

  private computeAdjacency(): void {
    for (let y = 0; y < GRID_H; y += 1) {
      for (let x = 0; x < GRID_W; x += 1) {
        const c = this.grid[y][x];
        c.adjacentMines = this.neighbors(x, y).filter(([nx, ny]) => this.grid[ny][nx].kind === 'mine').length;
      }
    }
  }

  private toggleFlag(x: number, y: number): void {
    const cell = this.grid[y][x];
    if (!cell.hidden || cell.revealed) return;
    cell.flagged = !cell.flagged;
    this.redrawCell(x, y);
    this.refreshUi();
  }

  private revealAction(x: number, y: number): void {
    const target = this.grid[y][x];
    if (!target.hidden || target.flagged) return;

    if (!this.firstRevealDone) {
      this.ensureFirstRevealIsSafe(x, y);
      this.startTimer();
      this.firstRevealDone = true;
    }

    this.revealCell(x, y);

    this.refreshUi();
    this.checkEndState();
  }

  private revealCell(x: number, y: number, forceSafe = false): number {
    if (this.gameEnded && !forceSafe) return 0;
    const cell = this.grid[y][x];
    if (!cell.hidden || cell.flagged) return 0;

    cell.hidden = false;
    cell.revealed = true;

    if (forceSafe) {
      cell.kind = 'safe';
    }

    if (cell.kind === 'mine') {
      this.gameEnded = true;
      this.gameWon = false;
      this.revealAllMines();
      this.redrawCell(x, y);
      return 1;
    }

    if (cell.kind === 'safe') {
      this.openedSafeCells += 1;
      if (cell.adjacentMines === 0) {
        this.expandZeroes(x, y);
      }
    }

    this.redrawCell(x, y);
    return 1;
  }

  private expandZeroes(startX: number, startY: number): void {
    const queue: Array<[number, number]> = [[startX, startY]];
    const seen = new Set<string>();

    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      const key = `${x},${y}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const cell = this.grid[y][x];
      if (cell.kind !== 'safe' || cell.adjacentMines !== 0) continue;

      for (const [nx, ny] of this.neighbors(x, y)) {
        const n = this.grid[ny][nx];
        if (n.hidden && !n.flagged && n.kind !== 'mine') {
          n.hidden = false;
          n.revealed = true;
          if (n.kind === 'safe') {
            this.openedSafeCells += 1;
          }
          if (n.kind === 'safe' && n.adjacentMines === 0) {
            queue.push([nx, ny]);
          }
          this.redrawCell(nx, ny);
        }
      }
    }
  }

  private checkEndState(): void {
    if (this.gameEnded) {
      this.timerEvent?.remove(false);
      this.timerEvent = null;
      return;
    }

    const totalSafeCells = GRID_W * GRID_H - MINE_COUNT;
    if (this.openedSafeCells >= totalSafeCells) {
      this.gameEnded = true;
      this.gameWon = true;
      this.timerEvent?.remove(false);
      this.timerEvent = null;
    }
  }

  private refreshUi(): void {
    const flaggedCount = this.grid.flat().filter((cell) => cell.flagged).length;
    const remainingMines = MINE_COUNT - flaggedCount;
    this.minesText.setText(`🚩 ${Math.max(remainingMines, 0)}`);
    this.timerText.setText(`⏱ ${this.formatTime(this.elapsedSeconds)}`);
    this.flagModeText.setText(this.flagMode ? '🚩ON' : '🚩OFF');
  }

  private redrawAll(): void {
    for (let y = 0; y < GRID_H; y += 1) {
      for (let x = 0; x < GRID_W; x += 1) {
        this.redrawCell(x, y);
      }
    }
  }

  private redrawCell(x: number, y: number): void {
    const cell = this.grid[y][x];
    const bg = this.cellBg[y][x];
    const txt = this.cellText[y][x];

    if (cell.hidden) {
      bg.setFillStyle(cell.flagged ? 0x6f4f2a : 0x4b5569);
      bg.setStrokeStyle(1, cell.flagged ? 0xa27b48 : 0x30384a, 1);
      txt.setColor(cell.flagged ? '#ffe4b3' : '#ffffff');
      txt.setText(cell.flagged ? '⚑' : '');
      return;
    }

    switch (cell.kind) {
      case 'mine':
        bg.setFillStyle(0xa33f4f);
        bg.setStrokeStyle(1, 0xda7b88, 1);
        txt.setColor('#fff5f6');
        txt.setText(CELL_SYMBOL.mine);
        break;
      case 'safe':
      default:
        bg.setFillStyle(0xdce4ef);
        bg.setStrokeStyle(1, 0xa8b5c7, 1);
        txt.setColor(NUMBER_COLORS[cell.adjacentMines] ?? '#3a4a60');
        txt.setText(cell.adjacentMines > 0 ? String(cell.adjacentMines) : '');
        break;
    }
  }

  private ensureFirstRevealIsSafe(x: number, y: number): void {
    if (this.grid[y][x].kind !== 'mine') return;

    for (let ty = 0; ty < GRID_H; ty += 1) {
      for (let tx = 0; tx < GRID_W; tx += 1) {
        if ((tx !== x || ty !== y) && this.grid[ty][tx].kind === 'safe') {
          this.grid[ty][tx].kind = 'mine';
          this.grid[y][x].kind = 'safe';
          this.computeAdjacency();
          return;
        }
      }
    }
  }

  private revealAllMines(): void {
    for (let y = 0; y < GRID_H; y += 1) {
      for (let x = 0; x < GRID_W; x += 1) {
        const cell = this.grid[y][x];
        if (cell.kind === 'mine') {
          cell.hidden = false;
          cell.revealed = true;
          this.redrawCell(x, y);
        }
      }
    }
  }

  private startTimer(): void {
    this.timerEvent?.remove(false);
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.gameEnded) return;
        this.elapsedSeconds += 1;
        this.refreshUi();
      }
    });
  }

  private formatTime(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  private neighbors(x: number, y: number): Array<[number, number]> {
    const out: Array<[number, number]> = [];
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (this.inRange(nx, ny)) out.push([nx, ny]);
      }
    }
    return out;
  }

  private inRange(x: number, y: number): boolean {
    return x >= 0 && x < GRID_W && y >= 0 && y < GRID_H;
  }
}
