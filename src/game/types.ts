export const TILE_KIND = {
  WALL: 'wall',
  FLOOR: 'floor',
  SCORCHED: 'scorched',
  START: 'start',
  GOAL: 'goal'
} as const;

export type TileKind = (typeof TILE_KIND)[keyof typeof TILE_KIND];

export const GOAL_STATE = {
  NONE: 'none',
  HIDDEN: 'hidden',
  REVEALED: 'revealed'
} as const;

export type GoalState = (typeof GOAL_STATE)[keyof typeof GOAL_STATE];

export interface Tile {
  tileKind: TileKind;
  isOpen: boolean;
  hasMine: boolean;
  adjacentMineCount: number;
  goalState: GoalState;
  flagged: boolean;
}
