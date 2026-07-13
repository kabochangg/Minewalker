export const TILE_SIZE = 48;

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
