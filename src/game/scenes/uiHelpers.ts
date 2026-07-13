import Phaser from "phaser";
import { VISUAL_TOKENS } from "../visual/VisualSystem";

export { VISUAL_TOKENS };

export const COLORS = {
  background: VISUAL_TOKENS.colors.void,
  panel: VISUAL_TOKENS.colors.panel,
  panelLight: VISUAL_TOKENS.colors.panelLight,
  gold: VISUAL_TOKENS.colors.lantern,
  goldDark: 0x8a571f,
  text: VISUAL_TOKENS.colors.text,
  muted: VISUAL_TOKENS.colors.muted,
  green: VISUAL_TOKENS.colors.stamina,
  red: VISUAL_TOKENS.colors.hp,
  blue: VISUAL_TOKENS.colors.blue,
  purple: VISUAL_TOKENS.colors.purple,
} as const;

export type GameIcon =
  | "pickaxe"
  | "coolant"
  | "disable"
  | "potion"
  | "bag"
  | "map"
  | "coin"
  | "depth"
  | "settings"
  | "home"
  | "collection"
  | "play"
  | "back"
  | "lock"
  | "stamina"
  | "heart"
  | "craft"
  | "ore"
  | "weapon"
  | "armor"
  | "star";

export type GameButtonState =
  "normal" | "selected" | "disabled" | "danger" | "success";

export interface GameButtonOptions {
  readonly state?: GameButtonState;
  readonly icon?: GameIcon;
  readonly reducedMotion?: boolean;
  readonly fontSize?: number;
}

const BUTTON_FILLS: Readonly<Record<GameButtonState, number>> = {
  normal: VISUAL_TOKENS.colors.panelLight,
  selected: 0x754a1e,
  disabled: VISUAL_TOKENS.colors.disabled,
  danger: 0x7d3028,
  success: 0x427c31,
};

export function addGamePanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  fill = VISUAL_TOKENS.colors.panel,
): Phaser.GameObjects.Container {
  const graphics = scene.add.graphics();
  graphics.fillStyle(VISUAL_TOKENS.colors.rockOutline, 0.98);
  graphics.fillRoundedRect(-width / 2, -height / 2, width, height, 9);
  graphics.fillStyle(fill, 0.98);
  graphics.fillRoundedRect(
    -width / 2 + 2,
    -height / 2 + 2,
    width - 4,
    height - 4,
    7,
  );
  graphics.lineStyle(1, 0x6d5134, 0.9);
  graphics.strokeRoundedRect(
    -width / 2 + 4,
    -height / 2 + 4,
    width - 8,
    height - 8,
    5,
  );
  graphics.lineStyle(1, VISUAL_TOKENS.colors.rockHighlight, 0.38);
  graphics.lineBetween(
    -width / 2 + 10,
    -height / 2 + 7,
    width / 2 - 10,
    -height / 2 + 7,
  );
  return scene.add.container(x, y, [graphics]).setSize(width, height);
}

