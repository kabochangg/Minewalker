# Data Model: ダンジョン領域拡張ループ

## Design rules

- 全ての保存対象はJSONへ変換可能なreadonlyデータとする。
- 安定IDは`hazard.explosive`、`checkpoint.area.beginnerMine.1`のような
  名前空間付き文字列を使う。
- Phaser GameObject、タイマー、入力オブジェクトはドメイン状態へ含めない。
- 数字、到達可能性、所持量、耐久値は保存後も検証可能な値域を持つ。

## Core value types

### DifficultyId

`easy | normal | hard`

### HazardType

`explosive | poison | gas | rockfall`

### HazardState

`armed | disposed | triggered`

### ExplorationStatus

`active | paused | cleared | failed`

### CheckpointStatus

`locked | eligible | claimed`

### Coordinate

| Field | Type    | Validation                |
| ----- | ------- | ------------------------- |
| x     | integer | 0以上、ダンジョン幅未満   |
| y     | integer | 0以上、ダンジョン高さ未満 |

## Entity: DifficultyDefinition

| Field                     | Type         | Validation               |
| ------------------------- | ------------ | ------------------------ |
| id                        | DifficultyId | 3値のいずれか            |
| label                     | string       | 日本語表示名、空文字不可 |
| widthRange                | integer pair | 5以上、min ≤ max         |
| heightRange               | integer pair | 5以上、min ≤ max         |
| hazardDensity             | number       | 0以上1未満               |
| roomCountRange            | integer pair | 1以上                    |
| monsterCountRange         | integer pair | 0以上                    |
| monsterStrengthMultiplier | number       | 0より大きい              |
| wallDensity               | number       | 0以上1未満               |
| chestCountRange           | integer pair | 0以上                    |
| rewardMultiplier          | number       | 0より大きい              |
| safeRadius                | integer      | 1以上                    |

## Entity: DungeonGenerationConfig

| Field            | Type         | Validation     |
| ---------------- | ------------ | -------------- |
| seed             | string       | 空文字不可     |
| areaId           | AreaId       | 既存エリアID   |
| difficultyId     | DifficultyId | 定義済み難易度 |
| width            | integer      | 難易度範囲内   |
| height           | integer      | 難易度範囲内   |
| entrance         | Coordinate   | 盤面内         |
| safeRadius       | integer      | 1以上          |
| checkpointCount  | integer      | 1以上          |
| generatorVersion | integer      | 1以上          |

**Relationships**: 1つの難易度定義とエリア定義から生成され、1つのDungeonを作る。

**Determinism key**:

`generatorVersion|areaId|difficultyId|seed|width|height|entrance|safeRadius|checkpointCount`

再試行は`:attempt:0`から`:attempt:31`を順番に付ける。32回全てが検証失敗した場合は
生成エラーを返し、不完全なDungeonを開始しない。

## Aggregate: Dungeon

| Field             | Type                              | Validation               |
| ----------------- | --------------------------------- | ------------------------ |
| config            | DungeonGenerationConfig           | 決定性キーが作成可能     |
| tiles             | readonly TileComponent list       | width × height、座標一意 |
| hazards           | readonly HazardComponent list     | ID・座標一意             |
| rooms             | readonly room list                | 盤面内、入口経路と接続   |
| entrance          | Coordinate                        | configと一致、安全域内   |
| checkpoints       | readonly CheckpointComponent list | 1件以上、最終地点最大1つ |
| generationAttempt | integer                           | 0〜31                    |

Tileの`hazardId`とHazardの`position`は一対一で一致しなければならない。

## Entity: TileComponent

