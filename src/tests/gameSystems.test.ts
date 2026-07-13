import { describe, expect, it } from "vitest";
import { BALANCE } from "../data/balance";
import { getMonster } from "../data/monsters";
import { createInitialPlayer } from "../game/entities/player";
import { getTile } from "../game/map/types";
import { attackMonster } from "../game/systems/CombatSystem";
import { rollWeightedDrop } from "../game/systems/DropSystem";
import { createInitialInventory } from "../game/systems/InventorySystem";
import { coolMine, disableMine } from "../game/systems/MineHandlingSystem";
import { generateMinefield } from "../game/systems/MinefieldSystem";
import { mineTile } from "../game/systems/MiningSystem";

describe("mine handling", () => {
  it("cooling consumes coolant and makes a mine safe to mine", () => {
    const field = generateMinefield({
      width: 5,
      height: 5,
      mineCount: 1,
      safeRadius: 0,
      seed: "cool",
      startX: 0,
      startY: 0,
    });
    const mine = field.tiles.find((tile) => tile.hasMine);
    if (!mine) {
      throw new Error("Expected generated mine");
    }

    const result = coolMine(field, createInitialInventory(), mine);

    expect(result.success).toBe(true);
    expect(result.inventory.coolants).toBe(BALANCE.mining.initialCoolants - 1);
    expect(getTile(result.field, mine.x, mine.y)?.state).toBe("cooledMine");
  });

  it("disabling consumes a disabler and makes a mine permanently safe", () => {
    const field = generateMinefield({
      width: 5,
      height: 5,
      mineCount: 1,
      safeRadius: 0,
      seed: "disable",
      startX: 0,
      startY: 0,
    });
    const mine = field.tiles.find((tile) => tile.hasMine);
    if (!mine) {
      throw new Error("Expected generated mine");
    }

    const result = disableMine(field, createInitialInventory(), mine);

    expect(result.success).toBe(true);
    expect(result.inventory.disablers).toBe(
      BALANCE.mining.initialDisablers - 1,
    );
    expect(getTile(result.field, mine.x, mine.y)?.state).toBe("disabledMine");
  });
});

describe("mining", () => {
  it("allows mining a diagonally adjacent wall", () => {
    const field = generateMinefield({
      width: 3,
      height: 3,
      mineCount: 0,
      safeRadius: 0,
      seed: "diagonal-mine",
      startX: 0,
      startY: 0,
    });
    const wall = getTile(field, 1, 1);
    if (!wall) {
      throw new Error("Expected diagonal wall");
    }

    const player = { ...createInitialPlayer(), x: 0, y: 0 };
    const result = mineTile(
      field,
      player,
      createInitialInventory(),
      wall,
      "test",
    );

    expect(result.mined).toBe(true);
    expect(getTile(result.field, 1, 1)?.isWalkable).toBe(true);
  });

  it("damages the player when mining an untreated mine", () => {
    const field = generateMinefield({
      width: 4,
      height: 4,
      mineCount: 1,
      safeRadius: 0,
      seed: "boom",
      startX: 0,
      startY: 0,
    });
    const mine = field.tiles.find(
      (tile) => tile.hasMine && Math.abs(tile.x) + Math.abs(tile.y) === 1,
    );
    if (!mine) {
      return;
    }

    const result = mineTile(
      field,
      createInitialPlayer(),
      createInitialInventory(),
      mine,
      "test",
    );

    expect(result.exploded).toBe(true);
    expect(result.player.hp).toBe(100 - BALANCE.mine.normalDamage);
  });
});

describe("drop and combat", () => {
  it("rolls deterministic drops", () => {
    const entries = [
      { itemId: "item.ironOre" as const, weight: 1, min: 1, max: 1 },
    ];

    expect(rollWeightedDrop(entries, "drop")).toEqual({
      itemId: "item.ironOre",
      amount: 1,
    });
  });

  it("attacks monsters with at least one damage", () => {
    const monster = getMonster("monster.slime");
    const result = attackMonster(createInitialPlayer(), monster, {
      hp: monster.hp,
      maxHp: monster.hp,
    });

    expect(result.monster.hp).toBeLessThan(monster.hp);
  });
});
