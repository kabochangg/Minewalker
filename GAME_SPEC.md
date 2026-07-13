# Minewalker Game Specification

## 1. Core loop

Minewalker is a portrait mobile PWA that combines minesweeper deduction, mining, combat, collection, and base progression.

1. Choose one of four mining areas.
2. Select owned equipment and consumables.
3. Read the eight-neighbor mine numbers and mine adjacent walls.
4. Flag, cool, or disable suspected mines.
5. Defeat monsters, collect materials, and reach the exit.
6. Receive EXP and coins, then craft equipment and upgrade the base.

## 2. Board rules

- The board is an 11 × 16 logical grid.
- The start and its configured safe radius never contain mines.
- Every revealed number equals the mine count in its surrounding eight cells.
- Movement and interaction support all eight adjacent directions.
- Diagonal movement is blocked when either orthogonal corner is blocked.
- Unprocessed mines explode when mined. Cooled or disabled mines are safe and provide treated-mine drops.
- The exit completes the run when interacted with from an adjacent cell.

## 3. Controls

- Use the lower-left virtual joystick for continuous eight-direction movement.
- Tap an adjacent wall or monster to interact with it.
- Long-press an adjacent wall to toggle a flag.
- Select mining, cooling, disabling, healing, or bag mode from the lower action bar.
- The world camera follows the player; the HUD and action bar remain fixed.

## 4. Exploration

- Player resources: HP, stamina, attack, defense, coins, and bag capacity.
- Mining consumes stamina.
- Monsters occupy grid cells and can be attacked from adjacent cells.
- A defeated monster can drop an area-specific material.
- A run succeeds at the exit and fails at 0 HP or when abandoned.
- Active runs are saved separately from permanent progression and can be resumed.

## 5. Meta progression

- Four areas: Beginner Mine, Crystal Cave, Volcano Mine, and Ancient Site.
- Six monsters including Mine King as the boss.
- 22 materials, 15 equipment definitions, and 10 recipes.
- Equipment slots: pickaxe, weapon, and armor.
- Upgrade tracks: base, player, weapon bench, and armor bench.
- Versioned permanent save data uses v2 with v1 migration and backup recovery.

## 6. Screens

- BootScene
- PreloadScene
- TitleScene
- HomeScene
- AreaSelectScene
- LoadoutScene
- ExplorationScene
- ResultScene
- CraftingScene
- InventoryScene
- CollectionScene
- SettingsScene

## 7. Release requirements

- Portrait layouts support widths from 320px through 430px.
- Production build generates an installable manifest and offline service worker.
- Unit tests cover board generation, mine handling, movement, combat, drops, progression, and save migration.
- E2E covers the complete title-to-exploration flow and a full mining-to-result loop at three mobile widths.
- No known progression-blocking defects may remain at release.
