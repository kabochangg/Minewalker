import Phaser from "phaser";
import { getItemName } from "../../data/items";
import { getMonster } from "../../data/monsters";
import { createInitialPlayer, type PlayerState } from "../entities/player";
import type { Minefield, Tile } from "../map/types";
import { getTile, replaceTile } from "../map/types";
import { attackMonster, type CombatantState } from "../systems/CombatSystem";
import { rollWeightedDrop } from "../systems/DropSystem";
import { createInitialInventory, type InventoryState, addItem, getUsedCapacity } from "../systems/InventorySystem";
import { coolMine, disableMine, toggleFlag } from "../systems/MineHandlingSystem";
import { generateMinefield } from "../systems/MinefieldSystem";
import { mineTile } from "../systems/MiningSystem";
import { tryMove } from "../systems/MovementSystem";
import { addButton, addHudBar, COLORS, drawPixelMiner } from "./uiHelpers";

type ActionMode = "mine" | "cool" | "disable" | "map" | "bag";

interface MonsterRuntime {
  readonly tileX: number;
  readonly tileY: number;
  readonly combatant: CombatantState;
}

const TILE_SIZE = 32;
const BOARD_X = 19;
const BOARD_Y = 138;

export class ExplorationScene extends Phaser.Scene {
  private field!: Minefield;
  private player!: PlayerState;
  private inventory!: InventoryState;
  private mode: ActionMode = "mine";
  private message = "数字のマスを頼りに掘り進めよう!";
  private monster?: MonsterRuntime;
  private cleared = false;
  private failed = false;
  private readonly tileObjects: Phaser.GameObjects.GameObject[] = [];
  private readonly hudObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super("ExplorationScene");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#0b0f12");
    this.field = this.createScenarioField();
    this.player = createInitialPlayer();
    this.inventory = createInitialInventory();
    const slime = getMonster("monster.slime");
    this.monster = {
      tileX: 7,
      tileY: 5,
      combatant: { hp: slime.hp, maxHp: slime.hp }
    };
    this.render();
  }

  private createScenarioField(): Minefield {
    const generated = generateMinefield({
      width: 11,
      height: 16,
      mineCount: 24,
      safeRadius: 1,
      seed: "minewalker-phase-1",
      startX: 4,
      startY: 7
    });
    const exitTile = getTile(generated, 9, 14);
    if (!exitTile) {
      return generated;
    }
    return replaceTile(generated, {
      ...exitTile,
      state: "exit",
      hasMine: false,
      mineId: undefined,
      isWalkable: false,
      isRevealed: false
    });
  }

  private render(): void {
    this.clearObjects(this.tileObjects);
    this.clearObjects(this.hudObjects);
    this.drawBackdrop();
    this.drawTiles();
    this.drawPlayer();
    this.drawMonster();
    this.drawHud();
    this.drawMessage();
    this.drawActions();
    if (this.cleared || this.failed) {
      this.time.delayedCall(600, () => {
        this.scene.start("ResultScene", {
          success: this.cleared,
          depth: this.player.depth,
          inventory: this.inventory
        });
      });
    }
  }

  private drawBackdrop(): void {
    const graphics = this.add.graphics();
    this.tileObjects.push(graphics);
    graphics.fillStyle(0x11100d);
    graphics.fillRect(0, 0, 390, 844);
    graphics.fillStyle(0x19140f);
    graphics.fillRect(0, 112, 390, 604);
    graphics.fillStyle(0xffb13b, 0.1);
    graphics.fillCircle(132, 330, 130);
  }

  private drawTiles(): void {
    for (const tile of this.field.tiles) {
      const x = BOARD_X + tile.x * TILE_SIZE;
      const y = BOARD_Y + tile.y * TILE_SIZE;
      const rect = this.add
        .rectangle(x, y, TILE_SIZE - 2, TILE_SIZE - 2, this.getTileColor(tile), 1)
        .setOrigin(0)
        .setStrokeStyle(1, 0x2d251c)
        .setInteractive({ useHandCursor: true });
      rect.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        if (pointer.getDuration() > 450) {
          this.handleFlag(tile);
          return;
        }
        this.handleTileTap(tile);
      });
      rect.on("pointerup", (pointer: Phaser.Input.Pointer) => {
        if (pointer.getDuration() > 450) {
          this.handleFlag(tile);
        }
      });
      this.tileObjects.push(rect);

      if (tile.isRevealed && tile.adjacentMineCount > 0) {
        this.tileObjects.push(
          this.add
            .text(x + TILE_SIZE / 2, y + TILE_SIZE / 2, String(tile.adjacentMineCount), {
              fontFamily: "sans-serif",
              fontSize: "22px",
              fontStyle: "bold",
              color: this.getNumberColor(tile.adjacentMineCount)
            })
            .setOrigin(0.5)
        );
      }
      if (tile.mark === "flag") {
        this.tileObjects.push(this.add.text(x + 17, y + 16, "⚑", { fontSize: "22px", color: "#ff563f" }).setOrigin(0.5));
      }
      if (tile.hasMine && (tile.isRevealed || tile.state === "cooledMine" || tile.state === "disabledMine")) {
        const symbol = tile.state === "cooledMine" ? "❄" : tile.state === "disabledMine" ? "⌾" : "✹";
        this.tileObjects.push(this.add.text(x + 16, y + 16, symbol, { fontSize: "20px", color: "#ffd2c2" }).setOrigin(0.5));
      }
      if (tile.state === "exit") {
        this.tileObjects.push(this.add.text(x + 16, y + 16, "▣", { fontSize: "22px", color: "#f5b83f" }).setOrigin(0.5));
      }
    }
  }

  private drawPlayer(): void {
    const x = BOARD_X + this.player.x * TILE_SIZE + TILE_SIZE / 2;
    const y = BOARD_Y + this.player.y * TILE_SIZE + TILE_SIZE / 2;
    this.tileObjects.push(drawPixelMiner(this, x, y).setScale(0.95));
  }

  private drawMonster(): void {
    if (!this.monster) {
      return;
    }
    const x = BOARD_X + this.monster.tileX * TILE_SIZE + TILE_SIZE / 2;
    const y = BOARD_Y + this.monster.tileY * TILE_SIZE + TILE_SIZE / 2;
    const body = this.add.circle(x, y + 3, 13, 0x65b83f).setStrokeStyle(2, 0x234914);
    const hpWidth = 28 * (this.monster.combatant.hp / this.monster.combatant.maxHp);
    const hp = this.add.rectangle(x - 14, y - 17, hpWidth, 4, COLORS.red).setOrigin(0, 0.5);
    this.tileObjects.push(body, hp);
  }

  private drawHud(): void {
    this.hudObjects.push(addHudBar(this, 82, 22, 132, this.player.hp, this.player.maxHp, COLORS.red, "HP"));
    this.hudObjects.push(addHudBar(this, 82, 48, 132, this.player.stamina, this.player.maxStamina, COLORS.green, "ST"));
    this.hudObjects.push(this.add.text(200, 26, `🪙 ${this.player.coins}`, { fontSize: "15px", color: COLORS.text }).setOrigin(0.5));
    this.hudObjects.push(
      this.add
        .text(285, 26, `🎒 ${getUsedCapacity(this.inventory)}/${this.inventory.capacity}`, { fontSize: "15px", color: COLORS.text })
        .setOrigin(0.5)
    );
    this.hudObjects.push(
      this.add
        .text(335, 58, `深度\n${this.player.depth}m`, { fontSize: "13px", color: COLORS.text, align: "center" })
        .setOrigin(0.5)
    );
    this.hudObjects.push(addButton(this, 360, 104, 44, 44, "☰", () => this.openMenu()));
  }

  private drawMessage(): void {
    const box = this.add.rectangle(195, 652, 298, 54, 0x14100b, 0.92).setStrokeStyle(2, COLORS.goldDark);
    const text = this.add
      .text(195, 652, this.message, {
        fontSize: "15px",
        color: COLORS.text,
        align: "center",
        wordWrap: { width: 270 }
      })
      .setOrigin(0.5);
    this.hudObjects.push(box, text);
  }

  private drawActions(): void {
    const actions: readonly [ActionMode, string, string][] = [
      ["mine", "⛏\nツルハシ", "∞"],
      ["cool", "❄\n冷却", String(this.inventory.coolants)],
      ["disable", "⚿\n解除", String(this.inventory.disablers)],
      ["map", "□\n地図", String(this.inventory.maps)],
      ["bag", "🎒\nバッグ", `${getUsedCapacity(this.inventory)}/${this.inventory.capacity}`]
    ];
    actions.forEach(([mode, label, count], index) => {
      const x = 43 + index * 76;
      const fill = this.mode === mode ? COLORS.goldDark : COLORS.panelLight;
      this.hudObjects.push(
        addButton(this, x, 772, 66, 82, `${label}\n${count}`, () => {
          this.mode = mode;
          this.message = mode === "bag" ? `バッグ ${getUsedCapacity(this.inventory)}/${this.inventory.capacity}` : `${label.replace("\n", "")}を選択`;
          this.render();
        }, fill)
      );
    });
  }

  private handleTileTap(tile: Tile): void {
    if (this.failed || this.cleared) {
      return;
    }
    if (this.tryAttackMonster(tile)) {
      this.render();
      return;
    }
    if (this.mode === "cool") {
      const result = coolMine(this.field, this.inventory, tile);
      this.field = result.field;
      this.inventory = result.inventory;
      this.message = result.message;
      this.render();
      return;
    }
    if (this.mode === "disable") {
      const result = disableMine(this.field, this.inventory, tile);
      this.field = result.field;
      this.inventory = result.inventory;
      this.message = result.message;
      this.render();
      return;
    }
    if (tile.isWalkable) {
      this.player = tryMove(this.player, tile);
      this.message = this.player.x === tile.x && this.player.y === tile.y ? "移動した" : "隣の床へ移動できる";
      this.render();
      return;
    }
    if (tile.state === "exit") {
      if (Math.abs(this.player.x - tile.x) + Math.abs(this.player.y - tile.y) === 1) {
        this.cleared = true;
        this.message = "出口に到達した!";
      } else {
        this.message = "出口へ近づこう";
      }
      this.render();
      return;
    }
    const result = mineTile(this.field, this.player, this.inventory, tile, String(Date.now()));
    this.field = result.field;
    this.player = result.player;
    this.inventory = result.inventory;
    this.message = result.gainedItemId ? `${getItemName(result.gainedItemId)} x${result.gainedAmount} を手に入れた` : result.message;
    if (this.player.hp <= 0) {
      this.failed = true;
      this.message = "探索失敗...";
    }
    this.render();
  }

  private handleFlag(tile: Tile): void {
    this.field = toggleFlag(this.field, tile);
    this.message = tile.mark === "flag" ? "フラグを外した" : "地雷候補にマークした";
    this.render();
  }

  private tryAttackMonster(tile: Tile): boolean {
    if (!this.monster || tile.x !== this.monster.tileX || tile.y !== this.monster.tileY) {
      return false;
    }
    if (Math.abs(this.player.x - tile.x) + Math.abs(this.player.y - tile.y) !== 1) {
      this.message = "敵へ近づこう";
      return true;
    }
    const monsterDefinition = getMonster("monster.slime");
    const result = attackMonster(this.player, monsterDefinition, this.monster.combatant);
    this.player = result.player;
    this.message = result.message;
    if (result.defeated) {
      const drop = rollWeightedDrop(monsterDefinition.drops, `${this.field.seed}:slime`);
      if (drop) {
        const addResult = addItem(this.inventory, drop.itemId, drop.amount);
        this.inventory = addResult.inventory;
        this.message = addResult.added ? `${getItemName(drop.itemId)} x${drop.amount} を手に入れた` : "バッグがいっぱいだ";
      }
      this.monster = undefined;
      const tileAtMonster = getTile(this.field, tile.x, tile.y);
      if (tileAtMonster) {
        this.field = replaceTile(this.field, { ...tileAtMonster, state: "revealedFloor", isRevealed: true, isWalkable: true });
      }
    } else {
      this.monster = { ...this.monster, combatant: result.monster };
      this.player = {
        ...this.player,
        hp: Math.max(0, this.player.hp - Math.max(1, monsterDefinition.attack - this.player.defense))
      };
      if (this.player.hp <= 0) {
        this.failed = true;
        this.message = "探索失敗...";
      }
    }
    return true;
  }

  private openMenu(): void {
    this.clearObjects(this.hudObjects);
    this.drawHud();
    const overlay = this.add.rectangle(195, 422, 390, 844, 0x000000, 0.58);
    const panel = this.add.rectangle(195, 420, 270, 360, COLORS.panel, 0.98).setStrokeStyle(2, COLORS.goldDark);
    this.hudObjects.push(overlay, panel);
    this.hudObjects.push(this.add.text(195, 285, "メニュー", { fontSize: "24px", color: COLORS.text, fontStyle: "bold" }).setOrigin(0.5));
    this.hudObjects.push(addButton(this, 195, 345, 210, 48, "▶ つづける", () => this.render()));
    this.hudObjects.push(addButton(this, 195, 405, 210, 48, "⌂ 拠点に戻る", () => this.scene.start("HomeScene")));
    this.hudObjects.push(addButton(this, 195, 465, 210, 48, "🎒 道具", () => undefined));
    this.hudObjects.push(addButton(this, 195, 525, 210, 48, "⚙ 設定", () => this.scene.start("SettingsScene")));
    this.hudObjects.push(addButton(this, 195, 585, 210, 48, "⚑ あきらめる", () => {
      this.failed = true;
      this.render();
    }));
  }

  private getTileColor(tile: Tile): number {
    if (tile.isRevealed) {
      return 0x3a3024;
    }
    if (tile.state === "cooledMine") {
      return 0x2d5f85;
    }
    if (tile.state === "disabledMine") {
      return 0x6a5d3a;
    }
    if (tile.state === "exit") {
      return 0x45351d;
    }
    return tile.hasMine ? 0x50463c : 0x5d5a55;
  }

  private getNumberColor(value: number): string {
    if (value === 1) {
      return "#4da3ff";
    }
    if (value === 2) {
      return "#69b342";
    }
    if (value === 3) {
      return "#e05243";
    }
    if (value === 4) {
      return "#b677f0";
    }
    return "#f2a33c";
  }

  private clearObjects(objects: Phaser.GameObjects.GameObject[]): void {
    while (objects.length > 0) {
      objects.pop()?.destroy();
    }
  }
}
