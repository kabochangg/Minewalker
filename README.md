# Minewalker

Phaser 3 + TypeScript + Vite で構成された、モバイル向け探索パズルゲームです。
対象は iPhone Safari を重視したモバイル縦画面で、Cloudflare Pages での配信を前提にしています。

## ドキュメント構成
- `AGENTS.md`: Codex / AI エージェント向けのコーディング指針
- `GAME_SPEC.md`: ゲーム仕様
- `USABILITY.md`: 操作性要件
- `EVALUATION_LOG.md`: 評価観点・評価結果・実行ログ

## 開発コマンド
```bash
npm install
npm run dev
npm run build
npm run preview
```

## デプロイ前提
- 出力先は `dist/`
- Cloudflare Pages での配信を維持する
- 必要に応じて `VITE_BASE_PATH` で `base` を切り替える
