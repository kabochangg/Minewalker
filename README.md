# Minewalker v1.0.0

Minewalker is a complete smartphone portrait PWA game built around minesweeper-style deduction, mining, combat, crafting, and base progression.

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
- Release completion:
  - Eight-direction virtual joystick with diagonal corner blocking and camera follow.
  - Selectable equipment and recipe crafting.
  - Paged bag management with protected important items.
  - Separate validated interrupted-run save and resume flow.
  - Lightweight action effects, generated audio cues, vibration, and reduced-motion support.
  - PWA update/offline notices and complete mobile E2E coverage.
- Graphic design refresh:
  - Shared warm cave design tokens, outlined panels, five-state buttons, resource bars, and code-drawn icons.
  - Deterministic area-specific wall variants with no guide-magenta seams, lantern lighting, dim unexplored terrain, and readable numbered floors.
  - Existing player and monster PNGs enhanced with outlines, ground shadows, eight-direction facing, idle/movement motion, reveal effects, and contextual HP bars.
  - Code-drawn title tunnel, home workshop, area thumbnails, inventory/crafting glyphs, collection silhouettes, settings toggles, and result animation.
  - Reduced-motion-aware particles and feedback for mining, cooling, disabling, hits, healing, and item rewards.
  - Visual baselines for Title, Home, Area Select, Exploration, and Result at 320px, 390px, and 428px widths.

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
