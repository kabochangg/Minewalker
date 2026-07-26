import Phaser from "phaser";
import { getItemName } from "../../data/items";
import { RECIPES, type RecipeDefinition } from "../../data/recipes";
import { getGameState, setGameState } from "../state/GameState";
import { craftRecipe } from "../systems/CraftingSystem";
import { hasItems } from "../systems/InventorySystem";
import {
  addButton,
  addGameButton,
  addPanel,
  COLORS,
  drawGameIcon,
  type GameIcon,
} from "./uiHelpers";

export class CraftingScene extends Phaser.Scene {
  private message = "作成するレシピを選んでください";

  constructor() {
    super("CraftingScene");
  }

  create(): void {
    this.render();
  }

  private render(): void {
    const state = getGameState();
    this.children.removeAll();
    this.cameras.main.setBackgroundColor("#0b0f12");
    addPanel(this, 195, 420, 360, 800);
    this.add
      .text(195, 70, "クラフト", {
        fontSize: "27px",
        color: COLORS.text,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.add
      .text(195, 108, `${state.player.coins}C / ${this.message}`, {
        fontSize: "13px",
        color: COLORS.muted,
        align: "center",
        wordWrap: { width: 330 },
      })
      .setOrigin(0.5);

    RECIPES.forEach((recipe, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = column === 0 ? 105 : 285;
      const y = 170 + row * 108;
      const owned =
        recipe.output.kind === "equipment" &&
        state.equipment.owned.includes(recipe.output.equipmentId);
      const craftable =
        !owned &&
        state.player.coins >= recipe.cost.coins &&
        hasItems(state.inventory, recipe.cost.items);
      addGameButton(
        this,
        x,
        y,
        164,
        62,
        owned ? `${recipe.name}\n所持済み` : recipe.name,
        () => this.craft(recipe),
        { state: owned ? "disabled" : craftable ? "selected" : "normal" },
      );
      const icon: GameIcon =
        recipe.output.kind === "equipment"
          ? recipe.output.equipmentId.includes("armor")
            ? "armor"
            : recipe.output.equipmentId.includes("weapon")
              ? "weapon"
              : "pickaxe"
          : recipe.output.consumable === "coolants"
            ? "coolant"
            : recipe.output.consumable === "disablers"
              ? "disable"
              : recipe.output.consumable === "potions"
                ? "potion"
                : "map";
      drawGameIcon(
        this,
        x - 60,
        y,
        icon,
        craftable ? 0xffe08a : 0xd3b98b,
      ).setScale(0.7);
      this.add
        .text(x, y + 42, this.costLabel(recipe), {
          fontSize: "10px",
          color: COLORS.muted,
          align: "center",
          wordWrap: { width: 164 },
        })
        .setOrigin(0.5);
    });

    addButton(this, 195, 790, 220, 54, "準備を終えて拠点へ", () =>
      this.scene.start("HomeScene"),
    );
  }

  private craft(recipe: RecipeDefinition): void {
    const result = craftRecipe(getGameState(), recipe);
    if (result.crafted) {
      setGameState(result.state);
    }
    this.message = result.message;
    this.render();
  }

  private costLabel(recipe: RecipeDefinition): string {
    const items = Object.entries(recipe.cost.items)
      .map(
        ([itemId, amount]) =>
          `${getItemName(itemId as Parameters<typeof getItemName>[0])}×${amount}`,
      )
      .join(" ");
    return `${recipe.cost.coins}C${items ? ` ${items}` : ""}`;
  }
}
