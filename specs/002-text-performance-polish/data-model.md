# Data Model: 文字表示・操作応答改善

このfeatureで永続セーブのschemaは変更しない。以下はpresentation、保存queue、計測のmemory-onlyモデルであり、既存`SaveData v3`、`ExplorationState v2`、transaction journal v1へ追加保存しない。

## RenderPatch

1回のCoordinator結果を表示へ反映する差分。

| Field                | Type                                                    | Rules                                                             |
| -------------------- | ------------------------------------------------------- | ----------------------------------------------------------------- |
| `revision`           | positive integer                                        | Scene内で単調増加。古いpatchは拒否                                |
| `fullRebuild`        | `initial \| resume \| theme \| contextRestore` optional | 通常commandでは指定禁止                                           |
| `dirtyTileKeys`      | readonly TileKey[]                                      | 重複なし、map内座標のみ                                           |
| `dirtyChunkKeys`     | readonly ChunkKey[]                                     | dirty tileから導出、重複なし                                      |
| `playerChanges`      | readonly PlayerViewField[]                              | position/stats/appearance/actionの部分集合                        |
| `dirtyMonsterIds`    | readonly string[]                                       | 存在または直前に存在したmonster ID                                |
| `deathCachesChanged` | boolean                                                 | cache marker poolを同期する条件                                   |
| `hudChanges`         | readonly HudField[]                                     | hp/stamina/tool/inventory/locomotion/objective/message/actionMode |
| `effects`            | readonly VisualEffectCommand[]                          | 状態を変更しない一時演出                                          |
| `inputReceiptId`     | string optional                                         | 入力からpresentまでの計測相関ID                                   |

### State transitions

`created → queued → applied → presented`

- `applied`後に同じrevisionを再適用してもGameObject数と状態が変わらない。
- revisionが現在値以下なら`ignored`となる。
- `fullRebuild`は既存view registryを破棄して再初期化し、それ以外はidentityを保持する。

## TileViewRegistry

描画物の所有関係を管理するScene-local registry。

| Field             | Type                           | Rules                                             |
| ----------------- | ------------------------------ | ------------------------------------------------- |
| `tileViews`       | Map<TileKey, TileViewRef>      | visible/pooled tileだけを保持                     |
| `chunkStates`     | Map<ChunkKey, active/inactive> | 8×8 chunk                                         |
| `overlayPool`     | bounded pool                   | viewport＋2タイルoverscanを上限とする             |
| `monsterViews`    | Map<MonsterId, EntityViewRef>  | monster IDにつき最大1                             |
| `deathCacheViews` | Map<CacheId, OverlayRef>       | cache IDにつき最大1                               |
| `layers`          | fixed layer refs               | world/overlay/entity/effect/uiを初期化時に1回生成 |

### Validation rules

- 同じTileKey、MonsterId、CacheIdのactive viewを複数作らない。
- camera移動だけではdomain stateとview総数を増加させない。
- inactive chunkのoverlayはpoolへ返却しlistenerを所有しない。

## MotionFrame

固定step simulationと表示補間の一時状態。

| Field                | Type                   | Rules                                |
| -------------------- | ---------------------- | ------------------------------------ |
| `accumulatorMs`      | number                 | 0以上、1 frame最大3 step処理後の残余 |
| `stepMs`             | 16.67                  | 全端末共通                           |
| `previousPosition`   | ContinuousCoordinate   | 有効なwalkable位置                   |
| `currentPosition`    | ContinuousCoordinate   | 有効なwalkable位置                   |
| `interpolationAlpha` | 0..1                   | accumulator/step                     |
| `heldDirection`      | MoveDirection optional | 正規化済み8方向                      |
| `locomotion`         | walk/run               | stamina結果と一致                    |

### State transitions

`idle → inputHeld → simulating → interpolating → idle`

- background復帰の巨大deltaは最大3 stepだけ処理し、残余を安全に破棄して位置飛びを防ぐ。
- gridPositionの確定時だけrun saveをdirtyにする。

## SaveQueueState

既存保存関数へ渡す最新snapshotとdirty状態。

| Field                   | Type                           | Rules                    |
| ----------------------- | ------------------------------ | ------------------------ |
| `persistent`            | QueuedDomain<SaveData>         | 最新snapshotのみ         |
| `run`                   | QueuedDomain<ExplorationState> | 最新snapshotのみ         |
| `route`                 | QueuedDomain<RouteState>       | 最新snapshotのみ         |
| `scheduledAt`           | timestamp optional             | 最初のdirtyから最大250ms |
| `flushInProgress`       | boolean                        | 同時flush禁止            |
| `lastSuccessfulFlushAt` | timestamp optional             | 成功時だけ更新           |
| `lastError`             | sanitized error optional       | payloadを含めない        |

`QueuedDomain<T>`は`dirty`、`latestSnapshot`、`reasons`、`coalescedCount`を持つ。

### State transitions

`clean → dirty → scheduled → flushing → clean`

- 新snapshot到着時は`latestSnapshot`だけ置換し、`coalescedCount`を増加する。
- write失敗時は`dirty`へ戻り、snapshotを保持する。
- `flushNow`はscheduledを待たず全dirty domainをcommitする。
- WAL対象commandはqueue外で`transaction pending → committed/recovered`を完了してから通常queueへ戻る。

## PerformanceSnapshot

dev/E2E/実機診断で取得する集計値。保存payloadやプレイヤー情報を含めない。

| Field                 | Type                       | Rules                                   |
| --------------------- | -------------------------- | --------------------------------------- |
| `sampleWindowMs`      | positive number            | 通常30,000または60,000                  |
| `averageFps`          | number                     | RAF deltaから計算                       |
| `frameDeltaP95Ms`     | number                     | warm-up除外後                           |
| `frameDeltaMaxMs`     | number                     | 同一window                              |
| `inputToPresentP95Ms` | number                     | inputReceiptIdとpresent frameを相関     |
| `gameObjectCount`     | integer                    | Sceneのactive object                    |
| `textObjectCount`     | integer                    | active Phaser Text/BitmapText           |
| `activeChunkCount`    | integer                    | viewport＋overscan                      |
| `saveMeasurements`    | readonly SaveMeasurement[] | reason/domain/bytes/durations/countのみ |

## FontManifest

オフライン文字表示を検証するbuild-time manifest。

| Field                   | Type                  | Rules                               |
| ----------------------- | --------------------- | ----------------------------------- |
| `family`                | `"MinewalkerJP"`      | 全TextStyle共通                     |
| `weights`               | readonly `[400, 700]` | 通常・太字                          |
| `sourceFiles`           | readonly path[]       | WOFF2とOFL license                  |
| `requiredCodePoints`    | readonly integer[]    | player-facing literals/dataから生成 |
| `approvedTextSymbols`   | readonly string[]     | 一般記号だけ                        |
| `forbiddenStateSymbols` | readonly string[]     | icon置換対象                        |

### Validation rules

- required code pointは少なくともどちらかのfont weightに存在する。
- font fileとlicenseがbuild/PWA precacheへ含まれる。
- forbidden state symbolをplayer-facing Phaser Textへ渡さない。
