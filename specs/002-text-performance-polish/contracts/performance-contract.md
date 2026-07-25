# Performance and Font Contract

## Measurement window

- hard最大盤面を使用する。
- 10秒warm-up後、30秒以上をsample windowとする。
- 8方向移動、走行、採掘、長押しmark、危険処理、monster interactionを含める。
- 320×844、390×844、430×932で同じscenarioを実行する。

## Required metrics

| Metric                         | Pass threshold                   |
| ------------------------------ | -------------------------------- |
| Average FPS                    | 55以上                           |
| RAF frame delta p95            | 25ms以下                         |
| Input to presented frame p95   | 100ms以下                        |
| Normal action stall            | 100ms超が0件                     |
| 100操作後の平均frame delta悪化 | 10%以内                          |
| GameObject/Text count          | 同一状態へ戻った時にbaseline以下 |
| Offline cold start             | 5秒以内                          |

## Input-to-present definition

1. pointerdownまたはkeydownでreceipt IDとtimestampを採番する。
2. 対応するvisual patchを適用する。
3. patch適用後の最初の`requestAnimationFrame`でpresent timestampを記録する。
4. 差分を同一receiptのlatencyとする。

## Font contract

- `MinewalkerJP` regular/700をゲーム起動前にloadする。
- load済み判定は代表文字列「鉱山 危険 処理 0123456789」で確認する。
- WOFF2とOFL licenseをbuildへ含める。
- Service Worker ready後にoffline reloadしてもfont load済みである。
- player-facing文字列はUTF-8 fatal decodeに成功し、U+FFFD、NUL、既知の文字化け列を含まない。
- 状態表示に禁止Unicode symbolを使用しない。

## E2E bridge

dev/E2E時だけ次を公開する。

```ts
interface PerformanceE2EBridge {
  reset(): void;
  start(windowMs: number): void;
  stop(): PerformanceSnapshot;
  getObjectCounts(): ObjectCountSnapshot;
  getFontStatus(): FontStatusSnapshot;
  getSaveStatus(): SaveCoordinatorStatus;
}
```

production通常起動ではbridgeとsample収集を無効にする。
