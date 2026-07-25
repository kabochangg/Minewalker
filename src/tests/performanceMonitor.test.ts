import { describe, expect, it } from "vitest";
import { PerformanceMonitor } from "../game/presentation/PerformanceMonitor";

describe("PerformanceMonitor", () => {
  it("FPS、p95、入力応答、停止回数を集計する", () => {
    const monitor = new PerformanceMonitor();
    monitor.start(0);
    for (let index = 1; index <= 60; index += 1) {
      monitor.recordFrame(index * (1_000 / 60));
    }
    monitor.recordInput("input-1", 100);
    monitor.recordPresented("input-1", 145);
    monitor.setObjectCounts({ gameObjects: 100, texts: 12, activeChunks: 8 });
    const snapshot = monitor.stop(1_000);
    expect(snapshot.averageFps).toBe(60);
    expect(snapshot.frameDeltaP95Ms).toBeLessThan(17);
    expect(snapshot.inputToPresentP95Ms).toBe(45);
    expect(snapshot.stallsOver100Ms).toBe(0);
    expect(snapshot.objectCounts.texts).toBe(12);
  });
});
