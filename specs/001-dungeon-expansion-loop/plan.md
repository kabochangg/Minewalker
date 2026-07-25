# Implementation Plan: ダンジョン領域拡張ループ

**Branch**: `001-dungeon-expansion-loop` | **Date**: 2026-07-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-dungeon-expansion-loop/spec.md`

## Summary

既存のMinewalkerへ、複数種の危険物、危険マークを前提とした安全処理、走行と
スタミナ回復、処理道具の耐久、チェックポイントによる永続領域拡張、3段階難易度、
死亡地点の落とし物回収、タイトルからの新規開始・再開を追加する。

TypeScript、Vite、Phaser 3の既存Webゲーム構成を維持し、状態を持つドメイン
コンポーネント、純粋なSystem、Phaserの表示・入力コンポーネントへ責務を分離する。
`ExplorationScene`はライフサイクルとコンポーネント連携だけを担い、ゲーム規則を
直接実装しない。永続セーブはv3、探索中断セーブはv2へ移行する。

## Technical Context

**Language/Version**: TypeScript 5.9.3、ES2022、strict mode

**Primary Dependencies**: Phaser 3.90.0、Vite 7.3.6、seedrandom 3.0.5、
Zod 3.25.76、vite-plugin-pwa 1.3.0

**Storage**: ブラウザー内の版管理済みJSON保存。永続進行、探索中断、
バックアップを別キーで保持

**Testing**: Vitest 3.2.7によるユニット・生成試験、Playwright 1.61.1による
縦画面E2E、ESLint 9.39.5、Prettier 3.9.5

**Target Platform**: スマートフォン縦画面優先のインストール可能なPWA。
320〜430px幅、タッチ・ポインター・キーボード入力、初回ロード後のオフライン起動

**Project Type**: Phaserキャンバスを中心とする単一フロントエンドWebゲーム

**Performance Goals**: 通常端末で60fpsを目標、主要入力の視覚反応100ms以内、
初回プレイ5〜15分、10,000生成盤面の整合検証を自動実行可能

**Constraints**: 周囲8マスの数字一致、開始地点の安全性、斜め角抜け禁止、
44px以上の操作領域、重要文字12px以上、safe-area対応、オフライン再開、
既存セーブ互換、複数保存領域のクラッシュ復旧、日本語TSDoc/JSDoc、
明示的な`any`禁止

**Scale/Scope**: 4既存エリア、3難易度、4危険物種、複数チェックポイント、
複数死亡地点、既存11 Sceneを保ちながら探索Sceneをコンポーネントへ分解

## Constitution Check

_GATE: Phase 0開始前に合格。Phase 1設計後にも再確認済み。_

| Gate                           | Design evidence                                                                                       | Status |
| ------------------------------ | ----------------------------------------------------------------------------------------------------- | ------ |
| Core loop                      | 推理→マーク→処理/採掘→戦闘→回収→チェックポイント→領域拡張を`ExplorationState`の状態遷移として統合する | PASS   |
| Fair danger and death recovery | seed固定生成、開始安全域、数字再計算、生成後検証、装備＋探索素材50%の死亡地点保存と回収を設計する     | PASS   |
| Adaptive UI and PWA            | 固定UI、390×844基準、320〜430px、safe-area、3入力方式、install、update、offline再開を検証する         | PASS   |
| Save compatibility             | v2→v3/v1→v2移行、Zod検証、backup、write-ahead journal、障害後roll-forwardを含める                     | PASS   |
| Test and documentation         | 全System、Coordinator、移行、障害注入、生成soak、主要E2E、日本語TSDoc/JSDocを必須化する               | PASS   |
| Architecture                   | Sceneから規則を抽出し、components→systems→coordinator→Phaser adaptersの一方向依存にする               | PASS   |

### Post-design re-check

`research.md`、`data-model.md`、`contracts/`、`quickstart.md`を確認した結果、
未解決事項と憲章違反はない。死亡地点の唯一の消失条件、数字更新規則、セーブ移行、
コンポーネント境界、検証責任が全て設計成果物に明示されている。

## Project Structure

### Documentation (this feature)

```text
specs/001-dungeon-expansion-loop/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── component-contracts.md
│   ├── persistence-contract.md
│   └── ui-flow-contract.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── main.ts
│   ├── phaserConfig.ts
│   ├── PwaLifecycleController.ts
│   └── routeState.ts
├── game/
│   ├── application/
│   │   └── ExplorationCoordinator.ts
│   ├── components/
│   │   ├── explorationComponents.ts
│   │   ├── hazardComponents.ts
│   │   ├── progressionComponents.ts
│   │   └── toolComponents.ts
│   ├── entities/
│   │   └── player.ts
│   ├── map/
│   │   ├── dungeonGenerator.ts
│   │   ├── dungeonValidator.ts
│   │   └── types.ts
│   ├── scenes/
│   │   ├── components/
│   │   │   ├── ActionBarComponent.ts
│   │   │   ├── DungeonRendererComponent.ts
│   │   │   ├── ExplorationHudComponent.ts
│   │   │   ├── ExplorationInputComponent.ts
│   │   │   └── ObjectivePanelComponent.ts
│   │   ├── AreaSelectScene.ts
│   │   ├── BootScene.ts
│   │   ├── CollectionScene.ts
│   │   ├── CraftingScene.ts
│   │   ├── ExplorationScene.ts
│   │   ├── HomeScene.ts
│   │   ├── InventoryScene.ts
│   │   ├── LoadoutScene.ts
│   │   ├── PreloadScene.ts
│   │   ├── ResultScene.ts
│   │   ├── SettingsScene.ts
│   │   └── TitleScene.ts
│   ├── state/
│   │   ├── ExplorationState.ts
│   │   └── GameState.ts
│   └── systems/
│       ├── CameraSystem.ts
│       ├── CheckpointSystem.ts
│       ├── CombatSystem.ts
│       ├── DeathRecoverySystem.ts
│       ├── DifficultySystem.ts
│       ├── DropSystem.ts
│       ├── HazardSystem.ts
│       ├── InventorySystem.ts
│       ├── MinefieldSystem.ts
│       ├── MiningSystem.ts
│       ├── MovementSystem.ts
│       ├── StaminaSystem.ts
│       ├── TerritorySystem.ts
│       └── ToolSystem.ts
├── data/
│   ├── areas.ts
│   ├── balance.ts
│   ├── difficulties.ts
│   ├── equipment.ts
│   ├── hazards.ts
│   └── items.ts
├── save/
│   ├── RunSaveSystem.ts
│   ├── SaveSystem.ts
│   └── SaveTransactionSystem.ts
├── tests/
│   ├── applicationCoordinator.test.ts
│   ├── camera.test.ts
│   ├── checkpoint.test.ts
│   ├── deathRecovery.test.ts
│   ├── drop.test.ts
│   ├── dungeonGenerator.test.ts
│   ├── hazard.test.ts
│   ├── minefield.test.ts
│   ├── movement.test.ts
│   ├── save.test.ts
│   ├── saveTransaction.test.ts
│   ├── stamina.test.ts
│   └── tool.test.ts
└── ui/
    └── styles/
        └── global.css

