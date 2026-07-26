import Phaser from "phaser";
import { getItemName, type ItemId } from "../../data/items";
import type { MonsterId } from "../../data/monsters";
import { clearRun } from "../../save/RunSaveSystem";
import { applyExplorationReward, getGameState } from "../state/GameState";
import type { InventoryState } from "../systems/InventorySystem";
import { getNextUnlockHint } from "../systems/ProgressionSystem";
import { addButton, addPanel, COLORS } from "./uiHelpers";

interface ResultSceneData {
  readonly success?: boolean;
  readonly depth?: number;
  readonly inventory?: InventoryState;
  readonly defeatedMonsters?: readonly MonsterId[];
  readonly bossDefeated?: boolean;
}

export class ResultScene extends Phaser.Scene {
  constructor() {
    super("ResultScene");
  }

  create(data: ResultSceneData): void {
    if (data.success) clearRun();
    const stateBefore = getGameState();
    const success = data.success ?? false;
    const depth = data.depth ?? 0;
    const inventory = data.inventory ?? stateBefore.inventory;
    const defeatedMonsters = data.defeatedMonsters ?? [];
    const stateAfter = applyExplorationReward({
      success,
      depth,
      inventory,
      defeatedMonsters,
      bossDefeated: data.bossDefeated ?? false,
    });

    this.cameras.main.setBackgroundColor("#0b0f12");
    addPanel(this, 195, 420, 350, 760);
    this.add
      .text(195, 112, success ? "探索成功" : "探索失敗", {
        fontSize: "30px",
        color: success ? "#f5b83f" : "#e05243",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    const crest = this.add.graphics();
    crest.lineStyle(3, success ? 0xffd34d : 0xff684f, 0.9);
    crest.strokeCircle(195, 112, 62);
    if (success) {
      for (const offset of [-72, 72]) {
        const star = drawResultStar(this, 195 + offset, 112, 0xffe08a);
        if (!stateBefore.settings.reducedMotion) {
          this.tweens.add({
            targets: star,
            angle: 360,
            duration: 1200,
            repeat: -1,
          });
        }
      }
    }
    this.add
      .text(195, 170, `到達深度 ${depth}m`, {
        fontSize: "20px",
        color: COLORS.text,
      })
      .setOrigin(0.5);
    this.add
      .text(
        195,
        204,
        `Lv.${stateBefore.player.level} → Lv.${stateAfter.player.level} / ${stateAfter.player.coins}C`,
        {
          fontSize: "16px",
          color: COLORS.muted,
        },
      )
      .setOrigin(0.5);
    this.add
      .text(195, 250, success ? "持ち帰る素材" : "今回の回収対象", {
        fontSize: "18px",
        color: COLORS.muted,
      })
      .setOrigin(0.5);

    const gained = (
      Object.entries(inventory.items) as [ItemId, number][]
    ).filter(([, amount]) => amount > 0);
    if (gained.length === 0) {
      this.add
        .text(195, 310, "なし", { fontSize: "18px", color: COLORS.text })
        .setOrigin(0.5);
    } else {
      gained.slice(0, 7).forEach(([itemId, amount], index) => {
        const line = this.add
          .text(195, 302 + index * 32, `${getItemName(itemId)} x${amount}`, {
            fontSize: "16px",
            color: COLORS.text,
          })
          .setOrigin(0.5);
        if (!stateBefore.settings.reducedMotion) {
          line.setAlpha(0).setX(180);
          this.tweens.add({
            targets: line,
            alpha: 1,
            x: 195,
            duration: 180,
            delay: index * 90,
          });
        }
      });
    }

    const monsterText =
      defeatedMonsters.length > 0
        ? `討伐 ${defeatedMonsters.length}体`
        : "討伐なし";
    this.add
      .text(195, 550, monsterText, { fontSize: "16px", color: COLORS.muted })
      .setOrigin(0.5);
    const claimedTiles = Object.values(stateAfter.territories).reduce(
      (sum, territory) => sum + territory.tileKeys.length,
      0,
    );
    if (success) {
      this.add
        .text(
          195,
          590,
          `自陣を${claimedTiles}マスまで確保しました\n次の探索へ進むか、拠点へ戻れます`,
          {
            fontSize: "13px",
            color: "#79d36b",
            align: "center",
          },
        )
        .setOrigin(0.5);
    }
    const latestCache = stateAfter.deathCaches.at(-1);
    if (!success && latestCache) {
      this.add
        .text(
          195,
          600,
          `死亡地点 (${latestCache.position.x}, ${latestCache.position.y})\n装備 ${latestCache.equipment.length}点 / 素材 ${Object.values(latestCache.items).reduce((sum, amount) => sum + (amount ?? 0), 0)}個\n同じ地点へ戻ると全量回収できます`,
          {
            fontSize: "13px",
            color: "#ffb59f",
            align: "center",
          },
        )
        .setOrigin(0.5);
    }
    this.add
      .text(
        195,
        658,
        success
          ? `次の目標: ${getNextUnlockHint(stateAfter)}`
          : "次の行動: 同じ探索先へ戻り、死亡地点の袋を回収",
        {
          fontSize: "13px",
          color: COLORS.text,
          align: "center",
          wordWrap: { width: 300 },
        },
      )
      .setOrigin(0.5);
    addButton(this, 118, 720, 150, 56, "拠点へ", () =>
      this.scene.start("HomeScene"),
    );
    addButton(
      this,
      275,
      720,
      150,
      56,
      success ? "続けて探索" : "回収へ戻る",
      () => this.scene.start("AreaSelectScene"),
      COLORS.green,
    );
  }
}

function drawResultStar(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  g.fillPoints(
    Array.from({ length: 10 }, (_, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI) / 5;
      const radius = index % 2 === 0 ? 9 : 4;
      return new Phaser.Geom.Point(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
      );
    }),
    true,
  );
  return scene.add.container(x, y, [g]);
}
