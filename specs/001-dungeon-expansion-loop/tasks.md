---
description: "ダンジョン領域拡張ループの依存順実装タスク"
---

# Tasks: ダンジョン領域拡張ループ

**Input**: Design documents from `/specs/001-dungeon-expansion-loop/`

**Prerequisites**: plan.md、spec.md、research.md、data-model.md、contracts/、quickstart.md

**Tests**: Minewalker憲章に従い、全機能変更へユニットテストを必須とする。
利用者経路、画面遷移、PWA、セーブ再開の変更にはE2Eも追加する。

**Organization**: 共有基盤を完了した後、7つのユーザーストーリーを優先度順に
独立検証可能な単位として実装する。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 未完了タスクとファイル競合せず並行実行可能
- **[Story]**: 対応するユーザーストーリー
- 全タスクに具体的なファイルパスを記載する

## Phase 1: Setup (Shared Test Infrastructure)

**Purpose**: 既存プロジェクトへ、決定的な盤面・保存障害・E2E入力を再利用できる
テスト基盤を追加する。

- [x] T001 [P] Add deterministic exploration and dungeon fixture builders in `src/tests/fixtures/explorationFixtures.ts`
- [x] T002 [P] Add failure-injectable Storage test double for journal phase testing in `src/tests/fixtures/TransactionalMemoryStorage.ts`
- [x] T003 [P] Extract reusable canvas navigation, viewport, and input helpers in `tests/e2e/helpers/exploration.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 全ストーリーが共有する状態コンポーネント、コマンド、セーブ移行、
トランザクション、Coordinatorを先に完成させる。

**⚠️ CRITICAL**: このPhaseが完了するまでユーザーストーリー実装を開始しない。

### Foundational tests

- [x] T004 [P] Add validation tests for ExplorationState, component value ranges, stable IDs, and relationships in `src/tests/explorationState.test.ts`
- [x] T005 [P] Add v2→v3 persistent and v1→v2 run migration fixtures, idempotency, legacy-key retention, and backup fallback tests in `src/tests/save.test.ts`
- [x] T006 [P] Add write-ahead journal phase interruption, replay, duplicate-transaction, and corruption tests in `src/tests/saveTransaction.test.ts`
- [x] T007 [P] Add command ordering, System composition, pre-save visibility, and recoveryRequired tests in `src/tests/applicationCoordinator.test.ts`

### Foundational implementation

- [x] T008 [P] Define readonly player, inventory, dungeon, and exploration state components with Japanese TSDoc in `src/game/components/explorationComponents.ts`
- [x] T009 [P] Define HazardComponent, hazard states, effects, and stable ID types with Japanese TSDoc in `src/game/components/hazardComponents.ts`
- [x] T010 [P] Define CheckpointComponent, TerritoryState, DeathCache, and objective types with Japanese TSDoc in `src/game/components/progressionComponents.ts`
- [x] T011 [P] Define ToolConditionComponent and InputProfile types with Japanese TSDoc in `src/game/components/toolComponents.ts`
- [x] T012 Define ExplorationState v2, ExplorationCommand, DomainEvent, and SystemResult contracts in `src/game/state/ExplorationState.ts`
- [x] T013 [P] Add shared hazard and difficulty domain definitions in `src/data/hazards.ts` and `src/data/difficulties.ts`
- [x] T014 Implement SaveData v3 schema, deterministic v2 migration, validation, backup fallback, and old-key retention in `src/save/SaveSystem.ts`
- [x] T015 Implement RunSaveData v2 schema, exact v1 migration, dynamic number rebuild, and backup fallback in `src/save/RunSaveSystem.ts`
- [x] T016 Implement write-ahead journal prepare/write/replay/commit operations in `src/save/SaveTransactionSystem.ts`
- [x] T017 Implement command dispatch, ordered System composition, DomainEvent publication, and recoveryRequired handling in `src/game/application/ExplorationCoordinator.ts`
- [x] T018 Adapt global progression state to SaveData v3 without changing existing unlocked content in `src/game/state/GameState.ts`

**Checkpoint**: v2/v1データを安全に移行でき、共有状態とCoordinatorを単体検証できる。

---

## Phase 3: User Story 1 - 推理しながら探索範囲を広げる (Priority: P1) 🎯 Vertical Slice

**Goal**: 入口安全域から数字を読み、8方向移動と隣接壁破壊で新しい通路・部屋へ進める。

**Independent Test**: 固定小規模盤面で、安全な数字表示、壁破壊、8方向移動、
未探索侵入防止、斜め角抜け防止を確認する。

### Tests for User Story 1

- [x] T019 [P] [US1] Extend eight-direction, hidden-tile, occupied-tile, and diagonal-corner movement tests in `src/tests/movement.test.ts`
- [x] T020 [P] [US1] Add adjacent mining, non-mineable tile rejection, reveal propagation, and stamina boundary tests in `src/tests/gameSystems.test.ts`
- [x] T021 [P] [US1] Add camera follow, world bounds, zoom constraints, and world-to-screen tests in `src/tests/camera.test.ts`
- [x] T022 [P] [US1] Add dependency tests preventing Phaser imports from domain components and systems in `src/tests/architecture.test.ts`

### Implementation for User Story 1

- [x] T023 [P] [US1] Extend player runtime state with continuous/grid position and locomotion while preserving existing save behavior in `src/game/entities/player.ts`
- [x] T024 [US1] Update walkability, eight-direction movement, continuous sliding, and shared diagonal-corner rules in `src/game/systems/MovementSystem.ts`
- [x] T025 [P] [US1] Update adjacent wall mining and reveal visibility state transitions in `src/game/systems/MiningSystem.ts` and `src/game/systems/VisibilitySystem.ts`
- [x] T026 [P] [US1] Extend camera follow, viewport bounds, and coordinate conversion as pure calculations in `src/game/systems/CameraSystem.ts`
- [x] T027 [P] [US1] Extract tile, number, player, wall, room, and lighting rendering in `src/game/scenes/components/DungeonRendererComponent.ts`
- [x] T028 [P] [US1] Normalize joystick, tap, pointer, and keyboard movement into ExplorationCommand in `src/game/scenes/components/ExplorationInputComponent.ts`
- [ ] T029 [US1] Reduce ExplorationScene to lifecycle, component wiring, Coordinator dispatch, and navigation in `src/game/scenes/ExplorationScene.ts`
- [x] T030 [US1] Add title-to-fixed-exploration E2E coverage for movement, mining, numbers, hidden tiles, and diagonal blocking in `tests/e2e/vertical-slice.spec.ts`

**Checkpoint**: US1だけで、固定盤面を推理しながら安全に探索できる。

---

## Phase 4: User Story 2 - 危険箇所を印付けして安全に処理する (Priority: P1)

**Goal**: 数字から危険壁を推測し、危険マークで誤破壊を防ぎ、正解処理で高価値報酬を得る。

**Independent Test**: 危険物が既知の盤面でマーク切替、通常破壊保護、正解・誤処理、
道具消費、数字更新、決定的報酬を確認する。

### Tests for User Story 2

- [x] T031 [P] [US2] Add zero/corner/center/multiple/edge/disposed/triggered hazard count and Tile-Hazard one-to-one tests in `src/tests/hazard.test.ts`
- [x] T032 [P] [US2] Add deterministic wall, hazard, chest, monster, multiplier, and empty reward tests in `src/tests/drop.test.ts`
- [x] T033 [P] [US2] Add danger-mark toggle, marked-wall mining rejection, correct disposal, and false-disposal regression tests in `src/tests/gameSystems.test.ts`

### Implementation for User Story 2

- [x] T034 [P] [US2] Extend Tile and Minefield types for hazard IDs, danger marks, terrain, discovery, and dynamic adjacent counts in `src/game/map/types.ts`
- [x] T035 [P] [US2] Define explosive, poison, gas, and rockfall effects, tiers, and reward tables in `src/data/hazards.ts`
- [x] T036 [US2] Implement mark protection, disposal validation, trigger resolution, and local adjacent-count rebuild in `src/game/systems/HazardSystem.ts`
- [x] T037 [P] [US2] Extend deterministic reward selection for walls, hazards, chests, monsters, and difficulty multipliers in `src/game/systems/DropSystem.ts`
- [x] T038 [P] [US2] Create 44px+ mining, danger-mark, disposal, attack, and mode controls in `src/game/scenes/components/ActionBarComponent.ts`
- [x] T039 [US2] Wire hazard commands and events through Coordinator into map rendering and action feedback in `src/game/application/ExplorationCoordinator.ts` and `src/game/scenes/components/DungeonRendererComponent.ts`
- [x] T040 [US2] Add E2E coverage for mark protection, correct disposal, false disposal, reward, and number update in `tests/e2e/vertical-slice.spec.ts`

**Checkpoint**: US1+US2でMinewalker固有の推理・マーキング・安全処理ループが成立する。

---

## Phase 5: User Story 3 - 資源を管理して探索を継続する (Priority: P2)

**Goal**: HP、スタミナ、走行、道具耐久、素材を管理し、拠点で道具を修理・強化できる。

**Independent Test**: 各行動前後の値、時間回復、pause、道具破損、修理、強化、
素材回収、HUD同期を確認する。

### Tests for User Story 3

- [x] T041 [P] [US3] Add walk/run/action cost, active-time recovery, pause/background, clamp, and insufficient-stamina tests in `src/tests/stamina.test.ts`
- [x] T042 [P] [US3] Add correct-use, false-use, broken, repair, upgrade, and tier-requirement tests in `src/tests/tool.test.ts`
- [x] T043 [P] [US3] Add acquiredThisRun, capacity, pickup source, and non-negative inventory regression tests in `src/tests/gameSystems.test.ts`

### Implementation for User Story 3

- [x] T044 [P] [US3] Add stamina rates, action costs, tool durability, repair, and upgrade values in `src/data/balance.ts` and `src/data/equipment.ts`
- [x] T045 [P] [US3] Implement active-time stamina recovery and running cost without background progression in `src/game/systems/StaminaSystem.ts`
- [x] T046 [P] [US3] Implement tool durability, tier validation, breakage, repair, and upgrade transitions in `src/game/systems/ToolSystem.ts`
- [x] T047 [US3] Track run-acquired materials and apply stamina/tool results without negative values in `src/game/systems/InventorySystem.ts` and `src/game/entities/player.ts`
- [x] T048 [P] [US3] Create fixed HP, stamina, tool, durability, material, and locomotion HUD in `src/game/scenes/components/ExplorationHudComponent.ts`
- [x] T049 [US3] Add tool repair and upgrade actions with autosave to the base screen in `src/game/scenes/HomeScene.ts`
- [x] T050 [US3] Add E2E coverage for walking, running, stamina recovery, tool breakage, repair, and HUD synchronization in `tests/e2e/vertical-slice.spec.ts`

**Checkpoint**: US3を追加した探索で、資源枯渇と拠点回復の循環が成立する。

---

## Phase 6: User Story 4 - チェックポイントを確保して陣地を拡張する (Priority: P2)

**Goal**: 表示済み条件と安全経路を満たしてチェックポイントを確保し、
連結した開放範囲を永続的な自陣へ変える。

**Independent Test**: 到達、危険物数、素材数、ボス条件と、孤立島・斜め角を含む
接続判定を個別に確認する。

### Tests for User Story 4

- [x] T051 [P] [US4] Add objective combinations, progress, 8-neighbor connectivity, isolated islands, blocked diagonals, and idempotent claim tests in `src/tests/checkpoint.test.ts`
- [x] T052 [P] [US4] Add checkpoint claim journal interruption and replay tests in `src/tests/saveTransaction.test.ts`

### Implementation for User Story 4

- [x] T053 [P] [US4] Implement reach, disposal-count, material-count, boss, eligibility, and claim transitions in `src/game/systems/CheckpointSystem.ts`
- [x] T054 [P] [US4] Implement territory flood fill using movement-equivalent diagonal rules and stable tile keys in `src/game/systems/TerritorySystem.ts`
- [x] T055 [P] [US4] Add checkpoint IDs, objective definitions, final markers, and area-specific defaults in `src/data/areas.ts`
- [x] T056 [P] [US4] Create fixed objective progress, route status, and claim feedback UI in `src/game/scenes/components/ObjectivePanelComponent.ts`
- [x] T057 [US4] Persist claimed checkpoints and territory maps atomically in `src/game/state/GameState.ts` and `src/save/SaveTransactionSystem.ts`
- [x] T058 [US4] Wire checkpoint events, claim commands, map markers, and territory rendering into `src/game/application/ExplorationCoordinator.ts` and `src/game/scenes/ExplorationScene.ts`
- [x] T059 [US4] Show claimed territory and continue-or-return choices in `src/game/scenes/ResultScene.ts` and `src/game/scenes/HomeScene.ts`
- [x] T060 [US4] Add E2E coverage for unmet objectives, successful claim, territory visualization, save, and reload in `tests/e2e/vertical-slice.spec.ts`

**Checkpoint**: 条件達成時だけ領域が拡張され、再起動後も自陣が保持される。

---

## Phase 7: User Story 5 - 探索失敗後に落とし物を回収する (Priority: P2)

**Goal**: HP 0で装備と探索素材50%を死亡地点へ残し、自陣復帰後の探索で全量回収する。

**Independent Test**: 丸め、装備のみ、複数地点、容量不足、二重回収、再起動、
各transaction phase障害を確認する。

### Tests for User Story 5

- [x] T061 [P] [US5] Add per-ItemId ceil split, equipment-only, empty-run-loot, multiple-cache, capacity, and duplicate-recovery tests in `src/tests/deathRecovery.test.ts`
- [x] T062 [P] [US5] Add death and recovery failure injection after every journal write plus reload roll-forward tests in `src/tests/saveTransaction.test.ts`

### Implementation for User Story 5

- [x] T063 [US5] Implement atomic death split, stable cache IDs, respawn, capacity-safe recovery, and idempotency in `src/game/systems/DeathRecoverySystem.ts`
- [x] T064 [US5] Persist active death caches and operation sequences in v3/v2 saves in `src/save/SaveSystem.ts` and `src/save/RunSaveSystem.ts`
- [x] T065 [P] [US5] Render distinct map markers and recoverable contents for multiple death caches in `src/game/scenes/components/DungeonRendererComponent.ts`
- [x] T066 [US5] Dispatch death and recovery transactions and block commands during journal recovery in `src/game/application/ExplorationCoordinator.ts`
- [x] T067 [P] [US5] Add defeat summary with coordinates, equipment, materials, and recovery explanation in `src/game/scenes/ResultScene.ts`
- [x] T068 [US5] Expose death-cache destinations from Home and Area Select without deleting older caches in `src/game/scenes/HomeScene.ts` and `src/game/scenes/AreaSelectScene.ts`
- [x] T069 [US5] Add E2E coverage for defeat, respawn, reload, multiple markers, recovery, and duplicate prevention in `tests/e2e/vertical-slice.spec.ts`

**Checkpoint**: 失敗が永続的な回収目標になり、クラッシュでも重複・欠損しない。

---

## Phase 8: User Story 6 - 難易度を選んで自動生成ダンジョンへ挑む (Priority: P3)

**Goal**: 3難易度から選択し、決定的で安全・整合・到達可能なダンジョンを生成する。

**Independent Test**: 同一入力、派生attempt、上限32回、3難易度傾向、
10,000盤面の安全性・数字・到達性を確認する。

### Tests for User Story 6

- [x] T070 [P] [US6] Add canonical seed tuple, deterministic retry, max-attempt error, safe start, room, hazard, chest, and checkpoint generation tests in `src/tests/dungeonGenerator.test.ts`
- [x] T071 [P] [US6] Add easy/normal/hard parameter, reward trend, and invalid definition tests in `src/tests/difficulty.test.ts`
- [x] T072 [P] [US6] Extend 10,000-board tests across all difficulties for safety, counts, IDs, and reachability in `src/tests/soak.test.ts`

### Implementation for User Story 6

- [x] T073 [P] [US6] Define easy, normal, and hard generation/reward parameters with stable IDs in `src/data/difficulties.ts`
- [x] T074 [P] [US6] Resolve and validate difficulty configuration without changing safety invariants in `src/game/systems/DifficultySystem.ts`
- [x] T075 [US6] Implement versioned staged seed generation and deterministic attempt derivation in `src/game/map/dungeonGenerator.ts`
- [x] T076 [P] [US6] Validate tile count, safe radius, Hazard-Tile mapping, numbers, room links, IDs, and checkpoint reachability in `src/game/map/dungeonValidator.ts`
- [x] T077 [US6] Add difficulty summaries, selection persistence, and launch configuration in `src/game/scenes/AreaSelectScene.ts` and `src/game/scenes/LoadoutScene.ts`
- [x] T078 [US6] Add E2E coverage for all three difficulties, visible differences, safe starts, and successful exploration launch in `tests/e2e/vertical-slice.spec.ts`

**Checkpoint**: 全難易度で再現可能かつ開始・進行可能な盤面だけが起動する。

---

## Phase 9: User Story 7 - 新規開始、再開、設定変更を選ぶ (Priority: P3)

**Goal**: タイトルから安全に再開または初期化し、3入力方式とPWA更新を保存状態と整合させる。

**Independent Test**: データ有無・破損・backup、再開完全性、新規開始確認、
入力設定保持、install、offline cold start、更新前保存を確認する。

### Tests for User Story 7

- [x] T079 [P] [US7] Add start/resume/reset route-state and cancellation tests in `src/tests/routeState.test.ts`
- [x] T080 [P] [US7] Add install prompt, update deferral, save-before-reload, save failure, and offline state tests in `src/tests/pwaLifecycle.test.ts`
- [x] T081 [P] [US7] Add complete resume snapshot, corrupt primary, backup, new-game preservation, and InputProfile migration tests in `src/tests/save.test.ts`

### Implementation for User Story 7

- [x] T082 [US7] Implement Game Start submenu, continue availability, and confirmed reset dialog in `src/game/scenes/TitleScene.ts`
- [x] T083 [P] [US7] Implement touchJoystick, touchTap, keyboard, key-binding, run, and mark settings in `src/game/scenes/SettingsScene.ts`
- [x] T084 [P] [US7] Persist selected area, difficulty, InputProfile, and requested start mode in `src/app/routeState.ts`
- [x] T085 [US7] Implement install, offline, update-available, defer, and save-before-reload lifecycle in `src/app/PwaLifecycleController.ts` and `src/app/main.ts`
- [x] T086 [US7] Implement exact continue restore and confirmed new-game deletion while preserving settings in `src/save/SaveSystem.ts` and `src/save/RunSaveSystem.ts`
- [x] T087 [US7] Add E2E coverage for title submenu, disabled continue, complete resume, reset cancel/confirm, and all input modes in `tests/e2e/vertical-slice.spec.ts`
- [x] T088 [US7] Add production E2E coverage for installability, offline cold start/resume, update defer/apply, and save-failure protection in `tests/e2e/vertical-slice.spec.ts`

**Checkpoint**: タイトル・設定・再開・PWAライフサイクルが進行を失わず動作する。

---

## Phase 10: Polish & Cross-Cutting Quality

**Purpose**: 全ストーリーを統合し、憲章の品質ゲートと公開可能条件を満たす。

- [x] T089 [P] Audit Japanese TSDoc/JSDoc and non-obvious Japanese code comments across `src/game/`, `src/save/`, `src/data/`, and `src/app/`
- [x] T090 [P] Verify 44px controls, 12px text, non-color-only status, reduced motion, and safe-area rules in `src/ui/styles/global.css` and `src/game/scenes/components/`
- [x] T091 Profile 60fps camera/render/update behavior and optimize only measured hot paths in `src/game/scenes/components/DungeonRendererComponent.ts`
- [x] T092 Run the full unit and soak suites and record results in `specs/001-dungeon-expansion-loop/quickstart.md`
- [x] T093 Run formatting, lint, strict TypeScript, and production build gates and record results in `specs/001-dungeon-expansion-loop/quickstart.md`
- [x] T094 Run all 320×844, 390×844, and 430×932 E2E journeys and record results in `specs/001-dungeon-expansion-loop/quickstart.md`
- [x] T095 Verify PWA install, offline cold start, update apply/defer, and save-reload behavior and record evidence in `specs/001-dungeon-expansion-loop/quickstart.md`
- [ ] T096 Execute every scenario in the feature quickstart and resolve remaining deviations in `specs/001-dungeon-expansion-loop/quickstart.md`
- [x] T097 Update feature behavior, controls, save migration, recovery, PWA, and validation commands in `README.md` and `EVALUATION_LOG.md`

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 Setup**: 依存なし。
- **Phase 2 Foundational**: Phase 1に依存し、全ストーリーをブロックする。
- **US1 / Phase 3**: Foundational完了後に開始。探索表示と入力の基準になる。
- **US2 / Phase 4**: domainテストはFoundational後に並行可能。UI統合はUS1の
  DungeonRenderer/Input抽出に依存する。
- **US3 / Phase 5**: domainテストはFoundational後に並行可能。HUD統合はUS1に依存する。
- **US4 / Phase 6**: FoundationalとUS1に依存する。US2/US3とはdomain作業を並行可能。
- **US5 / Phase 7**: FoundationalとUS1に依存する。死亡後領域表示の最終統合はUS4後。
- **US6 / Phase 8**: Foundational後にdomain作業を並行可能。探索起動統合はUS1後。
- **US7 / Phase 9**: Foundational後に設定/PWA作業を並行可能。完全再開E2EはUS1〜US6後。
- **Phase 10 Polish**: 採用する全ストーリー完了後。

### User story dependency graph

```text
Setup -> Foundational -> US1
                       ├-> US2
                       ├-> US3
                       ├-> US4 -> US5
                       ├-> US6
                       └-> US7

