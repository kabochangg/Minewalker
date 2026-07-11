# Minewalker

Minewalker is a smartphone portrait PWA game prototype built around minesweeper-style deduction, mining, mine handling, simple combat, drops, and base progression.

## Current Implementation

- Vite + TypeScript + Phaser 3 project scaffold.
- PWA manifest and Service Worker configuration through `vite-plugin-pwa`.
- Playable Phase 1 vertical slice:
  - Title → Area Select → Loadout → Exploration → Result/Home.
  - Beginner mine board with seeded mine generation.
  - 8-neighbor mine numbers.
  - Mining, flagging, cooling, disabling, untreated mine explosions.
  - Placeholder item drops and one slime monster.
  - Mobile portrait layout based on 390 × 844.
- Unit tests for board generation, mine handling, drops, combat, and save validation.
- Playwright mobile smoke tests.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run test
npm run build
npm run e2e
```

## Notes

The current visuals are Phaser-drawn placeholder pixel shapes. Production-ready transparent PNG sprites, tiles, UI, effects, and PWA PNG icons still need to be created according to `ART_ASSET_SPEC.md`.

The existing `.git/` directory in this workspace is empty, so Git commands may fail until the repository is initialized or restored.
