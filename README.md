# Minewalker MVP（単一HTML版）

iPhone の Safari で `index.html` を直接開くだけで遊べるようにした版です。
Node.js / npm は不要です。

## 遊び方

1. `index.html` を iPhone にコピー
2. Safari で開く
3. タップでマスを掘る
4. 長押し（約0.42秒）で旗を立てる

## ルール

- 中央開始の安全地帯から、隣接する壁だけ破壊可能
- 壁の中身: safe / mine / ore / heal / core
- safe は周辺8マス地雷数を表示、0なら自動展開
- mine でHP減少、oreで資源増、healで回復
- HP 0でゲームオーバー
- core発見でクリア
- UI: 上部ステータス / 中央盤面 / 下部ログ + 強化 + リスタート
