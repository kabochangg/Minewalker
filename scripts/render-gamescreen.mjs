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

const dpadTop = bottomY + 36;
const dpadRadius = 52;
const dpadCenterX = 151;
const dpadCenterY = dpadTop + dpadRadius;
const arrowOffset = 32;
const attackW = 96;
const attackH = 68;
const attackX = width - 11 - 12 - attackW;
const attackY = bottomY + 50;
svg += `<circle cx="${dpadCenterX}" cy="${dpadCenterY}" r="${dpadRadius}" fill="#21314f" stroke="#c08b55" stroke-width="2" />`;
svg += `<circle cx="${dpadCenterX}" cy="${dpadCenterY}" r="18" fill="#18243d" stroke="#48638f" stroke-width="1" />`;
svg += `<circle cx="${dpadCenterX}" cy="${dpadCenterY}" r="20" fill="#4a628c" stroke="#e2efff" stroke-width="2" />`;
svg += text(dpadCenterX, dpadCenterY - arrowOffset + 6, '↑', 16, '#f1f7ff');
svg += text(dpadCenterX + arrowOffset, dpadCenterY + 5, '→', 16, '#f1f7ff');
svg += text(dpadCenterX, dpadCenterY + arrowOffset + 5, '↓', 16, '#f1f7ff');
svg += text(dpadCenterX - arrowOffset, dpadCenterY + 5, '←', 16, '#f1f7ff');
svg += rect(attackX, attackY, attackW, attackH, '#644022', '#c08b55', 1, 12);
svg += text(attackX + attackW / 2, attackY + 40, '叩く', 20, '#fff4df');
svg += text(width / 2, bottomY + bottomPanelH - 18, '↺でもう一度あそぶ', 12, '#ffddab');

svg += `</svg>`;

const outPath = resolve('artifacts/game-screen.svg');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, svg);
console.log(outPath);
