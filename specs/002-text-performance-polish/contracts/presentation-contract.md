# Presentation Contract

## Ownership

- Coordinatorはcommandを1回処理し、前状態、新状態、DomainEventを公開する。
- RenderPatchBuilderはゲーム規則を判定せず、表示差分だけを生成する。
- Sceneはcomponent lifecycle、dispatch、navigationだけを担当する。
- Renderer、HUD、ActionBarは状態を変更せず、渡されたpatchだけを適用する。

## Renderer interface

```ts
interface ExplorationRenderer {
  initialize(state: ExplorationState): void;
  applyPatch(state: ExplorationState, patch: RenderPatch): void;
  present(inputReceiptId?: string): void;
  destroy(): void;
}
```

## Patch rules

- `revision`は単調増加し、適用済み以下のrevisionを無視する。
- `fullRebuild`は`initial`、`resume`、`theme`、`contextRestore`だけ許可する。
- movement patchはplayer/lighting/cameraだけを更新し、tile/HUD objectを再生成しない。
- mining、mark、dispose patchは対象tileと再計算された数字tileだけを更新する。
- rejected commandはmessage/action highlightだけを更新する。
- HUDは指定fieldだけ`setText`またはbar widthを変更する。
- effectはpoolから取得し、完了後に返却する。

## Input rules

- world pointer listenerは1つだけ登録する。
- 画面座標は現在のworld cameraを使ってTileKeyへ変換する。
- pointerdown/keydownで`inputReceiptId`を発行し、方向、pressed、target highlightを即時反映する。
- tap、long press、joystick、keyboardは同じExplorationCommandへ正規化する。
- Scene shutdownでlistener、key、pool、camera参照を1回だけ破棄する。

## Visual invariants

- `TILE_SIZE`は全presentationで48。
- 数字1/2/3/4は青/緑/赤/紫を維持し、数字形状も表示する。
- state iconには日本語labelまたは同等の非色覚情報を併用する。
- UI LayerだけをUI cameraへ、world/overlay/entity/effect Layerだけをworld cameraへ割り当てる。
