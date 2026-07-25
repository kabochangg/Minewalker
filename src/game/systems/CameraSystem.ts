export const TILE_SIZE = 48;

export interface CameraBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface CameraView {
  readonly scrollX: number;
  readonly scrollY: number;
  readonly zoom: number;
}

export function worldToScreen(
  tileX: number,
  tileY: number,
  cameraX: number,
  cameraY: number,
): { x: number; y: number } {
  return {
    x: tileX * TILE_SIZE - cameraX,
    y: tileY * TILE_SIZE - cameraY,
  };
}

/** プレイヤーへ追従しつつワールド境界内へカメラを制限する。 */
export function calculateCameraView(
  playerWorldX: number,
  playerWorldY: number,
  viewportWidth: number,
  viewportHeight: number,
  world: CameraBounds,
  requestedZoom = 1,
): CameraView {
  const zoom = Math.min(1.5, Math.max(0.75, requestedZoom));
  const visibleWidth = viewportWidth / zoom;
  const visibleHeight = viewportHeight / zoom;
  const maximumX = Math.max(world.x, world.x + world.width - visibleWidth);
  const maximumY = Math.max(world.y, world.y + world.height - visibleHeight);
  return {
    scrollX: Math.min(
      maximumX,
      Math.max(world.x, playerWorldX - visibleWidth / 2),
    ),
    scrollY: Math.min(
      maximumY,
      Math.max(world.y, playerWorldY - visibleHeight / 2),
    ),
    zoom,
  };
}

/** 画面座標をカメラ状態に基づきワールド座標へ戻す。 */
export function screenToWorld(
  screenX: number,
  screenY: number,
  camera: CameraView,
): { readonly x: number; readonly y: number } {
  return {
    x: screenX / camera.zoom + camera.scrollX,
    y: screenY / camera.zoom + camera.scrollY,
  };
}

/** フレーム時間に依存しない指数補間でカメラを目標へ近づける。 */
export function smoothCameraView(
  current: CameraView,
  target: CameraView,
  elapsedMs: number,
  responsePerSecond = 12,
): CameraView {
  const alpha =
    elapsedMs <= 0
      ? 0
      : 1 -
        Math.exp(
          -Math.max(0, responsePerSecond) * (Math.min(elapsedMs, 100) / 1_000),
        );
  return {
    scrollX: current.scrollX + (target.scrollX - current.scrollX) * alpha,
    scrollY: current.scrollY + (target.scrollY - current.scrollY) * alpha,
    zoom: current.zoom + (target.zoom - current.zoom) * alpha,
  };
}
