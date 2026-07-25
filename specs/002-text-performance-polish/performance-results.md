# Performance Results

## Environment

- Date: 2026-07-26
- Runtime: Chromium / Playwright
- Viewport: 390×844
- Renderer: Phaser Canvas
- Scenario: fixed E2E seed, 100 danger-mark operations, continuous movement, 3-second sample

## Before and after

| Metric                       |  Before |                After |             Contract |
| ---------------------------- | ------: | -------------------: | -------------------: |
| Average FPS                  |   16.24 |                60.06 |               55以上 |
| RAF frame delta p95          | 65.20ms |              17.80ms |             25ms以下 |
| Input to presented frame p95 |  未計測 | 100ms以下（E2E合格） |            100ms以下 |
| Normal stalls over 100ms     |       0 |                    0 |                    0 |
| Active GameObjects           |     390 |                   39 | 同一状態で増加しない |
| Active Text objects          |      14 |                   14 | 同一状態で増加しない |
| Active chunks                |       1 |                    1 |         表示範囲のみ |

## Changes responsible for the improvement

- WebGLの個別オブジェクト描画から、Canvas上の単一Graphics地形バッチへ変更した。
- 盤面全体ではなく、カメラ周辺と2タイル余白だけを描画した。
- タイル単位のポインターリスナーを廃止し、ワールド入力を1つへ集約した。
- フラグ切り替え時は盤面を再構築せず、既存アイコンの表示だけを変更した。
- プレイヤー、カメラ、照明は移動中に再生成せず座標だけを更新した。
- 通常の探索保存を最大250msで集約し、重要トランザクションは従来どおり即時保存した。

## Automated validation

- `npm run verify:encoding`: PASS
- `npm run lint`: PASS
- `npm run test`: 121 tests PASS
- `npm run build`: PASS
- `npm run e2e`: 55 PASS / 2 viewport-specific skips / 0 failures

## Remaining device validation

iPhone Safariの実機計測は未実施。`quickstart.md` の「iPhone acceptance」に従い、iOSバージョン、端末、30分計測、オフライン復帰、バックグラウンド復帰を記録する。
