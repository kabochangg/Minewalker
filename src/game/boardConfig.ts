export const BOARD_DIFFICULTY = {
  INTERMEDIATE: 'intermediate',
  EXPERT: 'expert'
} as const;

export type BoardDifficulty = (typeof BOARD_DIFFICULTY)[keyof typeof BOARD_DIFFICULTY];

export interface BoardConfig {
  width: number;
  height: number;
  mineCount: number;
}

export const BOARD_CONFIG: Record<BoardDifficulty, BoardConfig> = {
  [BOARD_DIFFICULTY.INTERMEDIATE]: {
    width: 16,
    height: 12,
    mineCount: 40
  },
  [BOARD_DIFFICULTY.EXPERT]: {
    width: 30,
    height: 12,
    mineCount: 99
  }
};

export const DEFAULT_BOARD_DIFFICULTY: BoardDifficulty = BOARD_DIFFICULTY.INTERMEDIATE;
