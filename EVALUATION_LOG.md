# Minewalker Evaluation Log

## 2026-07-25 dungeon-expansion implementation

### Implemented

- Added serializable component state, ExplorationState v2, command/event contracts, and an application coordinator.
- Added persistent SaveData v3 and interrupted-run v2 migrations with backup fallback and retained legacy keys.
- Added a write-ahead transaction journal with roll-forward recovery for checkpoint, defeat, and cache recovery.
- Added four hazard definitions, dynamic adjacent counts, protected danger marks, exact false-disposal costs, tool durability, repair, and upgrades.
- Added checkpoint objectives, movement-equivalent territory flood fill, atomic claiming, and persistent territory summaries.
- Added deterministic death-cache IDs, per-item ceil splitting, respawn, multiple caches, capacity-safe atomic recovery, and map/result markers.
- Added easy/normal/hard deterministic generation, staged attempt seeds, rooms, hazards, chests, monsters, checkpoints, and dungeon validation.
- Added Game Start submenu, Continue/New Game, preference-preserving reset, input profiles, PWA install/update/defer state, and save-before-update.

### Automated results

- `npm run format`: passed.
- `npm run lint`: passed.
- `npx tsc --noEmit`: passed.
- `npm run test`: 109 tests passed in 25 files.
- 1,800-state play-time-equivalent minefield soak: passed.
- 10,000 generated dungeons across three difficulties: passed.
- `npm run build`: passed; manifest, Service Worker, and 22 precache entries generated.
- `npm run e2e`: 51 tests passed across 320×844, 390×844, and 430×932.
- Production offline reload and save preference persistence: passed.

### Visual review

- Reviewed generated 390×844-equivalent Exploration and Area Select captures.
- HUD, numbers, terrain, player, difficulty, and action controls remain visible without clipping.
- The renderer maintains pixel-art scaling and fixed UI over the moving world camera.

## 2026-07-13 release-candidate work

### Implemented

- Confirmed the eight-direction joystick, diagonal corner blocking, monster occupancy checks, 48px display tiles, and following world camera.
- Added owned-equipment switching on the loadout screen.
- Added selectable recipe crafting and a paged bag-management screen.
- Added protected important items and ordinary-item discard actions.
- Added separately versioned interrupted-run save, backup, validation, resume, and clearing at ResultScene.
- Added a deterministic E2E-only exploration scenario. It is excluded from normal production builds.
- Added a complete E2E loop for wall mining, mine cooling, treated-mine mining, item gain, exit, result, and return home.

### Automated results

- `npm run lint`: passed.
- `npm run test`: 29 tests passed, including 1,800 consecutive seeded board validations as a 30-minute-equivalent soak.
- `npm run build`: passed; manifest and service worker generated.
- `npm run e2e`: 18 tests passed across 320px, 390px, and 428px mobile projects.
- Offline production-shell reload: passed in Playwright.
- `npm audit`: 0 vulnerabilities.
- Lighthouse: Performance 64, Accessibility 100, Best Practices 100, SEO 91. Critical loading CSS, robots.txt, llms.txt, and source maps were added after this measurement.

### Remaining release checks

- Visual QA after final asset integration.
- PWA installation and real-device Safari/Chrome checks.
- Physical-device touch, heat, and battery observation during an extended playthrough.
- Cloudflare Pages production deployment and public URL verification.
