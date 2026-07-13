# Minewalker Usability Standard

## Target devices

- Primary viewport: 390 × 844.
- Supported widths: 320–430px.
- Portrait orientation with safe-area padding.
- Touch targets are at least 44px.

## Exploration controls

- The lower-left virtual joystick supports eight directions and continuous hold movement.
- Sliding while held changes direction without requiring a second touch.
- A dead zone prevents accidental movement.
- Diagonal movement cannot pass through blocked corners or occupied monster cells.
- Tapping and long-pressing use the same world tile hit target; long-press toggles a flag.
- Action buttons remain reachable by the right thumb while the left thumb holds the joystick.

## Readability

- HP uses red and stamina uses green, with labels and values so color is not the only signal.
- Mine numbers use blue, green, red, purple, and orange while retaining numeric glyphs.
- Player, monster, mine state, flag, and exit remain distinguishable at 320px width.
- The player stays near the world-camera center while HUD elements remain fixed.
- Reduced-motion and large-text settings persist across reloads.

## Acceptance checks

1. Continuous joystick movement works at 320, 390, and 428px widths.
2. All eight directions map to the intended neighboring cell.
3. Blocked diagonal corners cannot be crossed.
4. Mining, cooling, disabling, healing, and bag actions remain tappable.
5. A complete run can reach ResultScene and return to HomeScene.
6. Settings and permanent save data survive reload.
7. An interrupted exploration reloads from the separate run save.
8. The production shell starts while offline after its first online load.

## Manual verification

- Test iPhone Safari and Android Chrome in portrait orientation.
- Confirm safe-area behavior, PWA installation, touch reachability, and 30-minute stability.
- Check all major screens at 320 × 568, 390 × 844, and 430 × 932.
