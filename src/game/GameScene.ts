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

const NUMBER_COLORS: Record<number, string> = {
  1: '#7ec8ff',
  2: '#84f0a8',
  3: '#ffd27d',
  4: '#ff9fc2',
  5: '#c6a8ff',
  6: '#6ae8e8',
  7: '#ffd9f2',
  8: '#ffffff'
};

export class GameScene extends Phaser.Scene {
  private grid: Cell[][] = [];
  private cellBg: Phaser.GameObjects.Rectangle[][] = [];
  private cellText: Phaser.GameObjects.Text[][] = [];
  private cellZones: Phaser.GameObjects.Zone[][] = [];

  private boardX = 0;
  private boardY = 0;
  private cellSize = 32;
  private bottomY = 0;
  private panelWidth = 0;
  private topPanelH = 0;
  private bottomPanelH = 0;

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
    this.cameras.main.setBackgroundColor('#0d1320');
    this.computeLayout();
    this.drawFrames();
    this.addTopUi();
    this.addBottomUi();
    this.cameras.main.setBackgroundColor('#0e1320');
    this.layoutBoard();
    this.createUi();
    this.newRun();

    this.scale.on('resize', () => {
      this.scene.restart();
    });

  private computeLayout(): void {
    const w = this.scale.gameSize.width;
    const h = this.scale.gameSize.height;
    const horizontalPadding = 8;
    const gap = 8;

    this.topPanelH = Math.max(84, Math.floor(h * 0.12));
    this.bottomPanelH = Math.max(158, Math.floor(h * 0.2));

    const maxBoardW = w - horizontalPadding * 2 - 10;
    const maxBoardH = h - this.topPanelH - this.bottomPanelH - gap * 3;
    this.cellSize = Math.max(20, Math.floor(Math.min(maxBoardW / GRID_W, maxBoardH / GRID_H)));

    const boardWidth = this.cellSize * GRID_W;
    const boardHeight = this.cellSize * GRID_H;

    this.boardX = Math.floor((w - boardWidth) / 2);
    this.boardY = this.topPanelH + gap;
    this.bottomY = this.boardY + boardHeight + gap;
    this.panelWidth = Math.min(w - horizontalPadding * 2, boardWidth + 16);
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
      .rectangle(w / 2, this.topPanelH / 2, this.panelWidth, this.topPanelH - 4, 0x101723)
      .setStrokeStyle(1, 0x2a3951);

    this.add
      .rectangle(
        w / 2,
        this.boardY + (GRID_H * this.cellSize) / 2,
        GRID_W * this.cellSize + 6,
        GRID_H * this.cellSize + 6,
        0x141d2a
      )
      .setStrokeStyle(1, 0x2a3951);

    this.add
      .rectangle(w / 2, this.bottomY + this.bottomPanelH / 2, this.panelWidth, this.bottomPanelH - 4, 0x101723)
      .setStrokeStyle(1, 0x2a3951);
  }

  private addTopUi(): void {
    const left = Math.floor((this.scale.gameSize.width - this.panelWidth) / 2) + 10;
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      color: '#e8ecff',
      fontSize: '16px',
      fontStyle: 'bold'
    };

    this.hpText = this.add.text(left, 14, '', style);
    this.oreText = this.add.text(left + 86, 14, '', style);
    this.pickaxeText = this.add.text(left + 160, 14, '', style);
    this.turnText = this.add.text(left, 38, '', style);

