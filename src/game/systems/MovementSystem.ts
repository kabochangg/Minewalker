import type { PlayerState } from "../entities/player";
import { movePlayer } from "../entities/player";
import type { Tile } from "../map/types";
import { isAdjacent } from "./MinefieldSystem";

export function tryMove(player: PlayerState, tile: Tile): PlayerState {
  if (!tile.isWalkable || !isAdjacent(player, tile)) {
    return player;
  }
  return movePlayer(player, tile.x, tile.y);
}
