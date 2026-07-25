# Implementation Plan: 文字表示・操作応答改善

**Branch**: `002-text-performance-polish` | **Date**: 2026-07-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-text-performance-polish/spec.md`

## Summary

iPhone PWAを最優先に、日本語の字体・記号を自己ホスト資源へ統一し、探索中の全破棄・全再生成と重複する同期保存を差分更新と保存集約へ置き換える。Phaser 3は維持し、既存のドメインSystem、セーブv3、探索中断v2、WAL v1を変更しない。`ExplorationScene`はライフサイクル、入力配線、画面遷移だけを担当し、Coordinatorが状態変更、presentation adapterが`RenderPatch`生成、永続Renderer/HUDが変更箇所だけを更新する。

## Technical Context

**Language/Version**: TypeScript 5.8.3、ES2022、strict mode

**Primary Dependencies**: Phaser 3.90.0、Vite 7.0.5、vite-plugin-pwa 1.0.3、Zod 3.25.76、seedrandom 3.0.5

**Storage**: browser localStorage。永続セーブv3、探索中断セーブv2、トランザクションジャーナルv1、各backup領域を維持

**Testing**: Vitest 3.2.4、Playwright 1.54.1、実機iPhone PWA確認、既存生成soak

**Target Platform**: iPhone Safari／ホーム画面PWAを最優先とする320〜430px幅の縦画面。デスクトップWebのポインター・キーボードも維持

**Project Type**: Phaserキャンバス中心の単一フロントエンドPWAゲーム

**Performance Goals**: 30秒探索の平均55fps以上、frame delta p95 25ms以下、主要入力から視覚反映までp95 100ms以下、100操作後の平均frame delta悪化10%以内

**Constraints**: オフライン文字表示、44px以上の主要操作、12px以上の重要文字、safe-area、8方向移動、斜め角抜け禁止、既存セーブ互換、死亡・回収・チェックポイントの原子性、軽減モーション、日本語TSDoc/JSDoc

**Scale/Scope**: 4エリア、3難易度、最大28×42＝1,176マス、最大12モンスター、既存13 Scene、既存109 unit/soakテストと51 E2Eを回帰基準とする

## Constitution Check

_GATE: Phase 0前およびPhase 1設計後に確認済み。全項目PASS。_

| Gate                           | Design response                                                                                        | Result |
| ------------------------------ | ------------------------------------------------------------------------------------------------------ | ------ |
| Core loop                      | 表示・入力・保存スケジュールだけを変更し、推理、移動、採掘、戦闘、回収、領域拡張の規則を維持する       | PASS   |
| Fair danger and death recovery | 数字計算、開始地点、危険処理、死亡キャッシュの意味は不変。表示patchはドメイン結果だけを反映する        | PASS   |
| Adaptive UI and PWA            | 320/390/430px、safe-area、タッチ・ポインター・キーボード、オフラインフォント、更新前flushを検証する    | PASS   |
| Save compatibility             | v3/v2/v1とkey、backup、migration、WALを維持。queueはmemory-onlyでversionを上げない                     | PASS   |
| Test and documentation         | encoding/font、patch、移動、カメラ、保存集約、性能計測のunit/E2Eと実機確認、日本語コメントを必須化する | PASS   |
| Architecture                   | Sceneから規則・描画・保存を除き、Coordinator→presentation adapter→componentsの一方向依存にする         | PASS   |

### Post-design re-check

- フォント資源と描画patchは保存データに含めず、既存セーブ互換を保つ。
- 保存集約は通常操作だけを対象とし、死亡・回収・チェックポイントのWALを遅延しない。
- 重要記号はアイコンと日本語ラベルを併用し、画像だけへ依存しない。
- Phaser 3置換は不要であり、憲章既定技術からの例外はない。

## Project Structure

### Documentation (this feature)

```text
specs/002-text-performance-polish/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── presentation-contract.md
│   ├── save-coordination-contract.md
│   └── performance-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── main.ts
│   └── phaserConfig.ts
├── assets/
│   ├── fonts/
│   ├── tiles/
│   └── assetCatalog.ts
├── game/
│   ├── application/
│   │   └── ExplorationCoordinator.ts
│   ├── presentation/
│   │   ├── RenderPatch.ts
│   │   ├── RenderPatchBuilder.ts
│   │   └── PerformanceMonitor.ts
│   ├── scenes/
│   │   ├── ExplorationScene.ts
│   │   ├── PreloadScene.ts
│   │   └── components/
│   └── systems/
│       ├── CameraSystem.ts
│       └── MovementSystem.ts
├── save/
│   ├── RunSaveScheduler.ts
│   ├── RunSaveSystem.ts
│   └── SaveSystem.ts
├── tests/
│   ├── encoding.test.ts
│   ├── fontAssets.test.ts
│   ├── renderPatch.test.ts
│   ├── performanceMonitor.test.ts
│   └── runSaveScheduler.test.ts
└── ui/styles/global.css

