# Minewalker (Phaser 3 + TypeScript + Vite)

将来的な拡張（シーン追加・敵追加・拠点施設追加・セーブ追加）を見据えた、URL公開型スマホブラウザゲーム構成です。  
メイン実装は **Phaser 3 + TypeScript + Vite** です。

> 旧「単一HTML直開き版」は `legacy/index.single.html` に退避しています（バックアップ）。

## ディレクトリ構成

```text
Minewalker/
├─ legacy/
│  └─ index.single.html      # 旧 単一HTML版（バックアップ）
├─ src/
│  ├─ game/
│  │  └─ GameScene.ts        # MVPのゲームロジック
│  ├─ main.ts                # Phaser起動
│  └─ styles.css             # レイアウト/見た目
├─ index.html                # Viteエントリ
├─ vite.config.ts            # baseを環境変数で切替
├─ tsconfig.json
├─ package.json
└─ README.md
```

## ゲームMVP仕様（維持）

- 隣接する壁のみ掘削可能
- wall中身: `safe / mine / ore / heal / core`
- `safe` は周囲8マスの `mine` 数を表示
- 0 のとき自動展開
- 長押しで flag
- `HP / Ore / PickaxePower / Turn`
- 強化ボタン
- リスタート
- game over / clear

## 1) ローカル開発手順

```bash
npm install
npm run dev
```

- 開発サーバー起動後、表示されたURL（通常 `http://localhost:5173`）を開きます。
- iPhone実機で確認する場合は、同一ネットワーク上でPCのIPを使ってアクセスしてください。

## 2) 本番ビルド手順

```bash
npm run build
```

- 出力先は `dist/` です。

## 3) `npm run preview` での確認手順

```bash
npm run preview
```

- `dist/` をローカル配信し、本番に近い状態で挙動確認できます。

## 4) Vercel にデプロイする前提

Vercelでは通常、以下の設定で動作します。

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

`base` は通常 `/` のままで問題ありません（デフォルト）。

## 5) Cloudflare Pages / GitHub Pages へ切り替える注意点

`vite.config.ts` は `VITE_BASE_PATH` で `base` を切り替えます。

- 通常（Vercel / 独自ドメイン直下）: `VITE_BASE_PATH=/`
- GitHub Pages（`https://<user>.github.io/Minewalker/`）: `VITE_BASE_PATH=/Minewalker/`

例: GitHub Pages 用ビルド

```bash
VITE_BASE_PATH=/Minewalker/ npm run build
```

Cloudflare Pagesでも、サブパス配信にする場合は同様に `VITE_BASE_PATH` を設定してください。

## npm scripts

- `npm run dev`
- `npm run build`
- `npm run preview`
