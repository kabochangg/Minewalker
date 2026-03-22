import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const width = 430;
const height = 932;
const safeTop = 0;
const safeBottom = 0;
const topPanelH = 58;
const bottomPanelH = 186;
const boardAreaH = height - safeTop - safeBottom - topPanelH - bottomPanelH;
const gridSize = 16;
const cellSize = 24;
const boardWidth = gridSize * cellSize;
const boardHeight = gridSize * cellSize;
const boardX = Math.floor((width - boardWidth) / 2);
const boardY = safeTop + topPanelH + Math.floor((boardAreaH - boardHeight) / 2);
const bottomY = safeTop + topPanelH + boardAreaH;

const openCells = new Map([
  ['7,7', { fill: '#8ac0c8', stroke: '#afdce3', text: '', textColor: '#3a4a60' }],
  ['7,6', { fill: '#dce4ef', stroke: '#a8b5c7', text: '1', textColor: '#4ea7ff' }],
  ['7,8', { fill: '#dce4ef', stroke: '#a8b5c7', text: '', textColor: '#3a4a60' }],
  ['6,7', { fill: '#dce4ef', stroke: '#a8b5c7', text: '2', textColor: '#32c36b' }],
  ['8,7', { fill: '#dce4ef', stroke: '#a8b5c7', text: '1', textColor: '#4ea7ff' }],
  ['8,8', { fill: '#dce4ef', stroke: '#a8b5c7', text: '', textColor: '#3a4a60' }],
  ['9,8', { fill: '#dce4ef', stroke: '#a8b5c7', text: '', textColor: '#3a4a60' }],
  ['10,8', { fill: '#dce4ef', stroke: '#a8b5c7', text: '1', textColor: '#4ea7ff' }],
  ['10,7', { fill: '#2d6849', stroke: '#76d39e', text: 'G', textColor: '#d8ffe9' }],
  ['6,8', { fill: '#5d3b30', stroke: '#8c5f4f', text: '2', textColor: '#f7e7df' }],
  ['5,8', { fill: '#dce4ef', stroke: '#a8b5c7', text: '', textColor: '#3a4a60' }],
  ['5,9', { fill: '#dce4ef', stroke: '#a8b5c7', text: '', textColor: '#3a4a60' }],
  ['6,9', { fill: '#dce4ef', stroke: '#a8b5c7', text: '1', textColor: '#4ea7ff' }],
  ['7,9', { fill: '#dce4ef', stroke: '#a8b5c7', text: '', textColor: '#3a4a60' }],
  ['8,9', { fill: '#dce4ef', stroke: '#a8b5c7', text: '', textColor: '#3a4a60' }],
  ['9,9', { fill: '#dce4ef', stroke: '#a8b5c7', text: '1', textColor: '#4ea7ff' }]
]);

function rect(x, y, w, h, fill, stroke, strokeWidth = 1, rx = 0) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
}

function text(x, y, value, size, color, weight = '700', anchor = 'middle') {
  return `<text x="${x}" y="${y}" fill="${color}" font-family="'Noto Sans JP', system-ui, sans-serif" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}">${value}</text>`;
}