export function addGameButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  onClick: () => void,
  options: GameButtonOptions = {},
): Phaser.GameObjects.Container {
  const state = options.state ?? "normal";
  const fill = BUTTON_FILLS[state];
  const border =
    state === "selected"
      ? VISUAL_TOKENS.colors.highlight
      : VISUAL_TOKENS.colors.lantern;
  const graphics = scene.add.graphics();
  const draw = (active: boolean): void => {
    graphics.clear();
    graphics.fillStyle(VISUAL_TOKENS.colors.rockOutline, 1);
    graphics.fillRoundedRect(-width / 2, -height / 2, width, height, 7);
    graphics.fillStyle(active ? lighten(fill, 18) : fill, 1);
    graphics.fillRoundedRect(
      -width / 2 + 2,
      -height / 2 + 2,
      width - 4,
      height - 4,
      5,
    );
    graphics.lineStyle(
      state === "selected" ? 3 : 2,
      border,
      state === "disabled" ? 0.35 : 0.95,
    );
    graphics.strokeRoundedRect(
      -width / 2 + 2,
      -height / 2 + 2,
      width - 4,
      height - 4,
      5,
    );
    graphics.lineStyle(1, VISUAL_TOKENS.colors.highlight, active ? 0.55 : 0.22);
    graphics.lineBetween(
      -width / 2 + 8,
      -height / 2 + 7,
      width / 2 - 8,
      -height / 2 + 7,
    );
  };
  draw(false);
  const compactIconLayout = Boolean(options.icon && label && width < 72);
  const iconOffset = options.icon
    ? compactIconLayout
      ? 0
      : -Math.min(16, width * 0.15)
    : 0;
  const text = scene.add
    .text(
      options.icon && !compactIconLayout ? 10 : 0,
      compactIconLayout ? 11 : 0,
      label,
      {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${options.fontSize ?? VISUAL_TOKENS.font.button}px`,
        color: state === "disabled" ? "#aaa79f" : VISUAL_TOKENS.colors.text,
        fontStyle: "bold",
        align: "center",
        lineSpacing: 1,
      },
    )
    .setOrigin(0.5);
  const children: Phaser.GameObjects.GameObject[] = [graphics];
  if (options.icon) {
    const iconObject = drawGameIcon(
      scene,
      iconOffset,
      compactIconLayout ? -12 : 0,
      options.icon,
      state === "disabled" ? 0x99958c : border,
    );
    if (compactIconLayout) iconObject.setScale(0.58);
    children.push(iconObject);
  }
  children.push(text);
  const container = scene.add.container(x, y, children).setSize(width, height);
  graphics.setInteractive(
    new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
    Phaser.Geom.Rectangle.Contains,
  );
  if (state !== "disabled") {
    graphics.on("pointerdown", () => {
      draw(true);
      if (!options.reducedMotion) container.setScale(0.97);
    });
    graphics.on("pointerup", () => {
      draw(false);
      container.setScale(1);
      onClick();
    });
    graphics.on("pointerout", () => {
      draw(false);
      container.setScale(1);
    });
  }
  return container;
}

export function addIconButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  icon: GameIcon,
  onClick: () => void,
  options: GameButtonOptions = {},
): Phaser.GameObjects.Container {
  return addGameButton(scene, x, y, 48, 48, "", onClick, {
    ...options,
    icon,
  });
}

export function addResourceBar(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  value: number,
  max: number,
  color: number,
  label: string,
  icon: GameIcon,
): Phaser.GameObjects.Container {
  const safeMax = Math.max(1, max);
  const ratio = Phaser.Math.Clamp(value / safeMax, 0, 1);
  const graphics = scene.add.graphics();
  graphics.fillStyle(VISUAL_TOKENS.colors.rockOutline, 1);
  graphics.fillRoundedRect(-width / 2, -9, width, 18, 4);
  graphics.fillStyle(0x17110d, 1);
  graphics.fillRoundedRect(-width / 2 + 2, -7, width - 4, 14, 3);
  if (ratio > 0) {
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(
      -width / 2 + 3,
      -6,
      Math.max(3, (width - 6) * ratio),
      12,
      2,
    );
  }
  graphics.lineStyle(1, lighten(color, 42), 0.55);
  graphics.lineBetween(
    -width / 2 + 5,
    -4,
    -width / 2 + 3 + (width - 8) * ratio,
    -4,
  );
  const text = scene.add
    .text(6, 0, `${label} ${value}/${max}`, {
      fontFamily: "system-ui, sans-serif",
      fontSize: "12px",
      color: "#ffffff",
      fontStyle: "bold",
    })
    .setOrigin(0.5);
  return scene.add.container(x, y, [
    graphics,
    drawGameIcon(scene, -width / 2 + 12, 0, icon, 0xffffff),
    text,
  ]);
}

export function drawGameIcon(
  scene: Phaser.Scene,
  x: number,
  y: number,
  icon: GameIcon,
  color: number = VISUAL_TOKENS.colors.highlight,
): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  g.lineStyle(2, color, 1);
  g.fillStyle(color, 1);
  switch (icon) {
    case "pickaxe":
      g.lineBetween(-6, 7, 5, -6);
      g.lineBetween(-3, -7, 8, -3);
      break;
    case "coolant":
      g.fillCircle(0, 3, 5);
      g.fillTriangle(0, -8, -5, 2, 5, 2);
      break;
    case "disable":
      g.strokeCircle(0, 0, 7);
      g.lineBetween(-4, 0, -1, 4);
      g.lineBetween(-1, 4, 5, -4);
      break;
    case "potion":
      g.strokeRoundedRect(-5, -2, 10, 10, 3);
      g.fillRect(-3, -7, 6, 4);
      break;
    case "bag":
      g.strokeRoundedRect(-7, -4, 14, 12, 3);
      g.strokeCircle(0, -4, 4);
      break;
    case "map":
      g.lineBetween(-8, -6, -3, -8);
      g.lineBetween(-3, -8, 3, -5);
      g.lineBetween(3, -5, 8, -7);
      g.lineBetween(-8, -6, -8, 7);
      g.lineBetween(-8, 7, -3, 5);
      g.lineBetween(-3, -8, -3, 5);
      g.lineBetween(-3, 5, 3, 8);
      g.lineBetween(3, -5, 3, 8);
      g.lineBetween(3, 8, 8, 5);
      g.lineBetween(8, -7, 8, 5);
      break;
    case "coin":
      g.strokeCircle(0, 0, 7);
      g.strokeCircle(0, 0, 4);
      break;
    case "depth":
      g.lineBetween(0, -8, 0, 6);
      g.fillTriangle(-5, 2, 5, 2, 0, 8);
      break;
    case "settings":
      g.strokeCircle(0, 0, 7);
      g.fillCircle(0, 0, 2);
      for (let angle = 0; angle < 360; angle += 45) {
        const radians = Phaser.Math.DegToRad(angle);
        g.lineBetween(
          Math.cos(radians) * 7,
          Math.sin(radians) * 7,
          Math.cos(radians) * 10,
          Math.sin(radians) * 10,
        );
      }
      break;
    case "heart":
      g.fillCircle(-4, -2, 4);
      g.fillCircle(4, -2, 4);
      g.fillTriangle(-8, 0, 8, 0, 0, 9);
      break;
    case "stamina":
      g.fillTriangle(1, -9, -6, 2, 0, 2);
      g.fillTriangle(-1, 9, 6, -2, 0, -2);
      break;
    case "home":
      g.fillTriangle(-9, 0, 0, -8, 9, 0);
      g.strokeRect(-6, 0, 12, 8);
      break;
    case "collection":
      g.strokeRect(-7, -8, 14, 16);
      g.lineBetween(-4, -3, 4, -3);
      g.lineBetween(-4, 2, 4, 2);
      break;
    case "play":
      g.fillTriangle(-5, -8, 8, 0, -5, 8);
      break;
    case "back":
      g.lineBetween(-7, 0, 7, 0);
      g.lineBetween(-7, 0, -1, -6);
      g.lineBetween(-7, 0, -1, 6);
      break;
    case "lock":
      g.strokeRoundedRect(-6, -1, 12, 9, 2);
      g.strokeCircle(0, -2, 5);
      break;
    case "craft":
      g.lineBetween(-7, 7, 6, -6);
      g.strokeCircle(5, -5, 3);
      break;
    case "ore":
      g.fillTriangle(-8, 5, -4, -6, 3, -9);
      g.fillTriangle(-8, 5, 3, -9, 8, 6);
      g.lineStyle(1, VISUAL_TOKENS.colors.rockOutline, 0.7);
      g.lineBetween(-4, -4, 4, 5);
      break;
    case "weapon":
      g.lineStyle(3, color, 1);
      g.lineBetween(-6, 7, 6, -7);
      g.lineStyle(2, color, 1);
      g.lineBetween(-7, 2, -1, 8);
      g.fillTriangle(3, -7, 8, -9, 6, -3);
      break;
    case "armor":
      g.fillTriangle(-8, -6, 0, -9, 8, -6);
      g.fillRoundedRect(-7, -5, 14, 12, 4);
      g.fillTriangle(-7, 3, 7, 3, 0, 9);
      break;
    case "star":
      g.fillPoints(
        Array.from({ length: 10 }, (_, index) => {
          const angle = -Math.PI / 2 + (index * Math.PI) / 5;
          const radius = index % 2 === 0 ? 9 : 4;
          return new Phaser.Geom.Point(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
          );
        }),
        true,
      );
      break;
  }
  return scene.add.container(x, y, [g]);
}

export function addPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
): Phaser.GameObjects.Container {
  return addGamePanel(scene, x, y, width, height);
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
  const state: GameButtonState =
    fill === COLORS.red
      ? "danger"
      : fill === COLORS.green
        ? "success"
        : fill === COLORS.goldDark
          ? "selected"
          : "normal";
  return addGameButton(scene, x, y, width, height, label, onClick, { state });
}

export function addSmallLabel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${VISUAL_TOKENS.font.body}px`,
      color: VISUAL_TOKENS.colors.muted,
      fontStyle: "600",
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
  return addResourceBar(
    scene,
    x,
    y,
    width,
    value,
    max,
    color,
    label,
    label === "HP" ? "heart" : "stamina",
  );
}

export function drawPixelMiner(
  scene: Phaser.Scene,
  x: number,
  y: number,
): Phaser.GameObjects.Container {
  const shadow = scene.add.ellipse(0, 13, 26, 9, 0x000000, 0.42);
  const outline = scene.add.rectangle(0, 4, 20, 24, 0x1c1510);
  const body = scene.add.rectangle(0, 4, 16, 20, 0x9b6330);
  const head = scene.add.circle(0, -8, 8, 0xe0a163).setStrokeStyle(2, 0x33200f);
  const helmet = scene.add
    .rectangle(0, -14, 20, 8, 0xf0b532)
    .setStrokeStyle(2, 0x593711);
  const glow = scene.add.circle(
    0,
    -16,
    7,
    VISUAL_TOKENS.colors.highlight,
    0.18,
  );
  const lamp = scene.add.circle(0, -16, 3, VISUAL_TOKENS.colors.highlight);
  const pick = scene.add.line(11, 0, -7, 0, 9, -10, 0xe4ddd2).setLineWidth(3);
  return scene.add.container(x, y, [
    shadow,
    outline,
    body,
    head,
    helmet,
    glow,
    lamp,
    pick,
  ]);
}

function lighten(color: number, amount: number): number {
  const red = Math.min(255, ((color >> 16) & 0xff) + amount);
  const green = Math.min(255, ((color >> 8) & 0xff) + amount);
  const blue = Math.min(255, (color & 0xff) + amount);
  return (red << 16) | (green << 8) | blue;
}
