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
