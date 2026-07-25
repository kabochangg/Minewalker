# Phase 0 Research: 文字表示・操作応答改善

## Decision 1: Phaser 3を維持する

**Decision**: Phaser 3.90.0、Vite、既存Scene/System構成を維持し、presentationと保存経路を改善する。

**Rationale**: 現行`ExplorationScene`は状態変化ごとに背景、最大1,176タイル、数字、照明、player、monster、HUD、actionを全破棄・全生成し、タイルlistenerとcamera followも再設定する。抽出済みRenderer/HUDも同じ全再描画方式であり、主要負荷はrenderer製品ではなくアプリ側のlifecycleにある。PhaserにはTilemap、batch、RenderTexture、Layer、Camera、pool可能なGameObjectが既にある。

**Alternatives considered**:

- PixiJS: Scene、camera、input、tween、loader、既存UIを再実装しても、全再生成設計を残せば改善しないため不採用。
- DOM中心UI: 日本語表示には有効だが、canvasとの二重layout/input管理が増えるため全面移行は不採用。必要なaccessibility live regionだけ将来併用可能。
- 現行Rendererの部分修正: Scene側の重複実装が残るため不十分。

## Decision 2: 永続GameObjectへRenderPatchを適用する

**Decision**: 前後の探索状態とDomainEventからpresentation専用`RenderPatch`を生成し、Renderer/HUDは初期化後に変更対象だけ更新する。

**Rationale**: object identityを維持すると、GC、Graphics命令、Text texture再生成、listener再登録、camera再followを同時に除去できる。通常操作でfull rebuildを許さない契約にすることで回帰をテストできる。

**Alternatives considered**:

- 状態全体のshallow compare: nested mapの変更位置を安定して特定できず、無関係なHUD・tile更新を招く。
- DomainEventだけで描画: 現在のeventには全変更座標がなく、resume/context restoreも表現できない。前後stateと併用する。

## Decision 3: Tilemap/atlas、chunk culling、単一入力面を使う

**Decision**: 地形をtileset/atlasとTilemapLayerへ統合し、動的overlay/entityを8×8 chunk、camera visible rect＋2タイルoverscan、固定poolで管理する。tile個別listenerは廃止する。

**Rationale**: 現行は各tileがRectangle、Graphics、Text、listenerを所有する。Tilemapはcell差分とcamera cullingを利用でき、動的要素だけをpoolすればhard最大盤面でもactive object数をviewport規模へ制限できる。

**Alternatives considered**:

- chunk RenderTexture: procedural外観を維持しやすいがdirty chunk焼き直しが必要。atlasで表現できない背景だけに限定する。
- viewport内GameObject poolのみ: 移行量は小さいがdraw callと管理量がTilemapより多い。
- Phaser 4のGPU Tilemap: 現行依存はPhaser 3であり、framework upgradeを同時に行うリスクが大きいため不採用。

## Decision 4: 固定step simulationと補間を使う

**Decision**: 16.67ms固定step、1 frame最大3 step、残余carry、visual補間を採用する。playerとcamera objectは再生成せず、world boundsとfollowはmap/viewport変更時だけ更新する。

**Rationale**: 現行はdeltaを34msへ切り捨てるため低fps時に時間を失い、frameごとにcamera追従感が変わる。固定stepは入力、衝突、スタミナを再現可能にし、補間が視覚上の連続性を保つ。

**Alternatives considered**:

- 可変deltaのまま上限だけ拡大: 大delta時の衝突とスタミナ結果が不安定になる。
- Phaser tweenだけで全移動: joystick連続移動とtap移動の統一が難しく、途中入力の反応が遅れる。

## Decision 5: 日本語フォントを自己ホストし、文字生成を統一する

**Decision**: OFL 1.1の日本語フォントを`MinewalkerJP`として必要文字へsubsetし、通常・太字WOFF2とライセンスを同梱する。フォントロード後にTextを作り、共通style factoryを使用する。

**Rationale**: 現行は`system-ui`、`sans-serif`、implicit defaultが混在し、Canvas Text生成時点のOS fallbackへ依存する。Phaser 3.90はFontFile loaderを持ち、PWAは既にWOFF2をprecache対象としている。自己ホストすればiPhoneとオフラインでglyph・幅を統一できる。[Phaser FontFile](https://docs.phaser.io/api-documentation/3.90.0/class/loader-filetypes-fontfile)

**Alternatives considered**:

- system fontのみ: 端末差と記号fallbackを解消できない。
- 外部CDN font: 初回オフライン、privacy、cross-originの不確実性がある。
- 全日本語BitmapFont: glyph作成・容量・将来文字追加の負担が大きい。数字だけBitmapText化する。
- full CJK font: 初回ロード容量が大きいため、再現可能なsubsetを優先する。

## Decision 6: 重要Unicode記号をiconへ置換する

**Decision**: 危険、flag、処理済み、出口、死亡地点、area評価をGraphicsまたはsprite iconと日本語labelで示す。矢印、乗算記号などの一般記号だけapproved glyph listで許可する。

**Rationale**: `⚑`、`⚠`、`✓`、`✚`などはiOSでemoji fontまたはmissing glyphへfallbackする可能性があり、色・幅・baselineが不安定である。

**Alternatives considered**:

- fallback fontを増やす: Canvas metricsとemoji presentationは依然端末依存。
- 記号を文字としてsubsetへ追加: 表示は安定するが、重要状態を単一glyphだけで伝える憲章違反を解消できない。

## Decision 7: 保存schemaを変えずSaveSchedulerで集約する

**Decision**: persistent、run、routeのdirty snapshotをmemoryでdomain別に集約し、視覚反映後かつ最大250ms以内に保存する。shutdown、hidden、pagehide、PWA update前は同期flushする。死亡・回収・checkpoint WALは即時のまま維持する。

**Rationale**: 現行はgrid crossing、`render()`、tap完了、semantic actionで同じrun全体をJSON stringifyしprimary/backupへ同期書込みする。同一input task内のlocalStorageは最初のpaintを遅らせる。schema/keyを変えず重複だけ除けば互換性リスクが小さい。

**Alternatives considered**:

- IndexedDB移行: async化できるが、既存backup/migration/WALを含む大きな保存移行になるため対象外。
- Web Worker: localStorageへアクセスできず、snapshot clone費用も残る。
- Scene内debounceだけ: writerが分散し、PWA更新前に全domainをflushできない。

## Decision 8: 測定を契約化する

**Decision**: dev/E2E限定でRAF frame delta、update、patch build/apply、入力からpresent、GameObject/Text数、active chunk、保存bytes/timeをring bufferへ記録し、集計値だけを取得可能にする。

**Rationale**: 「滑らか」を平均fpsだけで判断するとaction hitchや徐々に増えるobjectを見逃す。specの平均55fps、p95 25ms、入力p95 100ms、100操作後10%以内を同じ測定定義で検証する必要がある。

**Alternatives considered**:

- 目視だけ: 再現性と回帰検知がない。
- desktop E2Eだけ: iPhone Safari固有差を見逃すため、実機結果と併用する。
- payloadを含む保存log: 個人データと巨大logの問題があるため、reason、bytes、duration、coalesced countだけ記録する。
