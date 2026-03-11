import Phaser from 'phaser';

interface Cell {
  isMine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacentMines: number;
}

const GRID_W = 10;
const GRID_H = 14;
const TOTAL_MINES = 24;
const LONG_PRESS_MS = 320;

const NUMBER_COLORS = ['#d5deff', '#4fc3f7', '#6ee7b7', '#facc15', '#fb7185', '#f97316', '#a78bfa', '#f472b6', '#ffffff'];

export class GameScene extends Phaser.Scene {
  private grid: Cell[][] = [];
  private cellBg: Phaser.GameObjects.Rectangle[][] = [];
  private cellText: Phaser.GameObjects.Text[][] = [];
  private cellZones: Phaser.GameObjects.Zone[][] = [];

  private boardX = 0;
  private boardY = 0;
  private cellSize = 30;

  private startedAt = 0;
  private elapsedSec = 0;
  private minesLeft = TOTAL_MINES;
  private gameEnded = false;
  private firstOpenDone = false;
  private flagMode = false;

  private timerText!: Phaser.GameObjects.Text;
  private mineCounterText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private helpText!: Phaser.GameObjects.Text;
  private flagModeLabel!: Phaser.GameObjects.Text;
  private flagModeBtn!: Phaser.GameObjects.Rectangle;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0e1320');
    this.layoutBoard();
    this.createUi();
    this.newRun();

    this.scale.on('resize', () => {
      this.scene.restart();
    });

