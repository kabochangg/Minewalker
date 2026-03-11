import Phaser from 'phaser';

type CellKind = 'safe' | 'mine' | 'ore' | 'heal' | 'core';

interface Cell {
  hidden: boolean;
  flagged: boolean;
  revealed: boolean;
  kind: CellKind;
  adjacentMines: number;
}

const GRID_W = 10;
const GRID_H = 14;
const LONG_PRESS_MS = 420;

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

  private hp = 12;
  private ore = 0;
  private pickaxePower = 1;
  private turn = 0;
  private gameEnded = false;
  private flagMode = false;

  private hpText!: Phaser.GameObjects.Text;
  private oreText!: Phaser.GameObjects.Text;
  private pickaxeText!: Phaser.GameObjects.Text;
  private turnText!: Phaser.GameObjects.Text;
  private logText!: Phaser.GameObjects.Text;
  private flagModeText!: Phaser.GameObjects.Text;

  private boardX = 0;
  private boardY = 0;
  private cellSize = 32;
  private bottomY = 0;
  private panelWidth = 0;
  private topPanelH = 0;
  private bottomPanelH = 0;

  private logLines: string[] = [];

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0d1320');
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

  private drawFrames(): void {
    const w = this.scale.gameSize.width;

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
    this.flagMode = false;
    this.hp = 12;
    this.ore = 0;
    this.pickaxePower = 1;
    this.turn = 0;
    this.logLines = [];

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
    let downAt = 0;

    zone.on('pointerdown', () => {
      downAt = this.time.now;
    });

    zone.on('pointerup', () => {
      if (this.gameEnded) return;
      const held = this.time.now - downAt;
      if (held >= LONG_PRESS_MS) {
        this.toggleFlag(x, y);
      } else {
        this.onCellTap(x, y);
      }
    });
  }

  private onCellTap(x: number, y: number): void {
    const target = this.grid[y][x];

    if (target.revealed) {
      this.tryChord(x, y);
      return;
    }

    if (this.flagMode) {
      this.toggleFlag(x, y);
      return;
    }

    this.mineAction(x, y);
  }

  private tryChord(x: number, y: number): void {
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
    const grid: Cell[][] = [];
    for (let y = 0; y < GRID_H; y += 1) {
      grid[y] = [];
      for (let x = 0; x < GRID_W; x += 1) {
        grid[y][x] = {
          hidden: true,
          flagged: false,
          revealed: false,
          kind: this.rollKind(),
          adjacentMines: 0
        };
      }
    }

    const cx = Math.floor(GRID_W / 2);
    const cy = Math.floor(GRID_H / 2);
    grid[cy][cx] = {
      hidden: false,
      flagged: false,
      revealed: true,
      kind: 'safe',
      adjacentMines: 0
    };

    for (const [nx, ny] of this.neighbors(cx, cy)) {
      if (grid[ny][nx].kind === 'mine' || grid[ny][nx].kind === 'core') {
        grid[ny][nx].kind = 'safe';
      }
    }

    const coreX = Phaser.Math.Between(0, GRID_W - 1);
    const coreY = Phaser.Math.Between(0, GRID_H - 1);
    if (coreX !== cx || coreY !== cy) {
      grid[coreY][coreX].kind = 'core';
    }

    return grid;
  }

  private rollKind(): CellKind {
    const r = Math.random();
    if (r < 0.14) return 'mine';
    if (r < 0.24) return 'ore';
    if (r < 0.3) return 'heal';
    return 'safe';
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
  }

  private mineAction(x: number, y: number): void {
    const target = this.grid[y][x];
    if (!target.hidden || target.flagged) return;

    const adjacentRevealed = this.neighbors(x, y).some(([nx, ny]) => this.grid[ny][nx].revealed);
    if (!adjacentRevealed) {
      this.pushLog('隣接する壁しか壊せない。');
      return;
    }

    this.turn += 1;

    if (this.pickaxePower >= 2) {
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (Math.abs(dx) + Math.abs(dy) > 1) continue;
          const tx = x + dx;
          const ty = y + dy;
          if (!this.inRange(tx, ty)) continue;
          if (!this.grid[ty][tx].hidden || this.grid[ty][tx].flagged) continue;
          this.revealCell(tx, ty);
        }
      }
    } else {
      this.revealCell(x, y);
    }

    this.refreshUi();
    this.checkEndState();
  }

  private revealCell(x: number, y: number, forceSafe = false): void {
    const cell = this.grid[y][x];
    if (!cell.hidden || cell.flagged) return;

    cell.hidden = false;
    cell.revealed = true;

    if (forceSafe) {
      cell.kind = 'safe';
    }

    if (cell.kind === 'mine') {
      this.hp -= 3;
      this.pushLog('💥 地雷! HP -3');
      this.redrawCell(x, y);
      return;
    }

    if (cell.kind === 'ore') {
      this.ore += 1;
      this.pushLog('⛏️ 鉱石を入手 +1');
    }

    if (cell.kind === 'heal') {
      this.hp = Math.min(12, this.hp + 2);
      this.pushLog('🧪 回復 +2');
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

      const cell = this.grid[y][x];
      if (cell.kind !== 'safe' || cell.adjacentMines !== 0) continue;

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

  private checkEndState(): void {
    if (this.hp <= 0) {
      this.hp = 0;
      this.gameEnded = true;
      this.pushLog('☠️ HPが尽きた。ゲームオーバー');
    }
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
  }

  private pushLog(message: string): void {
    this.logLines.push(`[${this.turn}] ${message}`);
    this.refreshUi();
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
