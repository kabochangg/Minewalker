# Quickstart Validation: 文字表示・操作応答改善

## Prerequisites

- Node.jsとnpm
- Chromiumを含むPlaywright browser
- 実機確認時はiPhone SafariとHTTPSで公開されたPWA
- 既存v3永続セーブ、v2探索中断セーブのfixture

## Static gates

```powershell
npm run format
npm run lint
npx tsc --noEmit
npm run test
npm run build
```

期待結果:

- UTF-8 fatal decode、文字化けsignature、font glyph、禁止状態symbol検査が成功する。
- strict TypeScript、既存unit/soak、新規patch/save/performance testsがすべて成功する。
- build成果物とService Worker precacheにWOFF2とlicenseが含まれる。

## Text and offline scenario

1. 本番buildを起動し、Service Worker readyとfont load完了を待つ。
2. Title、Home、Area Select、Loadout、Exploration、Result、Settingsを表示する。
3. 代表文字、数字、危険・死亡・出口iconを確認する。
4. browserをofflineへ切り替えてcold reloadする。
5. 同じ画面とfont statusを再確認する。

期待結果:

- 文字化け、豆腐、emoji fallback、意図しない字体変化がない。
- 重要状態はiconと文字または形状で識別できる。
- offline起動が5秒以内で、font load済みとなる。

## Rendering and interaction scenario

1. hard最大盤面を固定seedで生成する。
2. 10秒warm-up後、30秒間8方向へ連続移動する。
3. 走行、採掘、長押しmark、危険処理、monster interactionを100回実行する。
4. performance bridgeからsnapshotとobject countを取得する。
5. 同じ状態へ戻した後のobject countをbaselineと比較する。

期待結果:

- 平均55fps以上、frame delta p95 25ms以下。
- input-to-present p95 100ms以下、通常action stall 100ms超が0件。
- 100操作後の平均frame delta悪化10%以内。
- 移動patchでtile/HUD object identityが変わらず、active object数が増え続けない。

## Save compatibility scenario

1. 既存v3/v2/v1 fixtureをloadする。
2. 100回のrun更新を短時間にqueueする。
3. 通常flush、hidden、pagehide、Scene shutdown、PWA update前flushを確認する。
4. 採掘、危険処理、死亡、回収、checkpoint後にreloadする。
5. commit失敗を注入してdirty保持と遷移停止を確認する。

期待結果:

- 100更新は最新snapshotを持つ1回の通常commitへ集約される。
- critical WALはqueueを迂回し、既存順序と原子性を維持する。
- 既存セーブをversion変更なしで復元できる。
- update前flush失敗時はreloadしない。

## Viewport and PWA journey

```powershell
npm run e2e
```

320×844、390×844、430×932で以下を確認する。

- HUD、文字、world、joystick、actionが欠けず、44px/12px基準を維持する。
- camera移動でdomain stateが変わらず、orientation/resizeで盤面を再生成しない。
- online/offline resume、PWA update defer/apply、save failure protectionが成功する。
- 既存51 E2E journeyに回帰がない。

## iPhone acceptance

1. HTTPSの固定URLをSafariで開き、ホーム画面へ追加する。
2. 通常モードと低電力モードで30秒探索を計測する。
3. アプリをbackgroundへ移し、再開して位置・所持品・危険状態を確認する。
4. 機内モードでcold startし、探索を再開する。
5. 更新を一度延期し、その後適用してセーブが維持されることを確認する。

実機結果にはiOS version、端末、renderer、平均fps、p95、input p95、offline起動時間、スクリーン録画または画面記録を残す。

## Automated result (2026-07-26)

- UTF-8、フォント資産、描画差分、固定ステップ、保存集約のUnit test: PASS
- Unit/soak: 121件 PASS
- 320×844、390×844、430×932 E2E: 55件 PASS、対象外2件skip、失敗0件
- PWA build: WOFF2 Regular/Bold、OFLライセンスを含む27ファイルをprecache
- 390×844 / 100操作: 平均60.06fps、frame delta p95 17.80ms、39 GameObjects
- iPhone実機30分確認: 未実施（端末操作が必要）