US1 + US2 + US3 + US4 + US5 + US6 + US7 -> Polish
```

### Within each user story

1. テストを作成し、対象実装がないため失敗することを確認する。
2. 状態型・データ定義を実装する。
3. 純粋Systemを実装する。
4. Coordinatorへ統合する。
5. Phaser表示・入力コンポーネントへ統合する。
6. E2Eで独立した利用者経路を検証する。

## Parallel Opportunities

### Shared foundation

```text
T004 ExplorationState validation tests
T005 Save migration tests
T006 Transaction journal tests
T007 Coordinator tests
```

### User Story 1

```text
T019 Movement tests
T020 Mining/visibility tests
T021 Camera tests
T022 Architecture tests
```

### User Story 2

```text
T031 Hazard invariant tests
T032 Drop tests
T033 Mark/disposal regression tests
```

### User Story 3

```text
T041 Stamina tests
T042 Tool tests
T043 Inventory tests
```

### User Story 4

```text
T053 CheckpointSystem
T054 TerritorySystem
T055 Area checkpoint definitions
T056 ObjectivePanelComponent
```

### User Story 5

```text
T061 Death/recovery tests
T062 Transaction failure-injection tests
T065 Death-cache renderer
T067 Defeat summary
```

### User Story 6

```text
T070 Dungeon generator tests
T071 Difficulty tests
T072 Soak tests
```

### User Story 7

```text
T079 Route-state tests
T080 PWA lifecycle tests
T081 Resume/save tests
```

## Implementation Strategy

### Vertical slice first

1. Phase 1 Setupを完了する。
2. Phase 2 Foundationalを完了する。
3. US1を完了し、固定盤面で探索可能にする。
4. US2を完了し、推理・マーク・安全処理のMinewalker MVPを成立させる。
5. `npm run lint`、`npm run test`、`npm run build`、該当E2Eを実行する。

### Incremental delivery

1. **US1 + US2**: 中核推理探索MVP。
2. **US3**: 資源管理と拠点修理。
3. **US4**: チェックポイントと永続領域。
4. **US5**: 死亡リスクと回収探索。
5. **US6**: 3難易度と自動生成。
6. **US7**: 再開、設定、PWAライフサイクル。
7. **Polish**: 全品質ゲートと公開準備。

## Notes

- [P]は異なるファイルで、未完了タスクに依存しない場合だけ付与している。
- 既存のユーザー変更があるファイルは、差分を保持してから編集する。
- 各実装タスクでは公開型・関数へ日本語TSDoc/JSDocを追加する。
- TODOを残す場合は理由、完了条件、追跡先を同じファイルに記載する。
- Story完了時ごとにunit、lint、関連E2Eを実行する。
