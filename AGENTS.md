# AGENTS.md

## 目的
このファイルは、Codex / AI エージェントが Minewalker リポジトリで作業する際の共通ガイドラインです。
実装仕様は `GAME_SPEC.md`、操作性要件は `USABILITY.md`、評価記録は `EVALUATION_LOG.md` を参照してください。

## プロジェクト前提
- タイトル: Minewalker
- 対象: iPhone Safari を重視したモバイル縦画面
- デプロイ先: Cloudflare Pages
- 変更後も `npm run build` を通すこと

## 技術スタック
- フレームワーク: Phaser 3
- 言語: TypeScript
- ビルド / 開発サーバー: Vite
- スタイル: `src/styles.css`
- エントリポイント: `src/main.ts`
- メインゲームシーン: `src/game/GameScene.ts`

## ディレクトリ構成
```text
Minewalker/
├─ AGENTS.md
├─ GAME_SPEC.md
├─ USABILITY.md
├─ EVALUATION_LOG.md
├─ README.md
├─ index.html
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ legacy/
│  └─ index.single.html
├─ scripts/
│  └─ render-gamescreen.mjs
├─ artifacts/
│  └─ game-screen.svg
└─ src/
   ├─ main.ts
   ├─ styles.css
   └─ game/
      ├─ GameScene.ts
      ├─ boardConfig.ts
      ├─ boardGenerator.ts
      ├─ constants.ts
      ├─ direction.ts
      └─ types.ts
```

## エージェントの最重要ルール
1. **小さく狙いを絞って変更すること。**
2. **仕様にない無関係な機能を足さないこと。**
3. **モバイル縦画面での見やすさ・操作しやすさを優先すること。**
4. **盤面を主役にし、UI を情報過多にしないこと。**
5. **Cloudflare Pages で配信できる構成を壊さないこと。**
6. **定数化・責務分割を優先し、無関係な大規模リファクタを避けること。**

## スコープ管理
### 明示指示がない限り追加しないもの
- Ore
- 回復アイテム
- ピッケル強化
- 敵
- マルチプレイ
- タイマー
- flag モード
- 複雑な RPG / ストーリー要素

### 変更方針
- 先回りした過剰実装はしない。
- 既存仕様を崩す変更は避ける。
- 仕様解釈が分かれる場合は、まず既存ドキュメントを優先して整合させる。

## 実装ルール
### 品質
- 変更後は `npm run build` を実行して成功を確認する。
- モバイル縦画面での安定動作を優先する。
- プレイヤー向き、数字、ゴール、焼け跡の視認性を落とさない。

### 設計
- 定数は散在させず、調整しやすい位置へ寄せる。
- モジュール分割は「盤面設定」「盤面生成」「入力」「勝敗」「UI」のように責務単位で行う。
- ファイル肥大化を防ぐが、整理目的を超える大規模再編はしない。

### ドキュメント運用
- コーディング指針はこの `AGENTS.md` に集約する。
- ゲーム仕様は `GAME_SPEC.md` に集約する。
- 操作性要件は `USABILITY.md` に集約する。
- 評価観点・評価結果・実行ログは `EVALUATION_LOG.md` に集約する。
- 追加の `.md` を増やす前に、上記4ファイルへ追記できないかを確認する。
