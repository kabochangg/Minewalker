# Minewalker v1.0.0

Minewalker is a smartphone portrait PWA game built around minesweeper-style deduction, mining, combat, crafting, territory expansion, and base progression.

## How to Play

1. Select Game Start, Continue or New Game, an exploration area, a difficulty, and a loadout.
2. Tap adjacent walls to mine; revealed numbers show mines in the surrounding eight tiles.
3. Long-press or use the danger action to mark suspected hazards. Marked walls cannot be mined accidentally.
4. Dispose of marked hazards, collect materials, defeat monsters, and claim checkpoints to expand your territory.
5. Walking is free; running and actions consume stamina. Disposal tools lose durability and can be repaired or upgraded at the base.
6. Defeat leaves equipped gear and half of run-acquired materials at the death position. Resume the dungeon and recover the cache.

## Current Implementation

- Vite + TypeScript + Phaser 3 PWA.
- PWA manifest and Service Worker generation through `vite-plugin-pwa`.
- Playable loop:
  - Title -> Area Select -> Loadout -> Exploration -> Result -> Home.
  - 8-neighbor minesweeper numbers.
  - Mining, movement, flagging, cooling, disabling, untreated mine explosions.
  - Processed mines and walls drop materials.
  - Monsters, drops, result rewards, EXP, coins, and save persistence.
- Phase 2 meta progression:
  - Versioned persistent save v3 and interrupted-run save v2.
  - Deterministic persistent v2→v3 and run v1→v2 migration, backup fallback, and old-key retention.
  - Write-ahead journal for atomic checkpoint, defeat, and death-cache recovery updates.
  - Player, inventory, equipment, base upgrades, unlocked areas, collection, settings, and statistics.
  - Home upgrade actions, crafting entry, bag summary, settings persistence.
- Phase 3 content expansion:
  - 4 areas, 6 monsters including a boss, 22 materials, 15 equipment items, and 10 recipes.
  - Data-driven area unlock conditions and collection screen.
- Phase 4 quality work:
  - First-run tutorial.
  - Long-press flagging and explicit action modes.
  - Mobile portrait E2E smoke coverage.
  - Phaser vendor chunk split for production builds.
  - Production pixel-art player, monsters, themed tiles, state markers, and PWA PNG icons.
- Release completion:
  - Eight-direction virtual joystick with diagonal corner blocking and camera follow.
  - Selectable equipment and recipe crafting.
  - Paged bag management with protected important items.
  - Separate validated interrupted-run save and resume flow.
  - Lightweight action effects, generated audio cues, vibration, and reduced-motion support.
  - PWA update/offline notices and complete mobile E2E coverage.
  - Easy, normal, and hard deterministic dungeon generation with 32-attempt validation.
  - Explosive, poison, gas, and rockfall hazard definitions with dynamic surrounding counts.
  - Checkpoint objectives, connected-territory expansion, persistent death caches, running stamina, and tool durability.
  - Touch joystick, touch actions, and configurable keyboard controls.
- Graphic design refresh:
  - Shared warm cave design tokens, outlined panels, five-state buttons, resource bars, and code-drawn icons.
  - Deterministic area-specific wall variants with no guide-magenta seams, lantern lighting, dim unexplored terrain, and readable numbered floors.
  - Existing player and monster PNGs enhanced with outlines, ground shadows, eight-direction facing, idle/movement motion, reveal effects, and contextual HP bars.
  - Code-drawn title tunnel, home workshop, area thumbnails, inventory/crafting glyphs, collection silhouettes, settings toggles, and result animation.
  - Reduced-motion-aware particles and feedback for mining, cooling, disabling, hits, healing, and item rewards.
  - Visual baselines for Title, Home, Area Select, Exploration, and Result at 320×844, 390×844, and 430×932.

## Controls

- Touch joystick or WASD/arrow keys: move in eight directions.
- Run button or configured run key: run while consuming stamina.
- Tap a neighboring wall: use the selected action.
- Long-press a wall or select Danger: toggle the danger mark.
- Mine: break an unmarked wall.
- Cool/Dispose: safely process a marked hazard; false disposal consumes stamina but not tool durability.
- Menu: continue, return home, inventory, settings, or abandon the run.

Settings persist volume, vibration, reduced motion, text size, input mode, run behavior, mark behavior, and keyboard bindings.

## Save and recovery

- Persistent progression: `minewalker.save.v3`
- Interrupted exploration: `minewalker.run.v2`
- Atomic operation journal: `minewalker.tx.v1`
- Primary data and backup are validated independently.
- A confirmed New Game deletes progression, interrupted exploration, territory, and death caches while preserving settings and input preferences.

## Commands

```bash
npm install
npm run dev
npm run format
npm run lint
npm run test
npm run build
npm run e2e
```

`npm run test` includes deterministic migration/transaction tests, a 1,800-state play-time-equivalent soak, and 10,000 generated dungeons across all difficulties.

## Cloudflare Pages

- Build command: `npm run build`
- Output directory: `dist`
- Recommended preset: Vite
- Recommended Node.js version: 20 or newer

The production project is `minewalker`, connected to the GitHub `main` branch. Cloudflare Pages automatically deploys successful pushes to `main`.

## Privacy and Terms

- Save data and settings are stored only in the browser on the current device using local storage.
- The game does not transmit save data, use analytics, require accounts, or process payments.
- Clearing browser storage removes local progress. The built-in backup is also device-local.
- Network and device costs remain the user's responsibility.
- See [LEGAL.md](LEGAL.md) for the complete terms and privacy policy.

## Optional Future Enhancements

- Expanded character animation frames and equipment appearance variants.
- Area music, longer effect sets, a custom domain, and optional cloud save.
