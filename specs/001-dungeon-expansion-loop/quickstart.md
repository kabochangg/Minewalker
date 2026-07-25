# Quickstart Validation: ダンジョン領域拡張ループ

## Purpose

このガイドは、実装後に中核ループ、コンポーネント境界、セーブ移行、
モバイル表示、オフライン再開を一連で検証するための手順である。

## Prerequisites

- Node.js 20以上
- 依存パッケージのインストール
- Chromiumを含むE2E実行環境

```powershell
npm.cmd install
npx.cmd playwright install chromium
```

## Static quality gates

```powershell
npm.cmd run format
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

期待結果:

- TypeScript strict検査に成功する。
- 明示的な`any`違反がない。
- 全ユニットテストが成功する。
- 本番PWAビルドが生成される。

## Scenario 1: Deterministic dungeon generation

1. 固定seedで各難易度を100回以上生成する試験を実行する。
2. 同じseedと難易度で盤面が一致することを確認する。
3. 開始安全域、数字、ID重複、チェックポイント到達可能性を確認する。
4. 10,000盤面のsoak試験を実行する。
5. attempt 0〜31を意図的に失敗させ、同じ失敗列と最終エラーになることを確認する。

期待結果:

- 開始地点周辺に危険物がない。
- 全数字がarmed危険物の周囲8マス数と一致する。
- 入口から少なくとも1つのチェックポイントへの経路が存在する。
- 生成不能状態、例外、無限再生成がない。
- stable IDへ時刻やランダムUUIDが混入しない。

## Scenario 2: Mark, dispose, and dynamic numbers

1. 危険物の位置が既知の小規模盤面を開始する。
2. 危険壁へマークを付け、通常採掘が拒否されることを確認する。
3. 正しい危険物処理を行う。
4. 誤った壁でも処理を試す。
5. 危険物0個、角1個、中央1個、複数、盤面端、処理後、作動後の数字を検査する。

期待結果:

- マークは同じ操作で解除できる。
- 正しい処理だけが道具耐久値を減らし、高価値報酬の対象になる。
- 誤処理はスタミナだけを減らす。
- 処理後の周辺数字が現在のarmed危険物数へ更新される。
- Tile.hazardIdとHazard.positionが一対一で一致する。

## Scenario 3: Movement, running, and stamina

1. 8方向入力を順番に行う。
2. 斜め角の片側を壁にし、角抜けを試す。
3. 歩行と走行を同じ時間だけ続ける。
4. メニューを開き、アプリを非表示にしてから戻る。

期待結果:

- 開放済み歩行可能マスだけを移動する。
- 塞がれた斜め角を通過しない。
- 歩行はスタミナを消費せず、走行だけが消費する。
- アクティブ探索中だけ時間回復し、メニュー・非表示時間は加算されない。

## Scenario 4: Checkpoint and territory

1. 到達だけのチェックポイントを確保する。
2. 危険物処理数または素材数が不足した状態で条件付き地点へ到達する。
3. 条件達成後に再度確保する。
4. アプリを再起動する。
5. 孤立した開放島、斜め接触、斜め角の片側だけが壁の盤面を検査する。

期待結果:

- 条件不足時は不足項目を表示して確保しない。
- 条件達成かつ安全経路接続時だけ確保する。
- 入口・既存陣地と連結した開放範囲だけが自陣になる。
- 斜め接続は両側の直交マスが歩行可能な場合だけ領域へ含まれる。
- 再起動後も確保範囲と進捗が保持される。

## Scenario 5: Defeat, save, and recovery

1. 装備と探索中取得素材を持った状態でHPを0にする。
2. 敗北画面と自陣復帰状態を確認する。
3. アプリを終了・再起動する。
4. 死亡地点へ再到達して回収する。
5. 素材数1・2・3の丸め、装備のみ、素材なし、複数死亡地点を個別に試す。
6. 容量不足、二重回収、transaction各phase直後の停止と再起動を試す。

期待結果:

- 装備中の道具・武器・防具と探索取得素材50%端数切り上げが死亡地点へ移る。
- 死亡地点と内容が再起動後も保持される。
- 回収は一度だけ全量で行われ、重複や欠損がない。
- 別の死亡が起きても既存の未回収地点は消えない。
- 障害後はroll-forwardし、装備・素材・領域が重複または欠損しない。

## Scenario 6: Save migration and corruption fallback

1. v2永続セーブをv3としてロードする。
2. v1探索中断セーブをv2としてロードする。
3. 現行主データだけを破損させる。
4. 主データとバックアップの両方を破損させる。
5. 複数エリア解放済みの完全v2、最小v2、無効v2、完全v1、最小v1を移行する。
6. 移行を同じデータへ2回適用し、旧キー保持を確認する。

期待結果:

- 旧進行、装備、素材、設定を保持して新フィールドを補う。
- 全unlockedAreasが保持され、各エリアにlegacy入口アンカーが作られる。
- 旧地雷は爆発危険物へ、旧出口は到達条件の最終チェックポイントへ変換される。
- 2回目の移行で結果が変わらず、新主データ検証前に旧キーが消えない。
- 主データ破損時はバックアップを復元する。
- 全候補が破損した場合だけ、理由を表示して新規開始を案内する。

## Scenario 7: Title and resume

1. 中断データなしでタイトルを開く。
2. 中断データを作り「つづきから」を選ぶ。
3. 進行がある状態で「はじめから」を選び、最初はキャンセルする。
4. 再度選び、消去を確定する。

期待結果:

- データなしでは「つづきから」が無効で理由を示す。
- 再開時は位置、盤面、HP、スタミナ、耐久、敵、目的、死亡地点が一致する。
- キャンセル時は何も消えない。
- 確定時だけ進行と死亡地点を消し、音量と操作設定は保持する。

## Scenario 8: Mobile and offline E2E

```powershell
npm.cmd run e2e
```

320×844、390×844、430×932相当で以下を確認する。

- タイトル、難易度選択、探索、敗北、回収、チェックポイント、拠点へ遷移できる。
- HUDとアクションが欠けず、主要操作領域が44px以上である。
- 入力から100ms以内に視覚反応が始まる。
- 初回オンライン起動後、オフラインで起動・再開できる。
- touchJoystick、touchTap、keyboardの各方式で8方向、マーク、走行、
  アクションを実行でき、再読み込み後も設定が保持される。

## Scenario 9: PWA install and update

1. 本番ビルドのmanifest、192/512/maskable icon、standalone表示を検査する。
2. 対応端末でインストールし、ホーム画面からcold startする。
3. 探索中に新しいService Workerを待機状態にする。
4. 「後で」を選び、探索を継続する。
5. 再度通知から「更新する」を選ぶ。
6. 保存失敗を注入して更新を試す。

期待結果:

- インストール可能性検査が成功し、standaloneで起動する。
- 更新適用前に中断保存し、更新後に同じ探索を再開する。
- 「後で」は探索を中断しない。
- 保存失敗時は再読み込みせず、再試行可能な通知を表示する。

## Component boundary review

[component-contracts.md](contracts/component-contracts.md)に従い、次を確認する。

- domain componentsとsystemsがPhaserをimportしていない。
- Sceneに危険判定、スタミナ、耐久、死亡、チェックポイントの規則がない。
- 表示コンポーネントが状態を直接変更していない。
- 新規・変更公開APIに日本語TSDoc/JSDocがある。

## Required unit-test inventory

- `dungeonGenerator.test.ts`: 同一入力、派生attempt、上限32回、開始安全域、
  checkpoint到達性、stable ID。
- `camera.test.ts`: 追従座標、world境界、ズーム制約、world-to-screen変換。
- `drop.test.ts`: 同一seedの決定性、壁・危険物・宝箱・モンスターの報酬表、
  難易度倍率、空報酬。
- `hazard.test.ts`: 0個、角1個、中央1個、複数、盤面端、処理後、作動後、
  Tile/Hazard一対一。
- `movement.test.ts`: 8方向、未探索、壁、占有、斜め両側開放、片側閉鎖。
- `stamina.test.ts`: 歩行、走行、行動費用、時間回復、pause、非表示、上限・下限。
- `tool.test.ts`: 正解処理、誤処理、耐久0、修理、強化、tier不足。
- `checkpoint.test.ts`: 全目的組合せ、孤立島、8近傍、角抜け禁止、冪等な確保。
- `deathRecovery.test.ts`: ItemIdごとの50%端数切り上げ、装備のみ、素材なし、
  複数cache、容量不足、二重回収。
- `saveTransaction.test.ts`: journal各phase後の停止、再起動roll-forward、
  transaction再適用、主/backup破損。
- `save.test.ts`: 最小・完全・無効なv2/v1 fixture、複数解放エリア、
  settings保持、seed/areaId/safeRadius/checkpointCount fallback、
  legacy timestamp、移行冪等性、旧キー保持。
- `applicationCoordinator.test.ts`: Command順序、System合成、保存成功前の非公開、
  recoveryRequired中のCommand拒否。

## 2026-07-25 実装検証結果

### 自動検証

- `npm.cmd run format`: 成功。Prettier対象ファイルは全て整形済み。
- `npm.cmd run lint`: 成功。ESLintエラー0件。
- `npx.cmd tsc --noEmit`: 成功。TypeScript strict検査エラー0件。
- `npm.cmd run test -- --run`: 成功。25ファイル、109テスト成功。
- 1,800状態の30分相当盤面soak: 成功。
- easy・normal・hard合計10,000ダンジョンの安全域・数字・ID・到達性soak:
  成功（約10秒）。
- `npm.cmd run build`: 成功。PWA manifest、Service Worker、22件のprecacheを生成。
- `npm.cmd run e2e`: 320×844、390×844、430×932で51/51成功。

### E2Eで確認した経路

- タイトルから新規開始、エリア、装備、探索、採掘、危険物処理、素材入手、
  チェックポイント、リザルト、拠点帰還。
- 新規開始のキャンセルと確定、設定保持。
- 難易度と入力方式の保存。
- 8方向仮想スティック。
- 中断探索保存と再読込。
- マーク保護、誤処理、正解処理、耐久値、走行スタミナ、道具修理。
- 複数死亡キャッシュの作成、一括回収、二重回収防止。
- 3難易度それぞれの安全なダンジョン起動とキーボード移動。
- PWA production shellのオフライン再読込。
- 5主要画面の3表示サイズキャプチャ。

### 目視確認

- 390×844相当の探索画面でHUD、数字、プレイヤー、壁、下部操作が欠けない。
- 390×844相当のエリア選択で難易度、4エリア、解放状態が判読できる。
- 操作領域は44px以上、最小表示文字は12px以上を維持する。
- Canvasはpixelated表示で、worldカメラと固定HUDが分離される。

### PWA確認

- manifestはstandalone・portrait・192/512/maskable iconを含む。
- Service Workerは本番ビルドで生成される。
- 初回オンラインキャッシュ後のoffline reloadに成功。
- 更新通知の「あとで」と「更新」を実装し、更新適用前の保存失敗時はreloadしない
  ことをユニットテストで確認。
