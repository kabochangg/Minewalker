# Minewalker MVP (Phaser 3 + TypeScript + Vite)

スマホ縦画面向けの「マインスイーパー × 拠点拡張RPG」MVPです。

## ディレクトリ構成

```txt
.
├─ index.html
├─ package.json
├─ tsconfig.json
└─ src
   ├─ main.ts
   ├─ styles.css
   └─ game
      └─ GameScene.ts
```

## セットアップ & 実行

```bash
npm install
npm run dev
```

## ビルド

```bash
npm run build
```

## MVP仕様

- 中央開始の安全地帯から、隣接する壁だけ破壊可能
- 壁の中身: safe / mine / ore / heal / core
- safe は周辺8マス地雷数を表示、0なら自動展開
- mine でHP減少、oreで資源増、healで回復
- 長押しでフラグ
- HP 0でゲームオーバー
- core発見でクリア
- UI: 上部ステータス / 中央盤面 / 下部ログ + 強化 + リスタート

## 拡張案

- シード固定のダンジョン生成
- 敵ユニット・拠点設備・クラフト要素
- 永続成長(メタ進行)とステージ制
- 端末バイブレーション / 効果音 / 画面演出
