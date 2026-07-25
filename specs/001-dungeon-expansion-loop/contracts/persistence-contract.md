# Persistence Contract

## Storage domains

| Domain                 | Current                     | Target                      | Purpose                          |
| ---------------------- | --------------------------- | --------------------------- | -------------------------------- |
| Persistent progression | `minewalker.save.v2`        | `minewalker.save.v3`        | 拠点、装備、領域、死亡地点、設定 |
| Persistent backup      | `minewalker.save.v2.backup` | `minewalker.save.v3.backup` | 直前の正常保存                   |
| Interrupted run        | `minewalker.run.v1`         | `minewalker.run.v2`         | 探索終了直前の完全状態           |
| Interrupted backup     | `minewalker.run.v1.backup`  | `minewalker.run.v2.backup`  | 直前の正常中断保存               |
| Transaction journal    | なし                        | `minewalker.tx.v1`          | 複数領域更新のroll-forward       |

旧キーは移行完了を確認するまで削除しない。

## Write contract

1. 保存対象を現行スキーマで検証する。
2. 現行主データが正常ならバックアップへ移す。
3. 新データを主キーへ書く。
4. 書き込み後に読み戻して版と必須IDを確認する。
5. 失敗時は既存主データとバックアップを保持し、ゲームへ失敗を返す。

## Read contract

1. 現行主データを解析・検証する。
2. 失敗時は現行バックアップを試す。
3. 現行データがない場合は旧主データ、旧バックアップの順で試す。
4. 旧データは段階的に現行版へ移行し、現行スキーマで再検証する。
5. 全候補が失敗した場合だけ、安全な新規開始を案内する。

解析エラーを握り潰して初期化してはならない。ユーザーへ復元不能であることを示す。

## Atomic domain operations

複数領域操作は以下のwrite-ahead手順を共通利用する。

1. 両方の更新後スナップショットを検証し、同じtransaction IDを付ける。
2. phase=`prepared`のjournalを保存して読み戻す。
3. 永続進行を書き、phase=`persistentWritten`へ進める。
4. 探索中断を書き、phase=`runWritten`へ進める。
5. 両方を読み戻してtransaction IDとスキーマを検証する。
6. phase=`committed`にしてjournalを削除する。

起動時に未完了journalがあれば、保存された更新後スナップショットを両領域へ
再適用して完了する。同じtransaction IDが適用済みなら重複処理しない。
各書き込み直後の停止を障害注入試験で検証する。

### Death

同一の状態更新単位で以下を行う。

1. 装備中の処理道具、武器、防具をプレイヤーから外す。
2. 探索中取得素材の50%を端数切り上げでインベントリから差し引く。
3. 同じ内容を持つ一意なDeathCacheを死亡座標へ作る。
4. Runをfailedにし、永続データへDeathCacheを保存する。
5. 自陣復帰状態を保存する。

メモリ上では保存完了まで変更前状態を公開しない。journal作成後の停止は、
次回起動時に更新後状態へroll-forwardする。

### Recovery

1. activeなDeathCacheと座標一致を検証する。
2. 全装備・素材を重複なくプレイヤーへ戻せることを検証する。
3. 全内容を移し、cacheをrecoveredにする。
4. 永続データと探索中断データを同じ論理操作として保存する。

部分回収は行わない。容量不足の場合は回収せず、理由を表示する。

### Checkpoint claim

1. 全目的と安全経路を検証する。
2. checkpointをclaimedへ変更する。
3. 接続する開放済み安全マスをTerritoryStateへ追加する。
4. 永続進行を保存し、その後に探索中断状態を更新する。

全手順を同じjournal transactionとして実行し、再適用時も同じ領域を二重追加しない。

## New game deletion contract

- 消去対象として永続領域、探索中断、死亡地点、探索取得物を一覧表示する。
- 明示的な確認前は何も削除しない。
- 確認後も音量、操作、アクセシビリティ設定は保持する。
- 削除完了後に新しいv3永続データと空のv2探索領域を作る。

## Validation invariants

- versionは期待するliteralと一致する。
- Tile数はwidth × heightと一致する。
- 全Coordinateは盤面内である。
- 周囲危険物数は0〜8で、armed危険物から再計算した値と一致する。
- プレイヤー位置は開放済み歩行可能マスである。
- HP、スタミナ、耐久値、所持数は有効範囲内である。
- checkpoint、hazard、death cacheのIDは重複しない。
- claimed checkpointはTerritoryStateに含まれる。
- active DeathCacheの内容は空ではない。
- Tile.hazardIdとHazard.positionが一対一で一致する。
- lastTransactionIdは両Aggregateで一致するか、どちらにも存在しない。

## Migration retention and idempotency

- v2永続データの全`unlockedAreas`、settings、collection、statisticsを保持する。
- 各解放エリアへ`territory.legacy.<areaId>`の入口アンカーを作り、
  `updatedAt`へ旧`lastSavedAt`を使って次回生成時に入口安全域へ変換する。
- v1探索データの地雷変換後に全数字を再計算する。
- v1のseed/areaIdを保持し、欠損時は決定的fallback、safeRadiusは旧安全域または
  normal既定値、checkpointCountは変換後件数を使う。
- v1出口から安定IDの最終checkpointとreach進捗を作る。
- 現行版へ同じ移行関数を再適用しても結果が変わらない。
- 新主データと新バックアップの読み戻しが成功するまで旧キーを削除しない。
