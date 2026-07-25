import { describe, expect, it } from "vitest";
import {
  calculateCameraView,
  screenToWorld,
  smoothCameraView,
  worldToScreen,
} from "../game/systems/CameraSystem";

describe("CameraSystem", () => {
  it("プレイヤーを中央へ追従しワールド境界へ制限する", () => {
    const center = calculateCameraView(500, 400, 200, 100, {
      x: 0,
      y: 0,
      width: 1_000,
      height: 800,
    });
    expect(center.scrollX).toBe(400);
    expect(center.scrollY).toBe(350);
    expect(
      calculateCameraView(10, 10, 200, 100, {
        x: 0,
        y: 0,
        width: 1_000,
        height: 800,
      }).scrollX,
    ).toBe(0);
  });

  it("ズームを0.75〜1.5へ制限する", () => {
    expect(
      calculateCameraView(
        0,
        0,
        100,
        100,
        { x: 0, y: 0, width: 100, height: 100 },
        3,
      ).zoom,
    ).toBe(1.5);
    expect(
      calculateCameraView(
        0,
        0,
        100,
        100,
        { x: 0, y: 0, width: 100, height: 100 },
        0.1,
      ).zoom,
    ).toBe(0.75);
  });

  it("world-to-screenと逆変換を整合させる", () => {
    const screen = worldToScreen(3, 4, 20, 30);
    const world = screenToWorld(screen.x, screen.y, {
      scrollX: 20,
      scrollY: 30,
      zoom: 1,
    });
    expect(world).toEqual({ x: 144, y: 192 });
  });

  it("経過時間に応じてカメラを滑らかに追従させる", () => {
    const current = { scrollX: 0, scrollY: 0, zoom: 1 };
    const target = { scrollX: 100, scrollY: 50, zoom: 1.2 };
    const short = smoothCameraView(current, target, 16);
    const long = smoothCameraView(current, target, 32);
    expect(short.scrollX).toBeGreaterThan(0);
    expect(long.scrollX).toBeGreaterThan(short.scrollX);
    expect(long.scrollX).toBeLessThan(target.scrollX);
  });
});