tests/
└── e2e/
    └── vertical-slice.spec.ts
```

**Structure Decision**: 既存の単一Webアプリ構成を維持する。新しい
`src/game/components/`は直列化可能な状態だけを保持し、`systems/`は状態遷移、
`scenes/components/`はPhaser GameObject、入力、表示を担当する。Sceneは生成、
破棄、イベント配線、画面遷移だけを統括する。`ExplorationCoordinator`が
Command dispatch、System合成、DomainEvent配信、保存要求を担当し、
`SaveTransactionSystem`が複数保存領域のクラッシュ復旧を担当する。
完全なECSや追加状態管理ライブラリは導入しない。

## Delivery Strategy

1. **Foundation**: 型、難易度、危険物、道具耐久、チェックポイント、死亡地点、
   v3/v2セーブスキーマ、トランザクションjournal、移行テストを先に追加する。
2. **Pure domain systems**: 生成、危険物、スタミナ、道具、領域、死亡回収を
   純粋関数で実装し、ユニットテストを通す。
3. **Component extraction**: `ExplorationScene`からHUD、入力、盤面描画、
   目的表示をPhaserコンポーネントへ抽出し、System合成をCoordinatorへ移す。
4. **Playable integration**: 難易度選択、探索、チェックポイント、死亡、
   再開、拠点修理を接続する。
5. **Quality gates**: 生成soak、トランザクション障害注入、セーブ移行、
   320/390/430pxと入力方式別E2E、PWAインストール、更新通知、
   オフラインcold start/再開、lint、test、buildを実行する。

## Complexity Tracking

憲章違反はなく、例外承認を必要とする複雑性はない。
