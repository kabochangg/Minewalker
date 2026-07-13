import type { Minefield } from "../map/types";
import { getTile } from "../map/types";
import type { GridPosition } from "./MovementSystem";

export function isPositionDiscovered(
  field: Minefield,
  player: GridPosition,
  position: GridPosition,
): boolean {
  const tile = getTile(field, position.x, position.y);
  if (tile?.isRevealed) {
    return true;
  }
  return (
    Math.max(
      Math.abs(position.x - player.x),
      Math.abs(position.y - player.y),
    ) <= 1
  );
}
