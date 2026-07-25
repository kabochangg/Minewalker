# Save Coordination Contract

## Public interface

```ts
type SaveDomain = "persistent" | "run" | "route";

interface SaveCoordinator {
  markDirty(domain: SaveDomain, snapshot: unknown, reason: string): void;
  flushDomain(domain: SaveDomain, reason: string): Promise<FlushResult>;
  flushAll(reason: FlushReason): Promise<FlushResult>;
  getStatus(): SaveCoordinatorStatus;
}
```

## Scheduling

- memory stateはcommand完了時に同期更新する。
- 同じdomainの未保存snapshotは最新値へ置換し、最初のdirtyから最大250ms以内に1回commitする。
- visual patchを適用した最初のpresent frameより前に、通常のlocalStorage書込みを開始しない。
- `visibilitychange=hidden`、`pagehide`、Scene shutdown、メニュー遷移、PWA update前は`flushAll`する。
- PWA updateは`flushAll`成功後だけreloadを許可する。

## Critical transactions

- 死亡、死亡キャッシュ回収、checkpoint claimは既存WALを即時使用する。
- critical transactionをdebounce、coalesce、並べ替えしない。
- journal recovery中は新commandを受け付けない。
- transaction失敗時は画面遷移せず、既存のcommitted stateを維持する。

## Compatibility

- `minewalker.save.v3`、`minewalker.run.v2`、`minewalker.tx.v1`とbackup/旧keyを変更しない。
- SaveData v3、ExplorationState v2、journal v1を変更しない。
- 現行validation、migration、primary→backup→writeの順序を維持する。
- 低水準save/load関数は互換APIとして残し、通常application codeからはCoordinator経由で呼ぶ。

## Failure behavior

- commit失敗時はdirty snapshotを保持し、last successful timestampを更新しない。
- navigation/updateなど保存必須操作は失敗を通知して停止する。
- telemetryへpayloadを記録せず、domain、reason、bytes、duration、coalesced countだけを記録する。
