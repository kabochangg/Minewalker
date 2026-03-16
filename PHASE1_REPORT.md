# Phase 1 実施記録（データモデルの明確化）

## 1. 着手前チェック（AGENTS.md再確認）
- [x] MVP範囲外を追加しない
- [x] 盤面サイズ（16x16/40, 30x16/99）を変更しない
- [x] モバイル縦画面優先のUI方針を守る
- [x] `npm run build` を通す

## 2. 実装内容
- タイル状態型を `src/game/types.ts` に分離。
  - `tileKind`, `isOpen`, `hasMine`, `adjacentMineCount`, `goalState` を持つ `Tile` を定義。
  - `TILE_KIND`, `GOAL_STATE` を定数化し、文字列リテラル依存を削減。
- 方向型と座標加算ユーティリティを `src/game/direction.ts` に追加。
  - `Direction`（up/down/left/right）
  - `addDirectionOffset(position, direction)`
- 盤面設定を `src/game/boardConfig.ts` に分離。
  - `INTERMEDIATE: 16x16 / 40`
  - `EXPERT: 30x16 / 99`
  - `DEFAULT_BOARD_DIFFICULTY` を導入。
- `GameScene` を新しい型へ追従。
  - 旧 `Cell`/`kind`/`hidden`/`revealed`/`adjacentMines` を `Tile` 構造へ置換。
  - 隣接地雷数・開封・描画判定を `hasMine` / `isOpen` / `adjacentMineCount` ベースに統一。

## 3. 未解決課題
- 現行ゲームループはまだ Phase 1 時点のため、Minewalker 固有の移動/向き/叩く仕様（Phase 3）への置換は未着手。

## 4. AGENTS.md更新要否
- 不要。
- 新規定数管理は `src/game` 配下の責務分離で対応できており、現時点で運用ルールの追加明文化は必須でない。

## 5. MVP範囲の明確化（評価用）
Phase 1 の評価観点を、AGENTS.md の MVP要件に合わせて明確化する。

### 5.1 評価対象（今回のフェーズで評価する項目）
- [x] タイル状態を型安全に扱える土台があること（`tileKind`, `isOpen`, `hasMine`, `adjacentMineCount`, `goalState`）。
- [x] 4方向の型定義（up/down/left/right）と座標加算ユーティリティがあること。
- [x] 盤面サイズ定数が `16x16/40` と `30x16/99` として分離されていること。
- [x] 盤面ロジックで、旧来の文字列リテラル分岐依存が縮小され、型経由判定に移行していること。

### 5.2 評価対象外（後続フェーズで評価する項目）
- [ ] プレイヤー移動/向き/叩く（Phase 3 以降）
- [ ] HP/敗北/ゴール可視化と勝利遷移（Phase 4 以降）
- [ ] モバイルUI最適化（Phase 5 以降）

## 6. 評価結果（Phase 1）
- 判定: **Pass（フェーズ1目標を満たす）**
- 根拠:
  1. `src/game/types.ts` でタイル状態の必須フィールドを型定義済み。
  2. `src/game/direction.ts` で4方向型と座標加算ユーティリティを定義済み。
  3. `src/game/boardConfig.ts` で難易度別盤面設定を分離済み。
  4. `src/game/GameScene.ts` が `Tile` 構造と `BOARD_CONFIG` を利用する形に更新済み。
- 備考:
  - 本評価は「フェーズ1の土台整備」に限定。
  - Minewalker固有の操作ループ実装は次フェーズで継続する。