    this.add.text(left, 60, '通常: 開く / 🚩モード: 旗 / 長押し: 旗 / 数字: Chord', {
      color: '#c8d2ef',
      fontSize: '11px'
    });
  }

  private addBottomUi(): void {
    const left = Math.floor((this.scale.gameSize.width - this.panelWidth) / 2) + 10;
    const buttonGap = 6;
    const buttonWidth = Math.floor((this.panelWidth - 20 - buttonGap * 2) / 3);

    this.logText = this.add.text(left, this.bottomY + 8, '', {
      color: '#cbd5ff',
      fontSize: '12px',
      wordWrap: { width: this.panelWidth - 20 }
    });

    this.add.text(left, this.bottomY + 72, '凡例: ⬛未開封 / 🚩旗 / 🟥危険 / 1-8=周囲地雷数', {
      color: '#9db2da',
      fontSize: '12px'
    });

    this.add.text(left, this.bottomY + 90, 'アイコン: 💣地雷 / ⛏鉱石 / ❤回復 / ★コア', {
      color: '#9db2da',
      fontSize: '12px'
    });

    const upgradeBtn = this.makeButton(left, this.bottomY + 112, buttonWidth, 40, '強化 Ore3', () => {
      if (this.gameEnded) return;
      if (this.ore < 3) {
        this.pushLog('Oreが足りない…');
        return;
      }
      this.ore -= 3;
      this.pickaxePower += 1;
      this.pushLog(`ピッケル強化! Power ${this.pickaxePower}`);
      this.refreshUi();
    });

    const flagBtn = this.makeButton(left + buttonWidth + buttonGap, this.bottomY + 112, buttonWidth, 40, '', () => {
      this.flagMode = !this.flagMode;
      this.refreshUi();
    });
    this.flagModeText = flagBtn.list[1] as Phaser.GameObjects.Text;

    const restartBtn = this.makeButton(left + (buttonWidth + buttonGap) * 2, this.bottomY + 112, buttonWidth, 40, 'リスタート', () => {
      this.newRun();
    });

    [upgradeBtn, flagBtn, restartBtn].forEach((btn) => btn.setDepth(5));
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
      .rectangle(0, 0, w, h, 0x293753)
      .setOrigin(0)
      .setStrokeStyle(1, 0x788cb8);
    const text = this.add
      .text(w / 2, h / 2, label, { color: '#ffffff', fontSize: '13px' })
      .setOrigin(0.5);
    const c = this.add.container(x, y, [box, text]);
    box.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      box.setFillStyle(0x3d4f76);
    });
    box.on('pointerup', () => {
      box.setFillStyle(0x293753);
      onTap();
    });
    box.on('pointerout', () => box.setFillStyle(0x293753));
    return c;
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
          .rectangle(px, py, this.cellSize - 1, this.cellSize - 1, 0x3a4457)
          .setOrigin(0)
          .setStrokeStyle(1, 0x212d40);
        const txt = this.add
          .text(px + this.cellSize / 2, py + this.cellSize / 2, '', {
            color: '#f3f5ff',
            fontSize: this.cellSize >= 30 ? '16px' : '14px',
            fontStyle: 'bold'
          })
          .setOrigin(0.5);

        const zone = this.add.zone(px, py, this.cellSize - 1, this.cellSize - 1).setOrigin(0);
        this.bindCellPointer(zone, x, y);

        this.cellBg[y][x] = rect;
        this.cellText[y][x] = txt;
        this.cellZones[y][x] = zone;
      }
    }

    const cx = Math.floor(GRID_W / 2);
    const cy = Math.floor(GRID_H / 2);
    this.revealCell(cx, cy, true);
    this.expandZeroes(cx, cy);

    this.pushLog('地雷原を突破しよう。テンポ重視で掘削!');
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
    if (!cell.revealed || cell.adjacentMines <= 0) return;

    const around = this.neighbors(x, y);
    const flagCount = around.filter(([nx, ny]) => this.grid[ny][nx].flagged).length;
    if (flagCount !== cell.adjacentMines) return;

    this.turn += 1;
    let opened = 0;
    for (const [nx, ny] of around) {
      const n = this.grid[ny][nx];
      if (n.hidden && !n.flagged) {
        this.revealCell(nx, ny);
        opened += 1;
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

  private toggleFlag(x: number, y: number): void {
    const cell = this.grid[y][x];
    if (!cell.hidden || cell.revealed) return;
    cell.flagged = !cell.flagged;
    this.redrawCell(x, y);
  }

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

    this.refreshUi();
    this.checkEndState();
  }

  private openCell(x: number, y: number): void {
    const target = this.grid[y][x];
    if (target.flagged || target.revealed || this.gameEnded) return;

    if (!this.firstOpenDone) {
      this.ensureFirstTapSafe(x, y);
      this.startedAt = this.time.now;
      this.firstOpenDone = true;
    }

    if (cell.kind === 'mine') {
      this.hp -= 3;
      this.pushLog('💥 地雷! HP -3');
      this.redrawCell(x, y);
      return;
    }

    if (target.adjacentMines === 0) {
      this.expandZeroes(x, y);
    }

    this.redrawAll();
    this.checkWin();
  }

    if (cell.kind === 'core') {
      this.pushLog('🌟 Coreを発見! クリア!');
      this.gameEnded = true;
      this.redrawCell(x, y);
      return;
    }

    if (cell.kind === 'safe') {
      if (cell.adjacentMines === 0) {
        this.expandZeroes(x, y);
      }
    }

    this.redrawCell(x, y);
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
        if (n.hidden && !n.flagged && n.kind !== 'mine' && n.kind !== 'core') {
          n.hidden = false;
          n.revealed = true;
          if (n.kind === 'ore') this.ore += 1;
          if (n.kind === 'heal') this.hp = Math.min(12, this.hp + 1);
          if (n.kind === 'safe' && n.adjacentMines === 0) {
            queue.push([nx, ny]);
          }
          this.redrawCell(nx, ny);
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
    this.hpText.setText(`HP:${this.hp}`);
    this.oreText.setText(`Ore:${this.ore}`);
    this.pickaxeText.setText(`Pick:${this.pickaxePower}`);
    this.turnText.setText(`Turn:${this.turn}`);
    this.flagModeText.setText(this.flagMode ? '🚩モードON' : '🚩モードOFF');
    this.logText.setText(this.logLines.slice(-4).join('\n'));
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
      bg.setFillStyle(cell.flagged ? 0x374c73 : 0x3a4457);
      txt.setColor('#ffffff');
      txt.setText(cell.flagged ? '🚩' : '');
      txt.setColor('#fef08a');
      return;
    }

    switch (cell.kind) {
      case 'mine':
        bg.setFillStyle(0x8d2b2b);
        txt.setColor('#ffffff');
        txt.setText('💣');
        break;
      case 'ore':
        bg.setFillStyle(0x2a6f78);
        txt.setColor('#f2fbff');
        txt.setText('⛏');
        break;
      case 'heal':
        bg.setFillStyle(0x2f7b4a);
        txt.setColor('#f2fbff');
        txt.setText('❤');
        break;
      case 'core':
        bg.setFillStyle(0x6b53b0);
        txt.setColor('#ffffff');
        txt.setText('★');
        break;
      case 'safe':
      default:
        bg.setFillStyle(0x192233);
        txt.setColor(NUMBER_COLORS[cell.adjacentMines] ?? '#dce7ff');
        txt.setText(cell.adjacentMines > 0 ? String(cell.adjacentMines) : '');
        break;
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
