# Minewalker 日本語フォント

このディレクトリには、PWA のオフライン起動でも使用する自己ホストフォントを配置します。

- `minewalker-jp-regular.woff2`: 通常ウェイト
- `minewalker-jp-bold.woff2`: 太字ウェイト
- `OFL.txt`: Open Font License
- `glyphs.txt`: ゲームで保証する代表グリフ

フォントを更新した場合は `npm run verify:encoding`、`npm run test`、`npm run build` を実行し、生成物へ WOFF2 とライセンスが含まれることを確認してください。
