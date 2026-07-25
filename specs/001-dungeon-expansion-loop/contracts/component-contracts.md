# Component Contracts

## Dependency direction

```text
Phaser Scene
  -> presentation/input components
  -> exploration application coordinator
  -> pure systems
  -> serializable domain components
```

逆方向の依存は禁止する。domain componentsとpure systemsはPhaser型を参照しない。

## Domain component contract

- 状態だけを保持し、描画オブジェクト、コールバック、タイマーを含めない。
- 全フィールドをreadonlyとして扱い、更新は新しい値を返す。
- 保存対象の公開型と公開関数には日本語TSDoc/JSDocを付ける。
- 安定ID、値域、関係制約を生成時とロード時に検証する。

## System contract

各Systemは、入力状態とコマンドから結果を返す。

```text
SystemResult<State>
├── state: 更新後の状態
├── events: 発生したDomainEventの列
├── accepted: コマンドが実行されたか
└── reason: 拒否時の日本語理由
```

- 同じ状態、同じコマンド、同じseedから同じ結果を返す。
- UI、音、振動、Scene遷移を直接実行しない。
- 数量、HP、スタミナ、耐久値を負数にしない。
- 複数Aggregateを変える死亡・回収・確保は、全成功または無変更にする。

## Exploration command contract

| Command           | Required input               | Owner system                       | Main rejection reasons              |
| ----------------- | ---------------------------- | ---------------------------------- | ----------------------------------- |
| Move              | direction, delta, locomotion | MovementSystem                     | blocked, occupied, hidden           |
| Mine              | target coordinate            | MiningSystem                       | not adjacent, marked, no stamina    |
| ToggleDangerMark  | target coordinate            | HazardSystem                       | revealed, invalid target            |
| DisposeHazard     | target coordinate, tool ID   | HazardSystem + ToolSystem          | unmarked, broken tool, no stamina   |
| Attack            | target monster               | CombatSystem                       | out of range, no stamina            |
| TickActiveTime    | active delta                 | StaminaSystem                      | session not active                  |
| ClaimCheckpoint   | checkpoint ID                | CheckpointSystem + TerritorySystem | objective incomplete, no safe route |
| RecoverDeathCache | cache ID                     | DeathRecoverySystem                | wrong position, invalid cache       |
| PauseRun          | none                         | coordinator                        | terminal session                    |
| ResumeRun         | validated save               | coordinator                        | invalid or incompatible save        |

## ExplorationCoordinator contract

- 1つの`ExplorationState`とSystem依存を受け取り、Commandを1件ずつdispatchする。
- CommandごとのSystem実行順を固定し、結果を1つの`SystemResult`へ合成する。
- 死亡、回収、チェックポイント確保では、状態変更後に
  `SaveTransactionSystem`へtransactionを要求する。
- 保存成功後だけ新しい状態とDomainEventを公開する。
- journal作成前の保存失敗時は変更前状態を維持し、日本語の拒否理由を返す。
- journal作成後に保存が中断した場合は`recoveryRequired`となり、新しいCommandを
  受け付けず、同じjournalのroll-forwardを完了してから状態を再公開する。
- `CameraSystem`、`DropSystem`、`SaveTransactionSystem`の責務を代行しない。
- Scene shutdown時はCommand受付とイベント配信を停止する。

## Domain event contract

表示・音・保存は以下のイベントを購読する。

- `TileRevealed`
- `HazardMarked` / `HazardUnmarked`
- `HazardDisposed` / `HazardTriggered`
- `AdjacentCountsChanged`
- `StaminaChanged`
- `ToolDurabilityChanged` / `ToolBroken`
- `ItemAcquired`
- `CheckpointEligible` / `CheckpointClaimed`
- `TerritoryExpanded`
- `PlayerDefeated`
- `DeathCacheCreated` / `DeathCacheRecovered`
- `RunPaused` / `RunCleared`

イベントは結果通知であり、ゲーム規則の追加処理を表示層で行ってはならない。

## Phaser presentation component contract

### DungeonRendererComponent

- `ExplorationState`の盤面、危険マーク、数字、キャラクター、死亡地点を描画する。
- ワールドカメラだけで移動し、HUD GameObjectを所有しない。追従、境界、
  world-to-screen計算はCameraSystemの結果を適用する。
- `DomainEvent`を演出へ変換するが、状態を書き換えない。

### ExplorationHudComponent

- HP、スタミナ、処理道具、耐久値、素材数を表示する。
- UIカメラへ固定し、safe-area内へ収める。
- 値変更イベントまたは状態スナップショットで差分更新する。

### ObjectivePanelComponent

- 現在のチェックポイント、全条件、進捗、未達理由を表示する。
- 隠し条件を持たず、CheckpointComponentだけを表示源にする。

### ActionBarComponent

- 採掘、危険マーク、危険物処理、攻撃、走行切替、バッグを提供する。
- 各主要操作領域を44px以上にする。
- 入力をExplorationCommandへ変換し、規則判定を行わない。

### ExplorationInputComponent

- タッチ、ポインター、キーボードを共通のExplorationCommandへ正規化する。
- 斜め入力を許可するが、角抜け可否はMovementSystemへ委譲する。
- Scene shutdown時に全イベント購読を解除する。

## Scene contract

`ExplorationScene`が担当するのは以下だけとする。

1. 状態の新規作成またはロード。
2. コンポーネントの生成と破棄。
3. 入力コマンドをapplication coordinatorへ渡す。
4. SystemResultを状態、表示、フィードバック、保存へ配信する。
5. 成功・失敗・メニューによるScene遷移。

盤面生成、危険判定、スタミナ、耐久、死亡ドロップ、チェックポイント判定を
Sceneへ直接実装してはならない。

## Dedicated system boundaries

- `CameraSystem`: カメラ追従座標、表示境界、ズーム、world-to-screen変換だけを担当する。
- `DropSystem`: 壁、危険物、宝箱、モンスターの報酬抽選だけを担当し、
  seed付き入力から決定的な結果を返す。
- `SaveTransactionSystem`: journal作成、複数保存領域への書き込み、
  起動時roll-forwardだけを担当する。
