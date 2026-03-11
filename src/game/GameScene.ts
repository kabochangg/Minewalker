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

  private logLines: string[] = [];

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#12151f');
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
    const horizontalPadding = 12;
    const topPanelH = 100;
    const bottomPanelH = 220;
    const gap = 10;

    const maxBoardW = w - horizontalPadding * 2 - 12;
    const maxBoardH = h - topPanelH - bottomPanelH - gap * 3;
    this.cellSize = Math.max(24, Math.floor(Math.min(maxBoardW / GRID_W, maxBoardH / GRID_H)));

    const boardWidth = this.cellSize * GRID_W;
    const boardHeight = this.cellSize * GRID_H;

    this.boardX = Math.floor((w - boardWidth) / 2);
    this.boardY = topPanelH + gap;
    this.bottomY = this.boardY + boardHeight + gap;
    this.panelWidth = Math.min(w - horizontalPadding * 2, boardWidth + 20);
  }

  private drawFrames(): void {
    const w = this.scale.gameSize.width;

    this.add
      .rectangle(w / 2, 50, this.panelWidth, 92, 0x1d2433)
      .setStrokeStyle(2, 0x3a4761);

    this.add
      .rectangle(
        w / 2,
        this.boardY + (GRID_H * this.cellSize) / 2,
        GRID_W * this.cellSize + 12,
        GRID_H * this.cellSize + 12,
        0x1b2330
      )
      .setStrokeStyle(2, 0x3a4761);

    this.add
      .rectangle(w / 2, this.bottomY + 104, this.panelWidth, 206, 0x1d2433)
      .setStrokeStyle(2, 0x3a4761);
  }

  private addTopUi(): void {
    const left = Math.floor((this.scale.gameSize.width - this.panelWidth) / 2) + 12;
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      color: '#e8ecff',
      fontSize: '17px',
      fontStyle: 'bold'
    };

    this.hpText = this.add.text(left, 18, '', style);
    this.oreText = this.add.text(left + 92, 18, '', style);
    this.pickaxeText = this.add.text(left + 176, 18, '', style);
    this.turnText = this.add.text(left, 44, '', style);

    this.add.text(left, 68, 'タップ: 掘る / 長押し: 🚩 / 数字タップ: Chord', {
      color: '#c8d2ef',
      fontSize: '12px'
    });
  }

  private addBottomUi(): void {
    const left = Math.floor((this.scale.gameSize.width - this.panelWidth) / 2) + 12;
    const buttonGap = 8;
    const buttonWidth = Math.floor((this.panelWidth - 24 - buttonGap * 2) / 3);

    this.logText = this.add.text(left, this.bottomY + 14, '', {
      color: '#cbd5ff',
      fontSize: '13px',
      wordWrap: { width: this.panelWidth - 24 }
    });

    this.add.text(left, this.bottomY + 118, '凡例: 💣地雷 / ⛏鉱石 / ❤回復 / ★コア / 🚩旗', {
      color: '#9db2da',
      fontSize: '12px'
    });

    const upgradeBtn = this.makeButton(left, this.bottomY + 146, buttonWidth, 44, '強化 Ore3', () => {
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

    const flagBtn = this.makeButton(left + buttonWidth + buttonGap, this.bottomY + 146, buttonWidth, 44, '', () => {
      this.flagMode = !this.flagMode;
      this.refreshUi();
    });
    this.flagModeText = flagBtn.list[1] as Phaser.GameObjects.Text;

    const restartBtn = this.makeButton(left + (buttonWidth + buttonGap) * 2, this.bottomY + 146, buttonWidth, 44, 'リスタート', () => {
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
      .rectangle(0, 0, w, h, 0x31405e)
      .setOrigin(0)
      .setStrokeStyle(2, 0x7082ad);
    const text = this.add
      .text(w / 2, h / 2, label, { color: '#ffffff', fontSize: '14px' })
      .setOrigin(0.5);
    const c = this.add.container(x, y, [box, text]);
    box.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      box.setFillStyle(0x415176);
    });
    box.on('pointerup', () => {
      box.setFillStyle(0x31405e);
      onTap();
    });
    box.on('pointerout', () => box.setFillStyle(0x31405e));
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
          .rectangle(px, py, this.cellSize - 2, this.cellSize - 2, 0x4f4f57)
          .setOrigin(0)
          .setStrokeStyle(1, 0x191923);
        const txt = this.add
          .text(px + this.cellSize / 2, py + this.cellSize / 2, '', {
            color: '#f3f5ff',
            fontSize: this.cellSize >= 32 ? '16px' : '14px',
            fontStyle: 'bold'
          })
          .setOrigin(0.5);

        const zone = this.add.zone(px, py, this.cellSize - 2, this.cellSize - 2).setOrigin(0);
        this.bindCellPointer(zone, x, y);

        this.cellBg[y][x] = rect;
        this.cellText[y][x] = txt;
      }
    }

    const cx = Math.floor(GRID_W / 2);
    const cy = Math.floor(GRID_H / 2);
    this.revealCell(cx, cy, true);
    this.expandZeroes(cx, cy);

    this.pushLog('地下拠点を構築開始。壁を壊して進もう。');
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
    if (flagCount !== cell.adjacentMines) {
      this.pushLog(`Chord失敗: 旗 ${flagCount}/${cell.adjacentMines}`);
      return;
    }

    this.turn += 1;
    for (const [nx, ny] of around) {
      const n = this.grid[ny][nx];
      if (n.hidden && !n.flagged) {
        this.revealCell(nx, ny);
      }
    }

    this.refreshUi();
    this.redrawAll();
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
    this.pushLog(cell.flagged ? `(${x},${y}) に旗を設置` : `(${x},${y}) の旗を解除`);
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
    this.redrawAll();
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
      this.pushLog(`💥 地雷! HP -3`);
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
      return;
    }

    if (cell.kind === 'safe') {
      this.pushLog(`安全地帯。周囲地雷: ${cell.adjacentMines}`);
      if (cell.adjacentMines === 0) {
        this.expandZeroes(x, y);
      }
    }
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
    this.logText.setText(this.logLines.slice(-6).join('\n'));
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
      bg.setFillStyle(0x4f4f57);
      txt.setText(cell.flagged ? '🚩' : '');
      return;
    }

    switch (cell.kind) {
      case 'mine':
        bg.setFillStyle(0x812c2c);
        txt.setText('💣');
        break;
      case 'ore':
        bg.setFillStyle(0x37635f);
        txt.setText('⛏');
        break;
      case 'heal':
        bg.setFillStyle(0x315f3b);
        txt.setText('❤');
        break;
      case 'core':
        bg.setFillStyle(0x7359b0);
        txt.setText('★');
        break;
      case 'safe':
      default:
        bg.setFillStyle(0x2c3649);
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
