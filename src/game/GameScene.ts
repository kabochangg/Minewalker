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

const CELL_SYMBOL: Record<Exclude<CellKind, 'safe'>, string> = {
  mine: '✹',
  ore: '◆',
  heal: '+',
  core: '◎'
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
  private helpModal!: Phaser.GameObjects.Container;

  private hpBar!: Phaser.GameObjects.Rectangle;
  private oreBar!: Phaser.GameObjects.Rectangle;
  private pickaxeBar!: Phaser.GameObjects.Rectangle;
  private turnBar!: Phaser.GameObjects.Rectangle;

  private boardX = 0;
  private boardY = 0;
  private cellSize = 32;
  private bottomY = 0;
  private panelWidth = 0;
  private topPanelH = 0;
  private bottomPanelH = 0;
  private logAreaH = 0;
  private safeTop = 0;
  private safeBottom = 0;

  private logLines: string[] = [];

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

    this.topPanelH = 84;
    this.bottomPanelH = 116;
    this.logAreaH = 24;

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
    const barW = this.panelWidth - 20;
    const rowGap = 18;

    const labelStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      color: '#f0f6ff',
      fontSize: '12px',
      fontStyle: 'bold'
    };

    const topStart = this.safeTop + 8;
    this.hpText = this.add.text(left, topStart, '', labelStyle);
    this.hpBar = this.makeStatBar(left, topStart + 14, barW, 0xf56b83);

    this.oreText = this.add.text(left, topStart + rowGap, '', labelStyle);
    this.oreBar = this.makeStatBar(left, topStart + rowGap + 14, barW, 0x6ad5ef);

    this.pickaxeText = this.add.text(left, topStart + rowGap * 2, '', labelStyle);
    this.pickaxeBar = this.makeStatBar(left, topStart + rowGap * 2 + 14, barW, 0x7b9bff);

    this.turnText = this.add.text(left, topStart + rowGap * 3, '', labelStyle);
    this.turnBar = this.makeStatBar(left, topStart + rowGap * 3 + 14, barW, 0x73d284);
  }

  private makeStatBar(x: number, y: number, width: number, fillColor: number): Phaser.GameObjects.Rectangle {
    this.add.rectangle(x, y, width, 8, 0x1b2a46).setOrigin(0).setStrokeStyle(1, 0x324f7b, 0.9);
    return this.add.rectangle(x + 1, y + 1, width - 2, 6, fillColor).setOrigin(0);
  }

  private addBottomUi(): void {
    const left = Math.floor((this.scale.gameSize.width - this.panelWidth) / 2) + 10;
    const buttonGap = 6;
    const buttonWidth = Math.floor((this.panelWidth - 20 - buttonGap * 2) / 3);

    this.logText = this.add.text(left, this.bottomY + 8, '', {
      color: '#d8e6ff',
      fontSize: '12px',
      wordWrap: { width: this.panelWidth - 20 }
    });

    const controlY = this.bottomY + this.logAreaH + 14;

    const upgradeBtn = this.makeButton(left, controlY, buttonWidth, 32, '強化 Ore3', () => {
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

    const flagBtn = this.makeButton(left + buttonWidth + buttonGap, controlY, buttonWidth, 32, '', () => {
      this.flagMode = !this.flagMode;
      this.refreshUi();
    });
    this.flagModeText = flagBtn.list[1] as Phaser.GameObjects.Text;

    const restartBtn = this.makeButton(left + (buttonWidth + buttonGap) * 2, controlY, buttonWidth, 32, 'リスタート', () => {
      this.newRun();
    });

    const helpBtn = this.makeButton(left + this.panelWidth - 56, this.bottomY + 6, 46, 26, '?', () => {
      this.helpModal.setVisible(true);
    });

    this.helpModal = this.createHelpModal();

    [upgradeBtn, flagBtn, restartBtn, helpBtn].forEach((btn) => btn.setDepth(5));
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
    const title = this.add.text(left + 12, top + 10, '操作説明 / 凡例', {
      color: '#f3f7ff',
      fontSize: '14px',
      fontStyle: 'bold'
    });
    const body = this.add.text(left + 12, top + 38, '・タップ: マスを開く\n・長押し / 🚩: 旗のON/OFF\n・数字マスをタップ: 周囲を同時に開く\n\n凡例\n💣 地雷  /  🚩 旗\n耐久が0でゲームオーバー\nCore発見でクリア', {
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
    this.hpText.setText(`HP ${this.hp}/12`);
    this.oreText.setText(`Ore ${this.ore}`);
    this.pickaxeText.setText(`Pick ${this.pickaxePower}`);
    this.turnText.setText(`Turn ${this.turn}`);
    this.flagModeText.setText(this.flagMode ? '🚩ON' : '🚩OFF');
    this.logText.setText(`[${this.turn}] ${this.logLines.slice(-1)[0] ?? ''}`);

    this.hpBar.width = Math.max(2, (this.panelWidth - 22) * Phaser.Math.Clamp(this.hp / 12, 0, 1));
    this.oreBar.width = Math.max(2, (this.panelWidth - 22) * Phaser.Math.Clamp(this.ore / 12, 0, 1));
    this.pickaxeBar.width = Math.max(2, (this.panelWidth - 22) * Phaser.Math.Clamp(this.pickaxePower / 6, 0, 1));
    this.turnBar.width = Math.max(2, (this.panelWidth - 22) * Phaser.Math.Clamp(this.turn / 30, 0, 1));
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
      case 'ore':
        bg.setFillStyle(0x2f7b89);
        bg.setStrokeStyle(1, 0x65b6c5, 1);
        txt.setColor('#defbff');
        txt.setText(CELL_SYMBOL.ore);
        break;
      case 'heal':
        bg.setFillStyle(0x3c6f55);
        bg.setStrokeStyle(1, 0x7db592, 1);
        txt.setColor('#e9fff1');
        txt.setText(CELL_SYMBOL.heal);
        break;
      case 'core':
        bg.setFillStyle(0x7a5cad);
        bg.setStrokeStyle(1, 0xbaa1e0, 1);
        txt.setColor('#fbf4ff');
        txt.setText(CELL_SYMBOL.core);
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

  private pushLog(message: string): void {
    this.logLines.push(message);
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
