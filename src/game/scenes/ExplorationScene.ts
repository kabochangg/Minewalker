import Phaser from "phaser";
import { getSelectedAreaId } from "../../app/routeState";
import { getArea } from "../../data/areas";
import { getItemName } from "../../data/items";
import { getMonster, type MonsterId } from "../../data/monsters";
import { createInitialPlayer, type PlayerState } from "../entities/player";
import type { Minefield, Tile } from "../map/types";
import { getTile, replaceTile } from "../map/types";
import { getEquippedStats, getGameState } from "../state/GameState";
import { attackMonster, type CombatantState } from "../systems/CombatSystem";
import { rollWeightedDrop } from "../systems/DropSystem";
import {
  addItem,
  consumePotion,
  createEmptyItemBag,
  getUsedCapacity,
  type InventoryState
} from "../systems/InventorySystem";
import { coolMine, disableMine, toggleFlag } from "../systems/MineHandlingSystem";
import { generateMinefield } from "../systems/MinefieldSystem";
import { mineTile } from "../systems/MiningSystem";
import { tryMove } from "../systems/MovementSystem";
import { addButton, addHudBar, COLORS, drawPixelMiner } from "./uiHelpers";

type ActionMode = "mine" | "cool" | "disable" | "potion" | "bag";

interface MonsterRuntime {
  readonly id: MonsterId;
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
  private message = "数字を頼りに安全な壁を掘り進めよう";
  private monsters: MonsterRuntime[] = [];
  private defeatedMonsters: MonsterId[] = [];
  private bossDefeated = false;
  private cleared = false;
  private failed = false;
  private resultQueued = false;
  private readonly tileObjects: Phaser.GameObjects.GameObject[] = [];
  private readonly hudObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super("ExplorationScene");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#0b0f12");
    this.field = this.createScenarioField();
    this.player = this.createPlayer();
    this.inventory = this.createRunInventory();
    this.monsters = this.createMonsters();
    this.render();
  }

  private createScenarioField(): Minefield {
    const area = getArea(getSelectedAreaId());
    const width = 11;
    const height = 16;
    const mineCount = Math.floor(width * height * area.mineDensity);
    const generated = generateMinefield({
      width,
      height,
      mineCount,
      safeRadius: 1,
      seed: `minewalker:${area.id}:${Date.now()}`,
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

  private createPlayer(): PlayerState {
    const save = getGameState();
    const equipment = getEquippedStats(save);
    const initial = createInitialPlayer();
    return {
      ...initial,
      hp: save.player.hp,
      maxHp: save.player.maxHp,
      stamina: save.player.stamina,
      maxStamina: save.player.maxStamina,
      attack: save.player.attack + equipment.attack,
      defense: save.player.defense + equipment.defense,
      coins: save.player.coins,
      depth: 0
    };
  }

  private createRunInventory(): InventoryState {
    const save = getGameState();
    return {
      capacity: save.inventory.capacity,
      items: createEmptyItemBag(),
      coolants: save.inventory.coolants,
      disablers: save.inventory.disablers,
      potions: save.inventory.potions,
      maps: save.inventory.maps
    };
  }

  private createMonsters(): MonsterRuntime[] {
    const area = getArea(getSelectedAreaId());
    const spawns = [
      { tileX: 7, tileY: 5 },
      { tileX: 3, tileY: 11 }
    ];
    return area.monsterIds.slice(0, area.id === "area.ancientSite" ? 2 : 1).map((monsterId, index) => {
      const monster = getMonster(monsterId);
      const spawn = spawns[index] ?? spawns[0];
      return {
        id: monsterId,
        tileX: spawn.tileX,
        tileY: spawn.tileY,
        combatant: { hp: monster.hp, maxHp: monster.hp }
      };
    });
  }

  private render(): void {
    this.clearObjects(this.tileObjects);
    this.clearObjects(this.hudObjects);
    this.drawBackdrop();
    this.drawTiles();
    this.drawPlayer();
    this.drawMonsters();
    this.drawHud();
    this.drawMessage();
    this.drawActions();
    if ((this.cleared || this.failed) && !this.resultQueued) {
      this.resultQueued = true;
      this.time.delayedCall(600, () => {
        this.scene.start("ResultScene", {
          success: this.cleared,
          depth: this.player.depth,
          inventory: this.inventory,
          defeatedMonsters: this.defeatedMonsters,
          bossDefeated: this.bossDefeated
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
    graphics.fillStyle(this.getAreaGlow(), 0.13);
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
      rect.on("pointerup", (pointer: Phaser.Input.Pointer) => {
        if (pointer.getDuration() > 450) {
          this.handleFlag(tile);
          return;
        }
        this.handleTileTap(tile);
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
        this.tileObjects.push(this.add.text(x + 17, y + 16, "⚑", { fontSize: "20px", color: "#ff563f" }).setOrigin(0.5));
      }
      if (tile.hasMine && (tile.isRevealed || tile.state === "cooledMine" || tile.state === "disabledMine")) {
        const symbol = tile.state === "cooledMine" ? "❄" : tile.state === "disabledMine" ? "✓" : "●";
        this.tileObjects.push(this.add.text(x + 16, y + 16, symbol, { fontSize: "18px", color: "#ffd2c2" }).setOrigin(0.5));
      }
      if (tile.state === "exit") {
        this.tileObjects.push(this.add.text(x + 16, y + 16, "▣", { fontSize: "21px", color: "#f5b83f" }).setOrigin(0.5));
      }
    }
  }

  private drawPlayer(): void {
    const x = BOARD_X + this.player.x * TILE_SIZE + TILE_SIZE / 2;
    const y = BOARD_Y + this.player.y * TILE_SIZE + TILE_SIZE / 2;
    this.tileObjects.push(drawPixelMiner(this, x, y).setScale(0.95));
  }

  private drawMonsters(): void {
    for (const monster of this.monsters) {
      const x = BOARD_X + monster.tileX * TILE_SIZE + TILE_SIZE / 2;
      const y = BOARD_Y + monster.tileY * TILE_SIZE + TILE_SIZE / 2;
      const definition = getMonster(monster.id);
      const body = this.add
        .circle(x, y + 3, definition.boss ? 16 : 13, definition.boss ? 0xa84fd4 : 0x65b83f)
        .setStrokeStyle(2, 0x234914);
      const hpWidth = 28 * (monster.combatant.hp / monster.combatant.maxHp);
      const hp = this.add.rectangle(x - 14, y - 17, hpWidth, 4, COLORS.red).setOrigin(0, 0.5);
      this.tileObjects.push(body, hp);
    }
  }

  private drawHud(): void {
    const area = getArea(getSelectedAreaId());
    this.hudObjects.push(addHudBar(this, 82, 22, 132, this.player.hp, this.player.maxHp, COLORS.red, "HP"));
    this.hudObjects.push(addHudBar(this, 82, 48, 132, this.player.stamina, this.player.maxStamina, COLORS.green, "ST"));
    this.hudObjects.push(this.add.text(205, 26, `${this.player.coins}C`, { fontSize: "15px", color: COLORS.text }).setOrigin(0.5));
    this.hudObjects.push(
      this.add
        .text(288, 26, `袋 ${getUsedCapacity(this.inventory)}/${this.inventory.capacity}`, { fontSize: "15px", color: COLORS.text })
        .setOrigin(0.5)
    );
    this.hudObjects.push(
      this.add
        .text(335, 58, `${area.name}\n${this.player.depth}m`, { fontSize: "12px", color: COLORS.text, align: "center" })
        .setOrigin(0.5)
    );
    this.hudObjects.push(addButton(this, 360, 104, 44, 44, "≡", () => this.openMenu()));
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
      ["mine", "採掘", "-"],
      ["cool", "冷却", String(this.inventory.coolants)],
      ["disable", "解除", String(this.inventory.disablers)],
      ["potion", "回復", String(this.inventory.potions)],
      ["bag", "バッグ", `${getUsedCapacity(this.inventory)}/${this.inventory.capacity}`]
    ];
    actions.forEach(([mode, label, count], index) => {
      const x = 43 + index * 76;
      const fill = this.mode === mode ? COLORS.goldDark : COLORS.panelLight;
      this.hudObjects.push(
        addButton(this, x, 772, 66, 82, `${label}\n${count}`, () => {
          this.mode = mode;
          if (mode === "potion") {
            this.usePotion();
            return;
          }
          this.message = mode === "bag" ? `バッグ ${getUsedCapacity(this.inventory)}/${this.inventory.capacity}` : `${label}モード`;
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
      const next = tryMove(this.player, tile);
      this.player = { ...next, depth: Math.max(next.depth, tile.y) };
      this.message = this.player.x === tile.x && this.player.y === tile.y ? "移動しました" : "隣の床へ移動できます";
      this.render();
      return;
    }
    if (tile.state === "exit") {
      if (Math.abs(this.player.x - tile.x) + Math.abs(this.player.y - tile.y) === 1) {
        this.cleared = true;
        this.message = "出口に到達しました";
      } else {
        this.message = "出口へ近づこう";
      }
      this.render();
      return;
    }
    const result = mineTile(this.field, this.player, this.inventory, tile, String(Date.now()));
    this.field = result.field;
    this.player = { ...result.player, depth: Math.max(result.player.depth, tile.y) };
    this.inventory = result.inventory;
    this.message = result.gainedItemId ? `${getItemName(result.gainedItemId)} x${result.gainedAmount}を入手` : result.message;
    if (this.player.hp <= 0) {
      this.failed = true;
      this.message = "探索失敗...";
    }
    this.render();
  }

  private handleFlag(tile: Tile): void {
    this.field = toggleFlag(this.field, tile);
    this.message = tile.mark === "flag" ? "フラグを外しました" : "地雷候補にマークしました";
    this.render();
  }

  private tryAttackMonster(tile: Tile): boolean {
    const monster = this.monsters.find((candidate) => candidate.tileX === tile.x && candidate.tileY === tile.y);
    if (!monster) {
      return false;
    }
    if (Math.abs(this.player.x - tile.x) + Math.abs(this.player.y - tile.y) !== 1) {
      this.message = "敵へ近づこう";
      return true;
    }
    const definition = getMonster(monster.id);
    const result = attackMonster(this.player, definition, monster.combatant);
    this.player = result.player;
    this.message = result.message;
    if (result.defeated) {
      this.defeatedMonsters.push(monster.id);
      this.bossDefeated ||= definition.boss;
      const drop = rollWeightedDrop(definition.drops, `${this.field.seed}:${monster.id}`);
      if (drop) {
        const addResult = addItem(this.inventory, drop.itemId, drop.amount);
        this.inventory = addResult.inventory;
        this.message = addResult.added ? `${getItemName(drop.itemId)} x${drop.amount}を入手` : "バッグがいっぱいです";
      }
      this.monsters = this.monsters.filter((candidate) => candidate !== monster);
      const tileAtMonster = getTile(this.field, tile.x, tile.y);
      if (tileAtMonster) {
        this.field = replaceTile(this.field, { ...tileAtMonster, state: "revealedFloor", isRevealed: true, isWalkable: true });
      }
    } else {
      this.monsters = this.monsters.map((candidate) =>
        candidate === monster ? { ...candidate, combatant: result.monster } : candidate
      );
      this.player = {
        ...this.player,
        hp: Math.max(0, this.player.hp - Math.max(1, definition.attack - this.player.defense))
      };
      if (this.player.hp <= 0) {
        this.failed = true;
        this.message = "探索失敗...";
      }
    }
    return true;
  }

  private usePotion(): void {
    const nextInventory = consumePotion(this.inventory);
    if (!nextInventory) {
      this.message = "回復薬がありません";
      this.render();
      return;
    }
    this.inventory = nextInventory;
    this.player = { ...this.player, hp: Math.min(this.player.maxHp, this.player.hp + 35), actionState: "usingItem" };
    this.message = "HPを回復しました";
    this.render();
  }

  private openMenu(): void {
    this.clearObjects(this.hudObjects);
    this.drawHud();
    const overlay = this.add.rectangle(195, 422, 390, 844, 0x000000, 0.58);
    const panel = this.add.rectangle(195, 420, 270, 360, COLORS.panel, 0.98).setStrokeStyle(2, COLORS.goldDark);
    this.hudObjects.push(overlay, panel);
    this.hudObjects.push(this.add.text(195, 285, "メニュー", { fontSize: "24px", color: COLORS.text, fontStyle: "bold" }).setOrigin(0.5));
    this.hudObjects.push(addButton(this, 195, 345, 210, 48, "続ける", () => this.render()));
    this.hudObjects.push(addButton(this, 195, 405, 210, 48, "拠点へ戻る", () => this.scene.start("HomeScene")));
    this.hudObjects.push(addButton(this, 195, 465, 210, 48, `持ち物 ${getUsedCapacity(this.inventory)}/${this.inventory.capacity}`, () => undefined));
    this.hudObjects.push(addButton(this, 195, 525, 210, 48, "設定", () => this.scene.start("SettingsScene")));
    this.hudObjects.push(addButton(this, 195, 585, 210, 48, "あきらめる", () => {
      this.failed = true;
      this.render();
    }));
  }

  private getAreaGlow(): number {
    const area = getArea(getSelectedAreaId());
    if (area.theme === "crystalCave") {
      return 0x3c92d8;
    }
    if (area.theme === "volcanoMine") {
      return 0xe05a32;
    }
    if (area.theme === "ancientSite") {
      return 0x9b59c9;
    }
    return 0xffb13b;
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