| Field               | Type                       | Validation                       |
| ------------------- | -------------------------- | -------------------------------- |
| position            | Coordinate                 | 盤面内で一意                     |
| terrain             | `wall \| floor \| blocked` | 必須                             |
| discovery           | `hidden \| revealed`       | 必須                             |
| mark                | `none \| danger`           | revealed床にはdanger不可         |
| adjacentHazardCount | integer                    | 0〜8                             |
| durability          | integer                    | 0以上                            |
| hazardId            | string or absent           | 対応危険物が存在する場合だけ     |
| itemId              | ItemId or absent           | 対応アイテムが存在する場合だけ   |
| monsterId           | MonsterId or absent        | 対応モンスターが存在する場合だけ |
| checkpointId        | string or absent           | 対応チェックポイントの場合だけ   |

**Derived values**:

- `isWalkable`: revealed floorで、通行阻害物がない。
- `isMineable`: hidden wallで、プレイヤーに隣接する。
- `adjacentHazardCount`: 周囲8マスのarmed危険物数から必ず再計算可能。

## Entity: HazardComponent

| Field            | Type                | Validation         |
| ---------------- | ------------------- | ------------------ |
| id               | stable string       | ダンジョン内で一意 |
| position         | Coordinate          | 対応Tileと一致     |
| type             | HazardType          | 4種のいずれか      |
| state            | HazardState         | 必須               |
| damage           | integer             | 0以上              |
| statusEffect     | optional effect     | 種類と整合         |
| spawnedMonsterId | MonsterId or absent | 生成可能な種類だけ |
| rewardTableId    | string              | 有効な報酬表       |
| requiredToolTier | integer             | 1以上              |

### State transitions

```text
armed --correct disposal--> disposed
armed --unprotected mining--> triggered
disposed --mining--> removed/revealed floor
triggered --effect resolved--> removed/revealed or blocked floor
```

`disposed`と`triggered`は再度作動しない。状態変更後は周囲数字を再計算する。

## Entity: ToolConditionComponent

| Field             | Type        | Validation       |
| ----------------- | ----------- | ---------------- |
| equipmentId       | EquipmentId | 処理対応装備     |
| currentDurability | integer     | 0〜maxDurability |
| maxDurability     | integer     | 1以上            |
| tier              | integer     | 1以上            |
| repairCount       | integer     | 0以上            |

### State transitions

```text
usable --correct disposal--> worn
worn --repeated use--> broken
broken --repair at base--> usable
usable/worn --upgrade at base--> usable with increased limits
```

誤った危険物処理では耐久値を変更しない。

## Entity: PlayerRuntimeComponent

| Field         | Type                           | Validation             |
| ------------- | ------------------------------ | ---------------------- |
| position      | continuous and grid coordinate | 開放済み歩行可能範囲内 |
| hp            | integer                        | 0〜maxHp               |
| maxHp         | integer                        | 1以上                  |
| stamina       | number                         | 0〜maxStamina          |
| maxStamina    | number                         | 1以上                  |
| actionState   | action union                   | 状態遷移に一致         |
| locomotion    | `walk                          | run`                   | 必須 |
| statusEffects | readonly list                  | 重複規則に従う         |
| equipment     | equipped IDs                   | スロットごとに最大1個  |

## Entity: ExplorationInventoryComponent

| Field           | Type               | Validation  |
| --------------- | ------------------ | ----------- |
| capacity        | integer            | 1以上       |
| items           | ItemId→integer map | 全数量0以上 |
| acquiredThisRun | ItemId→integer map | items以下   |
| consumables     | typed counts       | 全数量0以上 |

`acquiredThisRun`は死亡ドロップ計算と帰還確定に使う。

## Entity: CheckpointComponent

| Field                | Type                    | Validation          |
| -------------------- | ----------------------- | ------------------- |
| id                   | stable string           | ダンジョン内で一意  |
| position             | Coordinate              | 対応Tileと一致      |
| status               | CheckpointStatus        | 必須                |
| objectives           | readonly objective list | 1件以上             |
| progress             | objective progress map  | 0〜required         |
| connectedTerritoryId | string or absent        | claimed時に必須     |
| isFinal              | boolean                 | ダンジョンに最大1つ |

### Objective variants

