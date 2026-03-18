export const INPUT_REPEAT_INTERVAL_MS = 250;
export const INPUT_HIT_PADDING_PX = 14;
export const INITIAL_PLAYER_HP = 3;

export const PLAYER_MARKER_STYLE = {
  color: '#ffffff',
  strokeColor: '#071020',
  shadowColor: '#000000',
  smallFontSize: 16,
  largeFontSize: 20,
  smallStroke: 5,
  largeStroke: 6,
  shadowBlur: 8,
  shadowOffsetY: 1
} as const;

export const HELP_MODAL_COPY = [
  '・十字キーで移動する',
  '・進めなくても向きだけ変わる',
  '・叩くで正面の壁を壊す',
  '・0は周囲が安全で自動で広がる',
  '・数字は周囲8マスの地雷数',
  '・ゴールを開いて乗るとクリア'
] as const;

export const BOARD_DIVIDER_STYLE = {
  color: 0x35527f,
  alpha: 0.85,
  width: 2,
  labelColor: '#7fa6dc',
  labelFontSize: 11
} as const;

export const GAME_OVERLAY_STYLE = {
  scrimColor: 0x030814,
  scrimAlpha: 0.58,
  panelColor: 0x11213d,
  panelStroke: 0x83a5dd,
  textColor: '#f4f7ff',
  subTextColor: '#d6e2ff',
  subText: '下の↺ボタンで再スタート'
} as const;
