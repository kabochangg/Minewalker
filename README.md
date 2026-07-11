# Minewalker

Minewalker is a smartphone portrait PWA game built around minesweeper-style deduction, mining movement, mine cooling/disabling, simple combat, drops, crafting, and base progression.

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

## Notes

The current visuals are Phaser-drawn placeholder pixel shapes. Production-ready transparent PNG sprites, tiles, UI, effects, and PWA PNG icons still need to be created according to `ART_ASSET_SPEC.md`.