- `reach`: チェックポイントへの到達。
- `disposeHazards`: 正しく処理した危険物数。
- `collectMaterials`: 対象素材の探索中回収数。
- `defeatBoss`: 対象ボス撃破。

### State transitions

```text
locked --all objectives complete and safe route exists--> eligible
eligible --player claims--> claimed
claimed --persist--> permanent territory anchor
```

## Entity: TerritoryState

| Field                 | Type                 | Validation                         |
| --------------------- | -------------------- | ---------------------------------- |
| id                    | stable string        | 一意                               |
| areaId                | AreaId               | 有効                               |
| claimedCheckpointIds  | readonly string list | 重複なし                           |
| tileKeys              | readonly string list | 入口またはclaimed checkpointと連結 |
| legacyEntranceClaimed | boolean              | v2移行時だけtrue                   |
| updatedAt             | ISO date-time        | 有効な日時                         |

確保時は入口・既存陣地から開放済み安全マスを探索し、その接続成分だけを追加する。
グラフは8近傍を使うが、斜め接続は間の横・縦両マスが安全かつ歩行可能な場合だけ
有効とする。

## Entity: DeathCache

| Field       | Type                      | Validation           |
| ----------- | ------------------------- | -------------------- |
| id          | stable string             | 全保存データ内で一意 |
| areaId      | AreaId                    | 有効                 |
| dungeonSeed | string                    | 空文字不可           |
| position    | Coordinate                | 対象ダンジョン内     |
| equipment   | readonly EquipmentId list | 死亡時装備一式       |
| items       | ItemId→integer map        | 数量1以上の項目だけ  |
| status      | `active                   | recovered`           | 必須 |
| createdAt   | ISO date-time             | 有効な日時           |

### State transitions

```text
active --player reaches position and capacity allows atomic recovery--> recovered
active --confirmed new game--> deleted
recovered --save committed--> deleted or retained as audit-free terminal record
```

通常の死亡、アプリ終了、別の死亡ではactiveキャッシュを削除しない。

## Aggregate: ExplorationState

| Field             | Type                                 | Validation                 |
| ----------------- | ------------------------------------ | -------------------------- |
| version           | literal 2                            | 探索中断スキーマ版         |
| status            | ExplorationStatus                    | 必須                       |
| areaId            | AreaId                               | 有効                       |
| difficultyId      | DifficultyId                         | 有効                       |
| dungeon           | Dungeon aggregate                    | 生成後検証済み             |
| player            | PlayerRuntimeComponent               | 位置・値域が有効           |
| inventory         | ExplorationInventoryComponent        | 容量整合                   |
| tools             | readonly ToolConditionComponent list | 装備と整合                 |
| monsters          | readonly monster runtime list        | 座標重複なし               |
| checkpoints       | readonly CheckpointComponent list    | 1件以上                    |
| objectiveProgress | aggregate progress                   | checkpointと整合           |
| deathCaches       | readonly DeathCache list             | 同一ダンジョンのactive項目 |
| elapsedActiveMs   | integer                              | 0以上                      |
| lastTransactionId | string or absent                     | 適用済みjournal ID         |
| savedAt           | ISO date-time                        | 有効                       |

## Aggregate: SaveDataV3

既存v2のplayer、inventory、equipment、base、unlockedAreas、collection、
settings、statisticsを保持し、以下を追加する。

| Field                 | Type                                   | Validation             |
| --------------------- | -------------------------------------- | ---------------------- |
| version               | literal 3                              | 必須                   |
| territories           | AreaId→TerritoryState map              | 解放済みエリアだけ     |
| toolConditions        | EquipmentId→ToolConditionComponent map | 所有処理道具と整合     |
| deathCaches           | readonly DeathCache list               | activeのみ、ID重複なし |
| selectedDifficulty    | DifficultyId                           | 有効                   |
| controlScheme         | control union                          | 対応入力方式           |
| lastTransactionId     | string or absent                       | 適用済みjournal ID     |
| nextOperationSequence | integer                                | 1以上                  |

