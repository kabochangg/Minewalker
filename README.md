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

## 4) Cloudflare Pages（第一候補）へデプロイ

GitHub連携を前提に、Cloudflare Pagesにデプロイする手順です。

1. このリポジトリを GitHub に push します。
2. Cloudflare Dashboard の **Workers & Pages** から **Create application** → **Pages** → **Connect to Git** を選択します。
3. GitHub を連携し、このリポジトリを選択します。
4. Build settings を次の値で設定します。
   - **Framework preset**: `Vite`（または `None` でも可）
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/`（リポジトリ直下）
5. 保存してデプロイします。

### Cloudflare Pages 向け補足

- このプロジェクトはSPAではなく単一ページ構成のため、通常は追加のリダイレクト設定なしで動作します。
- Node.js バージョン差異でのビルド迷いを避けるため、`package.json` の `engines.node` を参照してください。
- カスタムドメイン/ルート配信では、通常 `VITE_BASE_PATH=/` のままで問題ありません。

## 5) GitHub Pages 用の `base` 切り替え（維持）

`vite.config.ts` は `VITE_BASE_PATH` で `base` を切り替えます。

- 通常（Cloudflare Pages / Vercel / 独自ドメイン直下）: `VITE_BASE_PATH=/`
- GitHub Pages（`https://<user>.github.io/Minewalker/`）: `VITE_BASE_PATH=/Minewalker/`

例: GitHub Pages 用ビルド

```bash
VITE_BASE_PATH=/Minewalker/ npm run build
```

Cloudflare Pagesでも、サブパス配信にする場合は同様に `VITE_BASE_PATH` を設定してください。

## 6) Vercel は代替候補

Vercelへ載せ替える場合も、以下の最小設定で動作します。

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

## npm scripts

- `npm run dev`
- `npm run build`
- `npm run preview`
