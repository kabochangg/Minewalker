export const DIRECTION = {
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right'
} as const;

export type Direction = (typeof DIRECTION)[keyof typeof DIRECTION];

export interface Position {
  x: number;
  y: number;
}

const DIRECTION_OFFSET: Record<Direction, Position> = {
  [DIRECTION.UP]: { x: 0, y: -1 },
  [DIRECTION.DOWN]: { x: 0, y: 1 },
  [DIRECTION.LEFT]: { x: -1, y: 0 },
  [DIRECTION.RIGHT]: { x: 1, y: 0 }
};

export const addDirectionOffset = (position: Position, direction: Direction): Position => {
  const offset = DIRECTION_OFFSET[direction];
  return {
    x: position.x + offset.x,
    y: position.y + offset.y
  };
};