## Entity: InputProfile

| Field        | Type                            | Validation       |
| ------------ | ------------------------------- | ---------------- |
| mode         | touchJoystick/touchTap/keyboard | 対応する3方式    |
| keyBindings  | action→key map                  | keyboard時に必須 |
| runBehavior  | hold/toggle                     | 必須             |
| markBehavior | longPress/actionButton          | touch方式と整合  |

利用不能な入力方式をロードした場合はデータを削除せず、安全な既定方式を一時選択して
設定画面から変更を促す。

## Migration rules

### SaveData v2 → v3

1. 既存player、inventory、equipment、base、unlockedAreas、collection、
   settings、statisticsを値を変えず保持する。
2. 全ての既存unlocked areaへ、空のtileKeysと`legacyEntranceClaimed: true`を持つ
   `territory.legacy.<areaId>`形式のTerritoryStateを作る。`updatedAt`は旧データの
   `lastSavedAt`を使い、次回生成時にそのエリアの入口安全域をmaterializeする。
3. 所有装備ごとに定義済み最大耐久値を現在耐久値として設定する。
4. `deathCaches`を空配列にする。
5. `selectedDifficulty`を`normal`にする。
6. 既存設定から操作方式を補い、現行スキーマで再検証する。
7. 既にv3なら値を変えず返し、冪等性を保証する。

### RunSaveData v1 → ExplorationState v2

1. field、player、inventory、monsters、boss状態を保持する。
2. 難易度を`normal`にする。
3. config.seedは旧field.seed、config.areaIdは旧areaIdを保持する。欠損する不正な
   fixtureでは`legacy.<width>x<height>.<startX>.<startY>`と`area.beginnerMine`を
   決定的なfallbackとする。
4. generatorVersionを1、generationAttemptを0、既存field寸法・開始座標を
   configへ設定する。safeRadiusは旧開始地点の連続revealed安全域から求め、
   求められない場合はnormal難易度定義の値を使う。
5. 既存mineを`explosive`かつ`armed`なHazardComponentへ変換し、
   `hazard.<x>.<y>.explosive`形式の安定IDを付ける。
6. 全Tileの`adjacentHazardCount`をarmed危険物から再計算する。
7. 装備からToolConditionComponentを生成する。
8. 既存出口を`checkpoint.legacy.<x>.<y>`へ変換し、reach条件のrequired=1、
   到達済みならprogress=1、未到達なら0にする。
9. checkpointがない旧盤面では旧出口座標を最終checkpointとして必ず1件作り、
   config.checkpointCountを変換後のcheckpoint件数へ設定する。
10. activeな永続DeathCacheを該当ダンジョンへ関連付ける。
11. 既にv2なら値を変えず返し、現行スキーマで再検証する。

## Entity: SaveTransactionRecord

| Field              | Type                             | Validation           |
| ------------------ | -------------------------------- | -------------------- |
| version            | literal 1                        | 必須                 |
| id                 | stable string                    | 操作ごとに一意       |
| operation          | death/recovery/checkpointClaim   | 必須                 |
| phase              | transaction phase                | 必須                 |
| nextPersistentSave | SaveDataV3                       | 現行スキーマ検証済み |
| nextRunSave        | ExplorationState or clear marker | 現行スキーマ検証済み |
| createdAt          | ISO date-time                    | 有効                 |

phaseは`prepared → persistentWritten → runWritten → committed`と進む。
各更新後Aggregateへ同じ`lastTransactionId`を記録し、同じjournalの再適用を
無害にする。起動時にcommitted未満のjournalを検出した場合は更新後スナップショットへ
roll-forwardする。

DeathCache IDは`death.<nextOperationSequence>`、transaction IDは
`tx.<operation>.<nextOperationSequence>`とし、確定する更新後SaveDataでsequenceを
1増やす。時刻やランダムUUIDを一意性へ利用しない。
