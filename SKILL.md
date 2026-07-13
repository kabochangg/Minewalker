# Minewalker 実装スキル（SKILL.md）

## 1. このファイルの目的

本ファイルは、Minewalkerを完成させるために必要な実装技術、判断基準、作業手順を定義する。

Codexは各タスクで本ファイルを参照し、場当たり的な実装を避ける。

---

## 2. 必要スキル

### フロントエンド

- TypeScript
- Vite
- HTML
- CSS
- Responsive Design
- PWA
- Service Worker

### ゲーム開発

- Phaser 3
- Tilemap
- Sprite Animation
- Camera Follow
- Input Handling
- Collision
- State Machine
- Scene Management
- Object Pooling

### ゲームロジック

- マインスイーパー盤面生成
- 8近傍探索
- 乱数seed
- 確率ドロップ
- ダメージ計算
- 成長曲線
- インベントリ
- セーブ移行

### 品質

- Vitest
- Playwright
- ESLint
- Performance Profiling
- Mobile Debugging

---

## 3. 標準作業フロー

1. 仕様を読む
2. 既存コードを確認
3. 実装対象を小さく分解
4. 型とデータ構造を先に定義
5. ロジックを純粋関数で実装
6. Unit Testを書く
7. PhaserまたはUIへ統合
8. 実機相当サイズで確認
9. E2Eを追加
10. ビルド確認
11. 変更内容を記録

---

## 4. マインフィールド生成

### 入力

```ts
interface MinefieldConfig {
  width: number;
  height: number;
  mineCount: number;
  safeRadius: number;
  seed: string;
  startX: number;
  startY: number;
}
```

### 出力

```ts
interface Minefield {
  width: number;
  height: number;
  tiles: Tile[];
  seed: string;
}
```

### 必須条件

- 開始地点からsafeRadius内に地雷を置かない
- 地雷重複を許可しない
- 盤面外を参照しない
- 全数字を生成後に検証する
- 同じseedなら同じ盤面
- 地雷密度はエリア難易度で変える

---

## 5. 採掘処理

### 標準フロー

1. 対象マスをタップ
2. プレイヤーとの隣接判定
3. 行動可能状態か確認
4. スタミナ確認
5. 壁耐久値を減少
6. 破壊判定
7. 地雷状態判定
8. ドロップ抽選
9. マスを床へ変換
10. ナビゲーション更新
11. 自動保存候補へ登録

---

## 6. 地雷処理

### 状態遷移

```text
mineWall
  ├─ long press → flaggedMine
  ├─ cooling → cooledMine
  ├─ disable → disabledMine
  └─ mining → explosion
```

### 冷却

- 消耗品を1個消費
- 成功後は青い視覚効果
- 冷却済み状態を保存
- 破壊時に爆発しない
- レアドロップ補正を付与可能

### 解除

- 解除装置を1個消費
- 恒久的に無効化
- 破壊前でも通過不可
- 破壊後に床へ変化

---

## 7. 戦闘

### プレイヤー状態

```ts
type PlayerActionState =
  "idle" | "moving" | "mining" | "attacking" | "damaged" | "usingItem" | "dead";
```

### 敵AI

初期版:

- 待機
- 索敵
- 接近
- 攻撃
- 被弾
- 死亡

### 攻撃

- 隣接マスまたは短距離
- クールダウンあり
- ダメージ = max(1, 攻撃力 - 防御力補正)
- クリティカルは将来拡張
- 敵HPバーを表示

---

## 8. ドロップ

```ts
interface DropEntry {
  itemId: string;
  weight: number;
  min: number;
  max: number;
  conditions?: DropCondition[];
}
```

- weight方式
- 0件ドロップも許可
- レア発見率でweight補正
- 地雷処理方法で補正可能
- ボスは確定ドロップを持つ

---

## 9. インベントリ

### ルール

- スロット制ではなく容量制を基本とする
- 同一素材はスタック
- 装備は個別管理
- 探索中の容量超過は禁止
- 超過時は取得確認を出す
- 破棄可能
- 重要アイテムは破棄不可

---

## 10. UI実装

### レイアウト

- Canvas: ゲームワールド
- HTML/CSS: HUDとメニュー
- 重要UIはDOM側へ置く
- Phaser内テキストはゲーム内数字や吹き出しに限定

### レスポンシブ

基準:

```text
390 × 844
```

対応:

```text
320 × 568
375 × 667
390 × 844
414 × 896
430 × 932
```

### セーフエリア

```css
padding-top: env(safe-area-inset-top);
padding-bottom: env(safe-area-inset-bottom);
```

---

## 11. ピクセルアート表示

- 内部解像度は低めにする
- スケーリングは整数倍を優先
- アンチエイリアスを無効化
- スプライトの座標を整数へ丸める
- 画像補間を無効化
- ぼかしや過剰なグローを避ける

Phaser例:

```ts
const config: Phaser.Types.Core.GameConfig = {
  pixelArt: true,
  antialias: false,
  roundPixels: true,
};
```

---

## 12. パフォーマンス

目標:

- 60fps
- 初回ロード3秒以内を目標
- JSバンドルを分割
- 画像をWebPまたは最適化PNG
- 未使用アセットを遅延ロード
- エフェクトはオブジェクトプール
- 画面外オブジェクトの更新頻度を下げる
- DOM更新を最小化

---

## 13. PWA

必須:

- manifest
- 192px icon
- 512px icon
- maskable icon
- theme color
- background color
- standalone
- Service Worker
- オフラインキャッシュ
- 更新通知

注意:

- セーブデータはキャッシュと分離
- Service Worker更新でセーブを消さない
- 古いアセットキャッシュを整理する

---

## 14. デバッグ機能

開発環境のみ以下を提供する。

- seed固定
- 地雷表示
- 無敵
- スタミナ無限
- アイテム付与
- 深度変更
- ボス部屋へ移動
- セーブ初期化
- FPS表示
- タイル座標表示

本番ビルドでは非表示にする。

---

## 15. バランス初期値

### プレイヤー

- HP: 100
- スタミナ: 50
- 攻撃力: 10
- 防御力: 3
- バッグ: 30

### 採掘

- 通常壁消費: 1
- 強化壁消費: 2
- 冷却剤初期所持: 3
- 高性能解除装置初期所持: 2
- 回復薬初期所持: 3

### 地雷

- 通常地雷ダメージ: 25
- 強化地雷ダメージ: 45
- 連鎖半径: 1
- 素材ドロップ補正: 1.5

これらは`src/data/balance.ts`へ集約する。

---

## 16. アクセシビリティ

- 色だけで状態を伝えない
- 数字には色と形状差を持たせる
- 音量調整
- 振動ON/OFF
- 点滅軽減
- 文字サイズ設定
- 長押し時間設定
- UI拡大設定
- 左利きモードを将来対応可能な構造にする

---

## 17. 完成判定

次の状態を満たすまで「完成」と言わない。

- 全主要画面がある
- 主要ループを3周以上プレイ可能
- 4エリア実装済み
- 1ボス実装済み
- セーブ可能
- PWA化済み
- オフライン起動可能
- テスト成功
- 本番ビルド成功
- 既知の進行不能バグなし
