export const DIRECTION = {
  UP: 'up',
  UP_RIGHT: 'up_right',
  RIGHT: 'right',
  DOWN_RIGHT: 'down_right',
  DOWN: 'down',
  DOWN_LEFT: 'down_left',
  LEFT: 'left',
  UP_LEFT: 'up_left'
} as const;

export type Direction = (typeof DIRECTION)[keyof typeof DIRECTION];

export interface Position {
  x: number;
  y: number;
}

export const DIRECTION_OFFSET: Record<Direction, Position> = {
  [DIRECTION.UP]: { x: 0, y: -1 },
  [DIRECTION.UP_RIGHT]: { x: 1, y: -1 },
  [DIRECTION.RIGHT]: { x: 1, y: 0 },
  [DIRECTION.DOWN_RIGHT]: { x: 1, y: 1 },
  [DIRECTION.DOWN]: { x: 0, y: 1 },
  [DIRECTION.DOWN_LEFT]: { x: -1, y: 1 },
  [DIRECTION.LEFT]: { x: -1, y: 0 },
  [DIRECTION.UP_LEFT]: { x: -1, y: -1 }
};

export const addDirectionOffset = (position: Position, direction: Direction): Position => {
  const offset = DIRECTION_OFFSET[direction];
  return {
    x: position.x + offset.x,
    y: position.y + offset.y
  };
};
