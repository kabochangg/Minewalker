# Codex 作業規約（AGENTS.md）

## 1. 役割

あなたはMinewalkerの実装担当エージェントである。

目的は、モック画像を再現することだけではない。  
**遊べるゲームとして完成させ、テストし、ビルドし、PWAとして公開可能な状態にすること**が目的である。

---

## 2. 作業開始時の必須手順

作業前に必ず以下を読む。

1. `PLAN.md`
2. `SKILL.md`
3. `ART_ASSET_SPEC.md`
4. 既存コード
5. 既存テスト
6. package.json
7. READMEがある場合はREADME

既存実装と矛盾する変更は避ける。  
仕様が曖昧な場合は、ゲームとして自然で、実装が単純で、将来拡張しやすい案を選ぶ。

---

## 3. 実装方針

### 優先順位

1. ゲーム進行が成立する
2. ロジックが正しい
3. スマホで操作できる
4. セーブできる
5. 見た目をモックへ近づける
6. 演出を追加する

### 原則

- 小さな単位で実装する
- 各フェーズ終了時に動作確認する
- 主要ロジックにはテストを書く
- UIだけ作って処理を未実装のままにしない
- 仮アセットでもゲームを止めない
- TODOを残す場合は理由と完了条件を書く

---

## 4. コーディング規約

### TypeScript

- `strict: true`
- `any`禁止を原則とする
- 型はドメイン単位で定義する
- enum乱用を避け、必要に応じてunion typeを使う
- 不変データはreadonly
- マジックナンバーは設定ファイルへ移す
- 関数は1責務
- 早期returnを優先
- 例外メッセージは原因が分かる内容にする

### 命名

- ファイル: `camelCase.ts` または `PascalCase.ts`
- クラス: PascalCase
- 関数: camelCase
- 定数: UPPER_SNAKE_CASE
- ID: `area.beginnerMine` のような安定IDを使用
- 画像ファイル: kebab-case

### CSS

- スマホ縦画面を基準
- CSS変数を使う
- safe-areaを考慮
- タップ領域は最低44px
- 文字サイズは最低12px
- UIの重要情報は画像内テキストに依存しない

---

## 5. 推奨ディレクトリ

```text
src/
  app/
  game/
    scenes/
    systems/
    entities/
    components/
    map/
    combat/
    mines/
  ui/
    screens/
    components/
    styles/
  data/
  assets/
    sprites/
    tiles/
    ui/
    effects/
    audio/
  save/
  tests/
  utils/
public/
  icons/
  manifest/
docs/
```

---

## 6. シーン構成

最低限以下を分離する。

- BootScene
- PreloadScene
- TitleScene
- HomeScene
- AreaSelectScene
- LoadoutScene
- ExplorationScene
- ResultScene
- CollectionScene
- SettingsScene

探索画面の機能はSceneへ直接書き込まず、以下へ分離する。

- MinefieldSystem
- MovementSystem
- MiningSystem
- MineHandlingSystem
- CombatSystem
- DropSystem
- InventorySystem
- CameraSystem
- SaveSystem

---

## 7. マインスイーパーロジック

### 必須

- 地雷生成と数字計算は純粋関数として実装
- 盤面生成時に開始地点周辺を安全にする
- 数字は周囲8方向を対象
- 地雷数と数字の整合性をテストする
- デバッグ用に固定seedを利用可能にする
- 本番ではseedをランダム生成する

### テスト例

- 地雷0個の盤面
- 角に地雷1個
- 中央に地雷1個
- 複数地雷
- 盤面端
- 開始地点安全保証
- 同一seedで同一盤面

---

## 8. カメラ・表示

- プレイヤーを画面中央付近に追従
- 上部HUDと下部アクションバーは固定
- カメラはゲームワールドのみ移動
- 俯瞰距離を維持
- 過度なズームは禁止
- 画面外のマスを必要に応じて遅延描画
- 32pxタイルを基本とする
- 低解像度レンダーを拡大し、pixelated表示を使う

CSS例:

```css
canvas {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
```

---

## 9. UI仕様

### 色

- HP: 赤
- スタミナ: 緑
- コイン: 黄
- 数字1: 青
- 数字2: 緑
- 数字3: 赤
- 数字4: 紫

### HUD

上部:

- HP
- スタミナ
- コイン
- バッグ
- 深度
- メニュー

下部:

- ツルハシ
- 冷却
- 解除
- 地図
- バッグ

### メニュー

- 続ける
- 拠点へ戻る
- 持ち物
- 設定
- あきらめる

---

## 10. アセット利用

- `ART_ASSET_SPEC.md`を正とする
- 仮素材は明確にplaceholderと分かる名前を使う
- 画像生成モックをゲーム背景にしない
- スプライトシートはフレームサイズを統一
- 透過PNGを使用
- nearest-neighborで拡大
- 色数を抑える
- UIアイコンは同一視点、同一光源、同一輪郭幅

---

## 11. セーブ

- セーブデータにversionを持たせる
- ロード時にバリデーションする
- 破損時はバックアップを試す
- 自動保存:
  - 探索終了
  - 強化実行
  - 装備変更
  - 設定変更
- 探索中断データは別領域へ保存
- セーブ移行関数を用意する

---

## 12. テスト

### Unit

- 盤面生成
- 地雷数計算
- 採掘判定
- 冷却判定
- 解除判定
- ダメージ計算
- ドロップ抽選
- 強化コスト
- セーブ移行

### E2E

最低以下を自動化する。

1. タイトルからプレイ
2. 探索先選択
3. 装備選択
4. 探索開始
5. 壁破壊
6. 冷却
7. アイテム取得
8. 出口到達
9. リザルト
10. 拠点へ戻る

---

## 13. 完了報告

各タスク終了時に以下を報告する。

```md
## 実装内容

- ...

## 変更ファイル

- ...

## 動作確認

- npm run lint
- npm run test
- npm run build
- npm run e2e

## 未完了

- ...

## 次に行うこと

- ...
```

---

## 14. 自律判断

以下は確認不要で進めてよい。

- 軽微なUI調整
- 型安全性改善
- テスト追加
- リファクタリング
- 明確なバグ修正
- 仮アセット作成
- モバイル表示の修正

以下は勝手に変更しない。

- ゲームタイトル
- 中核ルール
- 縦画面方針
- マインスイーパー要素
- 冷却・解除要素
- 拠点成長要素
- 課金モデル
- セーブ互換性を壊す変更

---

## 15. 最終確認

完成と判断する前に以下を実施する。

- 全テスト成功
- 本番ビルド成功
- 主要画面の実機相当サイズ確認
- PWAインストール確認
- オフライン起動確認
- セーブ再読込確認
- 30分以上の通しプレイ
- ゲーム進行不能バグ確認
- README更新
