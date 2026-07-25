# Tasks: 文字表示と探索パフォーマンス改善

**Input**: Design documents from `/specs/002-text-performance-polish/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: プロジェクト憲章に従い、各ユーザーストーリーの実装前にユニットテストと必要な E2E テストを追加する。

**Organization**: ユーザーストーリーごとに独立して実装・検証できるよう、タスクをストーリー単位で構成する。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 依存関係のない別ファイルで並行実行可能
- **[Story]**: 対応するユーザーストーリー（`[US1]`、`[US2]`、`[US3]`）
- すべてのタスクに正確な対象ファイルパスを記載する

## Phase 1: Setup（共通準備）

**Purpose**: UTF-8、フォント、性能計測を扱うためのプロジェクト基盤を整える。

- [x] T001 UTF-8、LF、末尾改行を統一する設定を `.editorconfig` に追加する
- [x] T002 Git 上のテキストファイルを UTF-8/LF として扱う属性を `.gitattributes` に追加する
- [x] T003 [P] 日本語フォント、ライセンス、グリフ定義を配置するディレクトリ構成を `src/assets/fonts/README.md` に定義する
- [x] T004 [P] 文字コード検査と性能回帰 E2E を実行する npm スクリプトを `package.json` に追加する

---

## Phase 2: Foundational（全ストーリー共通の基盤）

**Purpose**: すべてのユーザーストーリーが依存する契約、純粋ロジック、計測・保存基盤をテスト先行で実装する。

**⚠️ CRITICAL**: このフェーズが完了するまでユーザーストーリーの実装を開始しない。

- [x] T005 [P] UTF-8 BOM、置換文字、既知の文字化けパターンを検出する失敗テストを `src/tests/encoding.test.ts` に追加する
- [x] T006 [P] 必須日本語グリフ、ウェイト、ライセンス、オフライン参照を検証する失敗テストを `src/tests/fontAssets.test.ts` に追加する
- [x] T007 [P] 描画差分、安定 ID、全再描画条件の契約を検証する失敗テストを `src/tests/renderPatch.test.ts` に追加する
- [x] T008 [P] 固定タイムステップ、最大追従ステップ、補間値を検証する失敗テストを `src/tests/movement.test.ts` に追加する
- [x] T009 [P] カメラ追従がフレームレートに依存しないことを検証する失敗テストを `src/tests/camera.test.ts` に追加する
- [x] T010 [P] 保存要求の集約、250ms 上限、即時フラッシュ、失敗復旧を検証する失敗テストを `src/tests/runSaveScheduler.test.ts` に追加する
- [x] T011 [P] FPS、フレーム差分 p95、入力応答 p95、オブジェクト数を検証する失敗テストを `src/tests/performanceMonitor.test.ts` に追加する
- [x] T012 リポジトリ内テキストの文字コードと文字化けパターンを検査する処理を `scripts/verify-encoding.mjs` に実装する
- [x] T013 [P] `FontCatalog`、共通テキストスタイル、必須グリフ集合を `src/assets/fontCatalog.ts` に実装する
- [x] T014 [P] `RenderPatch`、描画コマンド、安定 ID、全再描画理由の型を `src/game/presentation/RenderPatch.ts` に実装する
- [x] T015 `RenderPatch` を前回状態と次回状態から生成する純粋差分処理を `src/game/presentation/RenderPatchBuilder.ts` に実装する
- [x] T016 [P] 開発・E2E 用の性能スナップショット収集を `src/game/presentation/PerformanceMonitor.ts` に実装する
- [x] T017 [P] 保存要求を集約して明示的にフラッシュできる `RunSaveScheduler` を `src/save/RunSaveScheduler.ts` に実装する
- [x] T018 タイルサイズ、固定ステップ、チャンク余白、保存遅延の共通定数を `src/data/balance.ts` に集約する

**Checkpoint**: 共通契約と純粋ロジックのテストが通り、各ストーリーを独立して進められる。

---

## Phase 3: User Story 1 - 日本語を正しく読める（Priority: P1）🎯 MVP

**Goal**: オンライン・オフラインの iPhone PWA を含む全画面で、日本語が文字化け・欠落せず同じ書体で読める。

**Independent Test**: 320×844、390×844、430×932 の各ビューポートで主要画面を巡回し、オンラインとオフライン再起動後の双方で置換文字・欠落グリフ・Unicode 依存の状態アイコンがないことを確認する。

### Tests for User Story 1

- [x] T019 [P] [US1] 主要画面の日本語と状態アイコンを検査する E2E テストを `tests/e2e/vertical-slice.spec.ts` に追加する
- [x] T020 [P] [US1] オフライン再起動後も日本語フォントが利用可能なことを検査する E2E ヘルパーを `tests/e2e/helpers/fontAssertions.ts` に追加する
- [x] T021 [P] [US1] Phaser 生成テキストが共通フォント設定を使用することを検証する回帰テストを `src/tests/fontAssets.test.ts` に追加する

### Implementation for User Story 1

- [x] T022 [P] [US1] OFL の日本語 Regular/Bold WOFF2、ライセンス、グリフ一覧を `src/assets/fonts/` に追加する
- [x] T023 [US1] フォントを Text 生成前にロードして失敗状態を通知する処理を `src/game/scenes/PreloadScene.ts` に実装する
- [x] T024 [US1] WebFont 定義、フォールバック、pixelated canvas、safe-area 対応を `src/ui/styles/global.css` に実装する
- [x] T025 [US1] 共通 Phaser テキスト生成 API と Regular/Bold スタイルを `src/game/scenes/uiHelpers.ts` に適用する
- [x] T026 [P] [US1] タイトル・拠点・設定・コレクション系画面の文字列とフォント指定を `src/game/scenes/TitleScene.ts`、`src/game/scenes/HomeScene.ts`、`src/game/scenes/SettingsScene.ts`、`src/game/scenes/CollectionScene.ts` で統一する
- [x] T027 [P] [US1] エリア・装備・結果・インベントリ系画面の文字列とフォント指定を `src/game/scenes/AreaSelectScene.ts`、`src/game/scenes/LoadoutScene.ts`、`src/game/scenes/ResultScene.ts`、`src/game/scenes/InventoryScene.ts` で統一する
- [x] T028 [US1] 探索 HUD と目的・アクション表示の文字列とフォント指定を `src/game/scenes/components/ExplorationHudComponent.ts`、`src/game/scenes/components/ObjectivePanelComponent.ts`、`src/game/scenes/components/ActionBarComponent.ts` で統一する
- [x] T029 [US1] 旗・警告・チェック・回復などの Unicode 状態記号を Graphics/スプライトアイコンへ置換する処理を `src/game/scenes/components/DungeonRendererComponent.ts` と `src/game/scenes/ExplorationScene.ts` に実装する
- [x] T030 [US1] フォント WOFF2 とライセンスが PWA キャッシュ対象になることを `vite.config.ts` で保証する
- [x] T031 [US1] 全ソースの既知の文字化け文字列を修正し文字コード検査を合格させる対象を `src/` と `tests/` に限定して実施する

**Checkpoint**: User Story 1 単体で、オンライン・オフラインを問わず全主要画面の日本語が正しく表示される。

---

## Phase 4: User Story 2 - 探索を滑らかに操作できる（Priority: P1）

**Goal**: 8方向移動、カメラ追従、採掘、危険物処理、HUD 更新を継続しても操作応答とフレーム時間が基準内に保たれる。

**Independent Test**: 固定 seed の探索で30秒移動し、100回の採掘・処理を行い、平均55fps以上、フレーム差分p95が25ms以下、入力応答p95が100ms以下、性能劣化10%以下、通常操作の100ms超停止なしを確認する。

### Tests for User Story 2

- [x] T032 [P] [US2] 変更タイル・HUD・エンティティだけが差分コマンドになる回帰テストを `src/tests/renderPatch.test.ts` に追加する
- [x] T033 [P] [US2] 8方向連続入力と低・高フレームレートで同距離になる回帰テストを `src/tests/movement.test.ts` に追加する
- [x] T034 [P] [US2] 追従カメラの補間とプレイヤー中心維持を検証する回帰テストを `src/tests/camera.test.ts` に追加する
- [x] T035 [P] [US2] 100操作後の進行状態とオブジェクト数上限を検証するソークテストを `src/tests/soak.test.ts` に追加する
- [x] T036 [US2] 固定 seed で30秒移動と100操作を実行し性能契約を検証する E2E テストを `tests/e2e/vertical-slice.spec.ts` に追加する

### Implementation for User Story 2

- [x] T037 [P] [US2] 固定16.67msステップ、最大3追従ステップ、描画補間を `src/game/systems/MovementSystem.ts` に実装する
- [x] T038 [P] [US2] フレームレート非依存の追従と単一タイル座標変換を `src/game/systems/CameraSystem.ts` に実装する
- [x] T039 [US2] ドメイン更新結果から `RenderPatch` を生成して Scene へ返す処理を `src/game/application/ExplorationCoordinator.ts` に実装する
- [x] T040 [US2] 地形レイヤーを永続化し8×8チャンク、2タイル余白、オーバーレイプールで差分更新する処理を `src/game/scenes/components/DungeonRendererComponent.ts` に実装する
- [x] T041 [P] [US2] HUD の GameObject を永続化し値が変化した項目だけ更新する処理を `src/game/scenes/components/ExplorationHudComponent.ts` に実装する
- [x] T042 [P] [US2] 目的パネルとアクションバーを永続化し選択状態だけ差分更新する処理を `src/game/scenes/components/ObjectivePanelComponent.ts` と `src/game/scenes/components/ActionBarComponent.ts` に実装する
- [x] T043 [US2] タイルごとのリスナーを廃止して単一ワールドポインター入力へ集約する処理を `src/game/scenes/components/ExplorationInputComponent.ts` に実装する
- [x] T044 [US2] プレイヤー、カメラ、照明、敵表示を永続化し Scene を調停処理中心へ整理する変更を `src/game/scenes/ExplorationScene.ts` に実装する
- [x] T045 [US2] FPS、p95、入力応答、GameObject/Text数、アクティブチャンク数を E2E へ公開するブリッジを `src/app/main.ts` に実装する
- [x] T046 [US2] 性能低下時に演出品質のみ段階的に下げるフォールバックを `src/game/visual/VisualSystem.ts` に実装する

**Checkpoint**: User Story 2 単体で、長時間操作後も探索が滑らかでゲーム進行と表示が一致する。

---

## Phase 5: User Story 3 - 安全に中断・再開できる（Priority: P2）

**Goal**: 描画と保存の負荷を分離しつつ、バックグラウンド化・終了・更新・死亡・チェックポイント後も最新の確定状態から安全に再開できる。

**Independent Test**: 採掘、解除、死亡、回収、チェックポイントの各直後にバックグラウンド化または PWA 再起動し、最新確定状態が復元され、既存 v3/v2 セーブも読み込めることを確認する。

### Tests for User Story 3

- [x] T047 [P] [US3] 同一フレームの永続・探索・経路保存を1回へ集約する回帰テストを `src/tests/runSaveScheduler.test.ts` に追加する
- [x] T048 [P] [US3] hidden、pagehide、Scene終了、PWA更新で即時フラッシュする回帰テストを `src/tests/pwaLifecycle.test.ts` に追加する
- [x] T049 [P] [US3] v3/v2、破損バックアップ、死亡回収、チェックポイント WAL の互換性テストを `src/tests/save.test.ts` と `src/tests/saveTransaction.test.ts` に追加する
- [x] T050 [US3] 操作直後のバックグラウンド化・オフライン再起動・更新拒否を検証する E2E テストを `tests/e2e/vertical-slice.spec.ts` に追加する

### Implementation for User Story 3

- [x] T051 [US3] 最新スナップショット優先、最大250ms集約、失敗時保持、即時フラッシュを `src/save/RunSaveScheduler.ts` に完成させる
- [x] T052 [US3] 探索中の直接 localStorage 書き込みを保存スケジューラ経由へ置換し死亡・回収・チェックポイント WAL は即時保存のまま維持する変更を `src/game/scenes/ExplorationScene.ts` に実装する
- [x] T053 [P] [US3] 探索・永続・トランザクションの既存キーと v3/v2 移行を維持するアダプターを `src/save/RunSaveSystem.ts`、`src/save/SaveSystem.ts`、`src/save/SaveTransactionSystem.ts` に実装する
- [x] T054 [US3] hidden、pagehide、Scene終了、メニュー遷移時に保存をフラッシュする処理を `src/app/PwaLifecycleController.ts` と `src/app/routeState.ts` に実装する
- [x] T055 [US3] PWA 更新適用前に全保存領域をフラッシュし失敗時は更新を中止する処理を `src/app/main.ts` に実装する

**Checkpoint**: User Story 3 単体で、中断タイミングにかかわらず確定済み進行を失わず既存セーブから再開できる。

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 全ストーリー横断の品質確認、文書化、実機相当検証を完了する。

- [x] T056 [P] 新規・変更クラス、フィールド、メソッドへ日本語 TSDoc/XML 相当コメントを `src/game/presentation/` と `src/save/RunSaveScheduler.ts` に追加する
- [x] T057 [P] テキスト・アイコン・性能・保存の設計判断と運用方法を `README.md` に追記する
- [x] T058 [P] 320×844、390×844、430×932 の HUD・下部バー・safe-area 視覚回帰確認を `tests/e2e/vertical-slice.spec.ts` に追加する
- [x] T059 エンコーディング、lint、型検査、ユニットテストを実行し不具合を対象ファイルと `src/tests/` で修正する
- [x] T060 本番ビルドと全 E2E を実行し PWA キャッシュ・性能閾値・セーブ再開の不具合を `vite.config.ts` と `tests/e2e/vertical-slice.spec.ts` で修正する
- [ ] T061 iPhone 実機でインストール、オフライン起動、バックグラウンド復帰、30分通しプレイを実施し結果を `specs/002-text-performance-polish/quickstart.md` に記録する
- [x] T062 実装前後の FPS、p95、入力応答、オブジェクト数、保存時間を比較して受入結果を `specs/002-text-performance-polish/performance-results.md` に記録する

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし。直ちに開始可能。
- **Foundational (Phase 2)**: Setup 完了後に開始。全ユーザーストーリーをブロックする。
- **User Story 1 (Phase 3)**: Foundational 完了後に開始。MVP の文字表示基盤を完成させる。
- **User Story 2 (Phase 4)**: Foundational 完了後に開始。US1 の共通フォント API は利用するが、描画差分の実装は独立して検証可能。
- **User Story 3 (Phase 5)**: Foundational 完了後に開始。US2 の Scene 調停変更との競合を避けるため、`ExplorationScene.ts` の統合は US2 の T044 後に行う。
- **Polish (Phase 6)**: 必要なユーザーストーリーが完了した後に実施する。

### User Story Dependencies

- **US1 (P1)**: Foundational のみ依存。単独でリリース可能。
- **US2 (P1)**: Foundational に依存。US1 と機能上は独立だが `uiHelpers.ts` の共通スタイルを利用する。
- **US3 (P2)**: Foundational に依存。保存契約は独立しているが、`ExplorationScene.ts` への統合は US2 後を推奨する。

### Within Each User Story

- テストを先に追加し、意図した理由で失敗することを確認する。
- 純粋ロジックとデータ契約を先に実装する。
- コンポーネント・Scene・ライフサイクル統合を後に実装する。
- ユーザーストーリー単体の Independent Test を通してから次へ進む。

### Parallel Opportunities

- T003 と T004 は Setup 内で並行可能。
- T005〜T011 は互いに異なるテストファイルで並行可能。
- T013、T014、T016、T017 は契約確定後に別ファイルで並行可能。
- US1 の T019〜T021、T026〜T027 は担当ファイルを分けて並行可能。
- US2 の T032〜T035、T037〜T038、T041〜T042 は担当ファイルを分けて並行可能。
- US3 の T047〜T049 と T053 は担当ファイルを分けて並行可能。
- T056〜T058 は実装完了後に並行可能。

---

## Parallel Example: User Story 1

```text
Task T019: tests/e2e/vertical-slice.spec.ts に主要画面表示テストを追加
Task T020: tests/e2e/helpers/fontAssertions.ts にオフラインフォント検査を追加
Task T021: src/tests/fontAssets.test.ts に共通フォント回帰テストを追加
```

## Parallel Example: User Story 2

```text
Task T037: src/game/systems/MovementSystem.ts に固定ステップを実装
Task T038: src/game/systems/CameraSystem.ts にフレーム非依存追従を実装
Task T041: src/game/scenes/components/ExplorationHudComponent.ts を差分更新化
```

## Parallel Example: User Story 3

```text
Task T047: src/tests/runSaveScheduler.test.ts に集約保存テストを追加
Task T048: src/tests/pwaLifecycle.test.ts にライフサイクルテストを追加
Task T049: src/tests/save.test.ts と src/tests/saveTransaction.test.ts に互換性テストを追加
```

---

## Implementation Strategy

### MVP First（User Story 1）

1. Phase 1: Setup を完了する。
2. Phase 2: Foundational を完了する。
3. Phase 3: User Story 1 を完了する。
4. オンライン・オフラインの3ビューポートで独立検証する。
5. 文字化け改善版としてデモ可能な状態にする。

### Incremental Delivery

1. Setup + Foundational で共通契約を固定する。
2. US1 で文字表示を完成し、独立検証する。
3. US2 で探索描画を差分更新化し、性能契約を独立検証する。
4. US3 で保存を集約し、中断再開契約を独立検証する。
5. Polish で全ストーリーを統合し、実機 PWA と30分通しプレイを確認する。

### Completion Rule

- 各実装タスクに対応するユニットテストが成功している。
- 変更したユーザージャーニーに対応する E2E テストが成功している。
- `npm run lint`、`npm run test`、`npm run build`、`npm run e2e` がすべて成功している。
- `spec.md` の成功基準 SC-001〜SC-009 を満たしている。
