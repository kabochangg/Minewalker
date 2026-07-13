import Phaser from "phaser";

export const COLORS = {
  background: 0x0b0f12,
  panel: 0x241a11,
  panelLight: 0x3a2919,
  gold: 0xf0a72e,
  goldDark: 0x7a4a17,
  text: "#f7ead1",
  muted: "#c9ad7e",
  green: 0x69b342,
  red: 0xc74432,
  blue: 0x4da3ff,
  purple: 0x9b59c9,
} as const;

export function addPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
): Phaser.GameObjects.Rectangle {
  return scene.add
    .rectangle(x, y, width, height, COLORS.panel, 0.94)
    .setStrokeStyle(2, COLORS.goldDark)
    .setOrigin(0.5);
}

export function addButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  onClick: () => void,
  fill: number = COLORS.panelLight,
): Phaser.GameObjects.Container {
  const bg = scene.add
    .rectangle(0, 0, width, height, fill, 1)
    .setStrokeStyle(2, COLORS.gold)
    .setInteractive({ useHandCursor: true });
  const text = scene.add
    .text(0, 0, label, {
      fontFamily: "sans-serif",
      fontSize: "18px",
      color: COLORS.text,
      fontStyle: "bold",
      align: "center",
    })
    .setOrigin(0.5);
  bg.on("pointerdown", onClick);
  bg.on("pointerover", () => bg.setFillStyle(COLORS.goldDark));
  bg.on("pointerout", () => bg.setFillStyle(fill));
  return scene.add.container(x, y, [bg, text]).setSize(width, height);
}

export function addSmallLabel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, {
      fontFamily: "sans-serif",
      fontSize: "14px",
      color: COLORS.muted,
    })
    .setOrigin(0.5);
}

export function addHudBar(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  value: number,
  max: number,
  color: number,
  label: string,
): Phaser.GameObjects.Container {
  const bg = scene.add
    .rectangle(0, 0, width, 18, 0x130d08)
    .setStrokeStyle(1, 0x6b4725);
  const fillWidth = Math.max(0, Math.round((width - 4) * (value / max)));
  const fill = scene.add
    .rectangle(-width / 2 + 2, 0, fillWidth, 12, color)
    .setOrigin(0, 0.5);
  const text = scene.add
    .text(0, 0, `${label} ${value}/${max}`, {
      fontFamily: "sans-serif",
      fontSize: "12px",
      color: "#ffffff",
      fontStyle: "bold",
    })
    .setOrigin(0.5);
  return scene.add.container(x, y, [bg, fill, text]);
}

export function drawPixelMiner(
  scene: Phaser.Scene,
  x: number,
  y: number,
): Phaser.GameObjects.Container {
  const shadow = scene.add.ellipse(0, 13, 24, 8, 0x000000, 0.35);
  const body = scene.add
    .rectangle(0, 4, 16, 20, 0x8b5a2b)
    .setStrokeStyle(1, 0x33200f);
  const head = scene.add.circle(0, -8, 8, 0xd69a57).setStrokeStyle(1, 0x33200f);
  const helmet = scene.add
    .rectangle(0, -14, 20, 8, 0xe1a82c)
    .setStrokeStyle(1, 0x593711);
  const lamp = scene.add.circle(0, -16, 3, 0xfff0a0);
  const pick = scene.add.line(11, 0, -7, 0, 9, -10, 0xd6d6d6).setLineWidth(3);
  return scene.add.container(x, y, [shadow, body, head, helmet, lamp, pick]);
}