tests/e2e/
└── vertical-slice.spec.ts
```

**Structure Decision**: 既存の単一Webアプリ構成を維持する。`presentation/`はドメイン状態とイベントから表示差分を作る純粋層、`scenes/components/`はPhaser GameObjectの生成・更新・破棄、`save/`は既存保存関数をまとめるschedulerを担当する。`ExplorationScene`はCoordinator、input、renderer、HUD、schedulerの配線とScene遷移だけを行う。

## Implementation Design

### 1. 文字資源とエンコーディング

- `.editorconfig`と`.gitattributes`でテキストをUTF-8/LFへ統一する。
- OFL 1.1の日本語フォントを`MinewalkerJP`として自己ホストし、通常・太字で必要なゲーム内文字を収録したWOFF2とライセンスを同梱する。
- `PreloadScene`でフォントを画像と同じロードゲートに含め、ロード失敗時だけ日本語対応system fallbackを使用して診断イベントを残す。
- すべてのPhaser Textを共通style factory経由にする。数字はBitmapText／数字atlas、危険・死亡・出口などのUnicode記号はGraphicsまたはsprite iconへ置換する。
- UTF-8 fatal decode、U+FFFD、NUL、不正制御文字、既知の文字化け列、禁止Unicode状態記号、フォント収録文字を自動検査する。

### 2. 差分描画と入力

- `ExplorationCoordinator.dispatch()`の前後状態とDomainEventから`RenderPatch`を1回だけ生成する。拒否操作はfeedbackだけをpatch化する。
- 初期生成、再開、テーマ変更、WebGL context restoreだけ`fullRebuild`を許可する。移動、採掘、マーク、処理、攻撃、HUD変更では禁止する。
- 地形は既存タイル画像をまとめたtileset/atlasとPhaser TilemapLayerへ移し、変更セルだけ更新する。数字、マーク、死亡地点、モンスター、effectはpoolしたoverlay/entityとして管理する。
- world、overlay、entity、effect、UIの固定Layerをcreate時に1回生成し、camera ignoreもLayer単位で1回設定する。
- タイルごとのpointer listenerを廃止し、world入力面1つで画面座標をtile座標へ変換する。長押し判定と通常tapを同じinput adapterで正規化する。
- Renderer/HUD/ActionBarはGameObject参照を保持し、`setTexture`、`setPosition`、`setText`、bar幅、visibilityだけを変更する。

### 3. 移動・カメラ

- `TILE_SIZE=48`とworld座標変換を共通化し、32px版Rendererとの不一致を解消する。
- simulationは16.67ms固定step accumulator、1 frame最大3 step、残余時間を次frameへ持ち越す。描画座標は前後simulation間を補間する。
- player、照明、camera followはScene存続中同一objectを使う。bounds/followはmap、viewport、orientation変更時だけ再設定する。
- monster occupied座標はmonster変更時だけ索引を更新し、frameごとの配列生成をなくす。
- 入力受信時に方向、押下、対象highlightを即時patch化し、ドメイン確定と演出を分離する。
- dynamic overlay/entityはcamera visible rect＋2タイルoverscanだけactiveにし、8×8 chunk境界を跨いだ時だけpoolを更新する。

### 4. 保存集約

- `RunSaveScheduler`を通常のpersistent/run/route保存入口とし、既存の低水準save関数、key、schema、backup、validationを再利用する。
- 通常操作は最新snapshotだけ保持して同一domainの重複をまとめ、視覚反映後かつ最大250ms以内に保存する。
- 移動は確定grid遷移、採掘・処理・戦闘は結果確定をdirty境界とする。`render()`とframe updateから直接保存を除く。
- Scene shutdown、メニュー遷移、`visibilitychange=hidden`、`pagehide`、PWA更新前は`flushAll()`する。
- 死亡、回収、チェックポイントは既存WALを即時実行し、queueで遅延・並べ替えしない。失敗時はdirtyを保持し、保存必須の遷移・更新を停止する。

### 5. 計測と品質ゲート

- dev/E2E限定でRAF delta、update、patch build/apply、入力→present、GameObject/Text数、active chunk、保存bytes/stringify/write時間を収集する。
- hard最大盤面で30秒連続移動と100操作を実行し、平均fps、p95、最大値、object数増減をE2E bridgeから取得する。
- 低性能fallbackは照明・粒子・effect pool・Text resolution・overscanだけを下げ、数字、危険、操作状態は省略しない。
- Phaser固有overheadが最適化後もp95 25ms超過の主因と計測された場合だけ、別featureでPixiJS prototypeと移行ADRを作る。本featureでは移行しない。

## Complexity Tracking

憲章違反および正当化が必要な追加複雑性はない。