let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
svg += `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
svg += `<rect width="100%" height="100%" fill="#060d1b" />`;
svg += rect(11, 2, width - 22, topPanelH - 4, '#081126', '#28406d', 1, 12);
svg += rect(boardX - 5, boardY - 5, boardWidth + 10, boardHeight + 10, '#0a1324', '#476998', 2, 10);
svg += rect(11, bottomY + 2, width - 22, bottomPanelH - 4, '#081126', '#28406d', 1, 12);
svg += `<line x1="${width / 2}" y1="${bottomY + 1}" x2="${width / 2}" y2="${bottomY + 18}" stroke="#35527f" stroke-width="2" stroke-linecap="round"/>`;
svg += text(width / 2, bottomY + 16, '操作エリア', 11, '#7fa6dc');
svg += text(25, 30, 'HP: 3', 16, '#f0f6ff', '700', 'start');
svg += text(width - 94, 32, '向き →', 13, '#f0f6ff', '700', 'end');
svg += rect(width - 83, 12, 32, 32, '#2a385a', '#7796c7', 1, 8);
svg += rect(width - 47, 12, 32, 32, '#2a385a', '#7796c7', 1, 8);
svg += text(width - 67, 33, '?', 16, '#f1f7ff');
svg += text(width - 31, 33, '↺', 16, '#f1f7ff');

for (let y = 0; y < gridSize; y += 1) {
  for (let x = 0; x < gridSize; x += 1) {
    const px = boardX + x * cellSize;
    const py = boardY + y * cellSize;
    const key = `${x},${y}`;
    const open = openCells.get(key);
    if (open) {
      svg += rect(px + 1, py + 1, cellSize - 2, cellSize - 2, open.fill, open.stroke, 1, 4);
      if (open.text) {
        svg += text(px + cellSize / 2, py + cellSize / 2 + 5, open.text, 16, open.textColor);
      }
    } else {
      svg += rect(px + 1, py + 1, cellSize - 2, cellSize - 2, '#4b5569', '#30384a', 1, 4);
    }
  }
}

const playerX = boardX + 7 * cellSize + cellSize / 2;
const playerY = boardY + 7 * cellSize + cellSize / 2 + 6;
svg += `<text x="${playerX}" y="${playerY}" fill="#ffffff" stroke="#071020" stroke-width="5" paint-order="stroke" font-family="'Noto Sans JP', system-ui, sans-serif" font-size="20" font-weight="700" text-anchor="middle">→</text>`;
const monsterX = boardX + 6 * cellSize + cellSize / 2;
const monsterY = boardY + 8 * cellSize + cellSize / 2 + 5;
svg += `<text x="${monsterX}" y="${monsterY}" fill="#ffe3e3" stroke="#2a0910" stroke-width="5" paint-order="stroke" font-family="'Noto Sans JP', system-ui, sans-serif" font-size="18" font-weight="700" text-anchor="middle">M</text>`;

const dpadLeft = 23;
const dpadTop = bottomY + 26;
const dpadSize = 48;
const gap = 6;
const attackX = dpadLeft + (dpadSize + gap) * 3 + 16;
const attackY = bottomY + 48;
svg += rect(dpadLeft + dpadSize + gap, dpadTop, dpadSize, dpadSize, '#2a385a', '#c08b55', 1, 8);
svg += rect(dpadLeft, dpadTop + dpadSize + gap, dpadSize, dpadSize, '#2a385a', '#c08b55', 1, 8);
svg += rect(dpadLeft + dpadSize + gap, dpadTop + (dpadSize + gap) * 2, dpadSize, dpadSize, '#2a385a', '#c08b55', 1, 8);
svg += rect(dpadLeft + (dpadSize + gap) * 2, dpadTop + dpadSize + gap, dpadSize, dpadSize, '#3a4d73', '#c08b55', 1, 8);
svg += text(dpadLeft + dpadSize + gap + dpadSize / 2, dpadTop + 31, '↑', 16, '#f1f7ff');
svg += text(dpadLeft + dpadSize / 2, dpadTop + dpadSize + gap + 31, '←', 16, '#f1f7ff');
svg += text(dpadLeft + dpadSize + gap + dpadSize / 2, dpadTop + (dpadSize + gap) * 2 + 31, '↓', 16, '#f1f7ff');
svg += text(dpadLeft + (dpadSize + gap) * 2 + dpadSize / 2, dpadTop + dpadSize + gap + 31, '→', 16, '#f1f7ff');
svg += rect(attackX, attackY, 124, 72, '#644022', '#c08b55', 1, 12);
svg += text(attackX + 62, attackY + 43, '叩く', 22, '#fff4df');
svg += text(width / 2, bottomY + bottomPanelH - 18, '↺でもう一度あそぶ', 12, '#ffddab');

svg += `</svg>`;

const outPath = resolve('artifacts/game-screen.svg');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, svg);
console.log(outPath);
