# UI Flow Contract

## Navigation

```text
Title
├── ゲーム開始
│   ├── つづきから -> Exploration
│   └── はじめから
│       ├── 進行なし -> Area/Difficulty Select
│       └── 進行あり -> Reset Confirmation -> Area/Difficulty Select
└── 設定 -> Settings -> Title

Area/Difficulty Select -> Loadout -> Exploration
Exploration
├── Pause/Menu -> Continue
├── Checkpoint Claimed -> Result/Home or Continue
├── Player Defeated -> Defeat Summary -> Home
└── Save and Exit -> Title
```

## Title contract

- 「ゲーム開始」と「設定」を常時表示する。
- 「ゲーム開始」選択後に「つづきから」「はじめから」を表示する。
- 有効な中断データがない場合、「つづきから」は無効状態と理由を示す。
- 進行がある状態の「はじめから」は、消去対象と確認ボタンを表示する。
- インストール可能な環境ではPWAインストール導線を表示する。
- 更新が利用可能な場合は「更新する」「後で」を表示し、更新前の探索保存に
  失敗した場合は再読み込みしない。

## Area and difficulty contract

- エリアと「優しい」「普通」「難しい」を探索開始前に選べる。
- 選択中の難易度について、マップ規模、危険物、敵強度、宝箱、報酬の傾向を表示する。
- 開始地点安全と数字正確性は難易度で変わらないことを示す。
- 最後に選んだ難易度を次回の初期選択として復元する。

## Exploration HUD contract

常時確認できる情報:

- HP: 赤いバーと現在値/最大値。
- スタミナ: 緑のバーと現在値/最大値。
- 装備中の危険物処理道具。
- 道具耐久値と破損状態。
- 所持素材数またはバッグ使用量。
- 現在のチェックポイント条件と進捗。
- 現在の移動状態が走行か歩行か。
- メニューボタン。

重要情報を色だけで区別せず、数値、ラベル、形状を併用する。

## Exploration action contract

| Action           | Available when                    | Immediate feedback                   |
| ---------------- | --------------------------------- | ------------------------------------ |
| Move             | target is walkable/revealed       | facing and movement start            |
| Run toggle       | session active                    | walk/run label changes               |
| Mine             | adjacent hidden unmarked wall     | stamina change and mining effect     |
| Danger mark      | hidden wall                       | mark appears/disappears              |
| Dispose          | adjacent marked wall, usable tool | stamina and result feedback          |
| Attack           | hostile target in range           | stamina and attack anticipation      |
| Recover          | standing on active death cache    | recovered contents summary           |
| Claim checkpoint | position and conditions valid     | territory expansion and saved notice |

拒否された操作は100ms以内に、理由を日本語で表示する。

## Hazard feedback contract

- `explosive`: 爆発表示、直接HP変化、必要なら敵出現。
- `poison`: 毒アイコン、残り効果、HP変化。
- `gas`: ガス範囲、影響状態、退避可能方向。
- `rockfall`: 落石表示、ダメージまたは新しい障害物。
- 全種類で作動前の正体を未探索状態から直接開示しない。
- 作動または安全処理後は種類と結果を明示する。

## Checkpoint contract

- 条件は探索開始前と探索HUDの両方で同じ文言・数値を表示する。
- 到達済み、条件達成済み、安全経路接続済みを個別に示す。
- 未達時は確保操作を拒否し、不足項目を表示する。
- 確保時は拡張された範囲と保存完了を表示する。

## Defeat and recovery contract

敗北画面は以下を表示する。

- 死亡地点。
- 落とした装備。
- 落とした素材と数量。
- 落とし物が新規ゲーム確定まで保持されること。
- 次回探索での地図マーカー。

死亡地点へ到達した場合は回収内容を確認し、成功後にマーカーを消す。

## Responsive contract

- 設計基準は390×844。
- 320〜430px幅で主要情報と操作を画面内へ収める。
- 上部HUDと下部アクションは固定し、ワールドカメラだけが追従する。
- 主要操作は44px以上、重要文字は12px以上。
- safe-areaへHUDやボタンを侵入させない。
- タッチ、ポインター、キーボードの全入力を同じコマンドへ変換する。

## Input profile contract

設定で以下の操作方式を選択・保存できる。

- `touchJoystick`: 8方向仮想スティックとアクションボタン。
- `touchTap`: 開放済みマスへのタップ移動とアクションモード。
- `keyboard`: 8方向キー割当とアクションキー。

全方式は同じExplorationCommandを生成する。斜め方向、長押し/マーク、
走行切替、キャンセルを操作方式ごとに実行できる。再起動後は選択した方式と
キーバインドを復元し、利用不能な入力方式の場合は安全な既定値を提示する。

## PWA lifecycle contract

- manifest、アイコン、standalone表示要件が揃う場合だけインストール導線を表示する。
- 初回オンライン利用後は、完全なcold startと中断探索再開をオフラインで行える。
- Service Worker更新を検出したら適用前に探索中断保存を要求する。
- 「更新する」は保存成功後に更新・再読み込みし、「後で」は現在の探索を中断しない。
- 更新後は保存版を移行して前回状態を再開できる。
