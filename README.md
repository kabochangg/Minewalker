# Minewalker v0.2.0 Public Beta

Minewalker is a public-beta smartphone portrait PWA game built around minesweeper-style deduction, mining, combat, crafting, and base progression.

## How to Play

1. Select Play, an exploration area, and a loadout.
2. Tap adjacent walls to mine; revealed numbers show mines in the surrounding eight tiles.
3. Long-press to flag suspected mines. Use coolant or a disabler before mining a mine tile.
4. Collect materials, defeat adjacent monsters, and reach the exit.
5. Return home to craft equipment and upgrade the base.

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
  - Versioned v2 save data with v1 migration and backup fallback.
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

## Commands

```bash
npm install
npm run dev
npm run lint
npm run test
npm run build
npm run e2e
```

## Cloudflare Pages

- Build command: `npm run build`
- Output directory: `dist`
- Recommended preset: Vite
- Recommended Node.js version: 20 or newer

The production project is `minewalker`, connected to the GitHub `main` branch. The public URL is added here after the first authenticated deployment.

## Privacy and Beta Notice

- This is a public beta; balance and presentation may change.
- Save data and settings are stored only in the browser on the current device using local storage.
- The game does not transmit save data, use analytics, require accounts, or process payments.
- Clearing browser storage removes local progress. The built-in backup is also device-local.
- Network and device costs remain the user's responsibility.

## Known Beta Limitations

- Character animation frames, equipment appearance variants, audio, and the complete effect set are planned for a later release.
- A custom domain and cloud save are not included in v0.2.0.