    this.time.addEvent({
      delay: 1000,
      callback: () => {
        if (this.gameEnded || !this.firstOpenDone) return;
        this.elapsedSec += 1;
        this.refreshUi();
      },
      loop: true
    });
  }

  private layoutBoard(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const sidePadding = 12;
    const topArea = 112;
    const bottomArea = 190;

    const byWidth = (width - sidePadding * 2) / GRID_W;
    const byHeight = (height - topArea - bottomArea) / GRID_H;
    this.cellSize = Math.max(22, Math.floor(Math.min(byWidth, byHeight)));

    const boardPixelW = this.cellSize * GRID_W;
    const boardPixelH = this.cellSize * GRID_H;
    this.boardX = Math.floor((width - boardPixelW) / 2);
    this.boardY = topArea;

    this.add
      .rectangle(width / 2, topArea / 2, width - 16, 92, 0x182236)
      .setStrokeStyle(2, 0x3d557e)
      .setOrigin(0.5);

    this.add
      .rectangle(width / 2, this.boardY + boardPixelH / 2, boardPixelW + 10, boardPixelH + 10, 0x182236)
      .setStrokeStyle(2, 0x3d557e)
      .setOrigin(0.5);

    this.add
      .rectangle(width / 2, height - bottomArea / 2 + 10, width - 16, bottomArea - 20, 0x182236)
      .setStrokeStyle(2, 0x3d557e)
      .setOrigin(0.5);
  }

  private createUi(): void {
    this.timerText = this.add.text(20, 20, '', { fontSize: '22px', fontStyle: 'bold', color: '#e6eeff' });
    this.mineCounterText = this.add.text(20, 52, '', { fontSize: '20px', fontStyle: 'bold', color: '#fca5a5' });
    this.statusText = this.add.text(this.scale.width - 18, 20, '', {
      fontSize: '17px',
      color: '#c7d2fe',
      align: 'right'
    }).setOrigin(1, 0);

    const btnW = 122;
    const btnH = 38;
    const btnX = this.scale.width - btnW - 20;
    const btnY = 54;
    this.flagModeBtn = this.add
      .rectangle(btnX, btnY, btnW, btnH, 0x36517b)
      .setOrigin(0)
      .setStrokeStyle(2, 0x6f95ce)
      .setInteractive({ useHandCursor: true });

    this.flagModeLabel = this.add
      .text(btnX + btnW / 2, btnY + btnH / 2, '', {
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    this.flagModeBtn.on('pointerdown', () => {
      this.flagMode = !this.flagMode;
      this.refreshUi();
    });

    this.helpText = this.add.text(20, this.scale.height - 164, '', {
      fontSize: '15px',
      color: '#dbe7ff',
      wordWrap: { width: this.scale.width - 40 }
    });
  }

  private newRun(): void {
    this.gameEnded = false;
    this.firstOpenDone = false;
    this.startedAt = this.time.now;
    this.elapsedSec = 0;
    this.flagMode = false;

    this.grid = this.buildGrid();
    this.computeAdjacency();

    this.cellBg.flat().forEach((x) => x.destroy());
    this.cellText.flat().forEach((x) => x.destroy());
    this.cellZones.flat().forEach((x) => x.destroy());
    this.cellBg = [];
    this.cellText = [];
    this.cellZones = [];

    for (let y = 0; y < GRID_H; y += 1) {
      this.cellBg[y] = [];
      this.cellText[y] = [];
      this.cellZones[y] = [];
      for (let x = 0; x < GRID_W; x += 1) {
        const px = this.boardX + x * this.cellSize;
        const py = this.boardY + y * this.cellSize;

        const rect = this.add
          .rectangle(px, py, this.cellSize - 2, this.cellSize - 2, 0x46556f)
          .setOrigin(0)
          .setStrokeStyle(1, 0x0d1424);

        const txt = this.add
          .text(px + this.cellSize / 2, py + this.cellSize / 2, '', {
            fontSize: `${Math.max(16, this.cellSize * 0.62)}px`,
            fontStyle: 'bold',
            color: '#ffffff'
          })
          .setOrigin(0.5);

        const zone = this.add.zone(px, py, this.cellSize - 2, this.cellSize - 2).setOrigin(0);
        this.bindCellPointer(zone, x, y);

        this.cellBg[y][x] = rect;
        this.cellText[y][x] = txt;
        this.cellZones[y][x] = zone;
      }
    }

    this.refreshMinesLeft();
    this.refreshUi();
    this.redrawAll();
  }

  private bindCellPointer(zone: Phaser.GameObjects.Zone, x: number, y: number): void {
    zone.setInteractive();
    let longPressHandled = false;
    let longPressTimer: Phaser.Time.TimerEvent | null = null;

    zone.on('pointerdown', () => {
      if (this.gameEnded) return;
      longPressHandled = false;
      longPressTimer = this.time.delayedCall(LONG_PRESS_MS, () => {
        if (this.gameEnded) return;
        longPressHandled = true;
        this.toggleFlag(x, y);
      });
    });

    zone.on('pointerup', () => {
      if (longPressTimer) {
        longPressTimer.remove(false);
        longPressTimer = null;
      }
      if (this.gameEnded || longPressHandled) return;
      this.handleTap(x, y);
    });

    zone.on('pointerout', () => {
      if (longPressTimer) {
        longPressTimer.remove(false);
        longPressTimer = null;
      }
    });
  }

  private handleTap(x: number, y: number): void {
    const cell = this.grid[y][x];
    if (this.flagMode && !cell.revealed) {
      this.toggleFlag(x, y);
      return;
    }

    if (cell.revealed) {
      this.tryChord(x, y);
      return;
    }

    this.openCell(x, y);
  }

  private buildGrid(): Cell[][] {
    const out: Cell[][] = [];
    for (let y = 0; y < GRID_H; y += 1) {
      out[y] = [];
      for (let x = 0; x < GRID_W; x += 1) {
        out[y][x] = {
          isMine: false,
          revealed: false,
          flagged: false,
          adjacentMines: 0
        };
      }
    }

    let placed = 0;
    while (placed < TOTAL_MINES) {
      const x = Phaser.Math.Between(0, GRID_W - 1);
      const y = Phaser.Math.Between(0, GRID_H - 1);
      if (out[y][x].isMine) continue;
      out[y][x].isMine = true;
      placed += 1;
    }

    return out;
  }

  private computeAdjacency(): void {
    for (let y = 0; y < GRID_H; y += 1) {
      for (let x = 0; x < GRID_W; x += 1) {
        this.grid[y][x].adjacentMines = this.neighbors(x, y).filter(([nx, ny]) => this.grid[ny][nx].isMine).length;
      }
    }
  }

  private ensureFirstTapSafe(x: number, y: number): void {
    if (!this.grid[y][x].isMine) return;

    this.grid[y][x].isMine = false;
    for (let yy = 0; yy < GRID_H; yy += 1) {
      for (let xx = 0; xx < GRID_W; xx += 1) {
        if (!this.grid[yy][xx].isMine && (xx !== x || yy !== y)) {
          this.grid[yy][xx].isMine = true;
          this.computeAdjacency();
          return;
        }
      }
    }
  }

  private openCell(x: number, y: number): void {
    const target = this.grid[y][x];
    if (target.flagged || target.revealed || this.gameEnded) return;

    if (!this.firstOpenDone) {
      this.ensureFirstTapSafe(x, y);
      this.startedAt = this.time.now;
      this.firstOpenDone = true;
    }

    target.revealed = true;
    if (target.isMine) {
      this.gameEnded = true;
      this.statusText.setText('💥 GAME OVER');
      this.revealAllMines();
      this.redrawAll();
      return;
    }

    if (target.adjacentMines === 0) {
      this.expandZeroes(x, y);
    }

    this.redrawAll();
    this.checkWin();
  }

  private tryChord(x: number, y: number): void {
    const center = this.grid[y][x];
    if (!center.revealed || center.adjacentMines === 0 || this.gameEnded) return;

    const around = this.neighbors(x, y);
    const flags = around.filter(([nx, ny]) => this.grid[ny][nx].flagged).length;
    if (flags !== center.adjacentMines) return;

    around.forEach(([nx, ny]) => {
      const n = this.grid[ny][nx];
      if (!n.flagged && !n.revealed) {
        this.openCell(nx, ny);
      }
    });
  }

  private toggleFlag(x: number, y: number): void {
    const cell = this.grid[y][x];
    if (cell.revealed || this.gameEnded) return;
    cell.flagged = !cell.flagged;
    this.refreshMinesLeft();
    this.redrawCell(x, y);
    this.refreshUi();
  }

  private expandZeroes(startX: number, startY: number): void {
    const queue: Array<[number, number]> = [[startX, startY]];
    const seen = new Set<string>();

    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      const key = `${x},${y}`;
      if (seen.has(key)) continue;
      seen.add(key);

      for (const [nx, ny] of this.neighbors(x, y)) {
        const n = this.grid[ny][nx];
        if (n.revealed || n.flagged || n.isMine) continue;
        n.revealed = true;
        if (n.adjacentMines === 0) {
          queue.push([nx, ny]);
        }
      }
    }
  }

  private checkWin(): void {
    let opened = 0;
    for (let y = 0; y < GRID_H; y += 1) {
      for (let x = 0; x < GRID_W; x += 1) {
        if (this.grid[y][x].revealed) opened += 1;
      }
    }

    if (opened === GRID_W * GRID_H - TOTAL_MINES) {
      this.gameEnded = true;
      this.statusText.setText('🏁 CLEAR!');
    }
  }

  private revealAllMines(): void {
    for (let y = 0; y < GRID_H; y += 1) {
      for (let x = 0; x < GRID_W; x += 1) {
        if (this.grid[y][x].isMine) {
          this.grid[y][x].revealed = true;
        }
      }
    }
  }

  private refreshMinesLeft(): void {
    const flags = this.grid.flat().filter((c) => c.flagged).length;
    this.minesLeft = TOTAL_MINES - flags;
  }

  private refreshUi(): void {
    this.timerText.setText(`⏱ ${this.elapsedSec}s`);
    this.mineCounterText.setText(`💣 ${this.minesLeft}`);

    if (!this.gameEnded) {
      this.statusText.setText(this.flagMode ? 'Flag Mode: ON' : 'Flag Mode: OFF');
    }

    this.flagModeBtn.setFillStyle(this.flagMode ? 0x059669 : 0x36517b);
    this.flagModeLabel.setText(this.flagMode ? '🚩 FLAG ON' : '⛏ OPEN');

    this.helpText.setText(
      '操作: タップ=開く / 長押し=旗\n' +
        '数字マスをタップ: 周囲の🚩数が一致すると一括オープン(chord)\n' +
        '旗モードON: タップで🚩切替。誤タップを防いで高速プレイ。'
    );
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

    if (!cell.revealed) {
      bg.setFillStyle(0x46556f);
      txt.setText(cell.flagged ? '🚩' : '');
      txt.setColor('#fef08a');
      return;
    }

    if (cell.isMine) {
      bg.setFillStyle(0x8b1f2f);
      txt.setText('💣');
      txt.setColor('#ffffff');
      return;
    }

    bg.setFillStyle(0x1f2c44);
    if (cell.adjacentMines > 0) {
      txt.setText(String(cell.adjacentMines));
      txt.setColor(NUMBER_COLORS[cell.adjacentMines]);
    } else {
      txt.setText('');
    }
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
