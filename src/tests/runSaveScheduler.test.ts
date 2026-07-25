import { afterEach, describe, expect, it, vi } from "vitest";
import { RunSaveScheduler } from "../save/RunSaveScheduler";

afterEach(() => {
  vi.useRealTimers();
});

describe("RunSaveScheduler", () => {
  it("同じ領域の要求を最新スナップショットへ集約する", async () => {
    vi.useFakeTimers();
    const saved: unknown[] = [];
    const scheduler = new RunSaveScheduler({
      persistent: () => undefined,
      route: () => undefined,
      run: (snapshot) => {
        saved.push(snapshot);
      },
    });
    scheduler.markDirty("run", { revision: 1 }, "move");
    scheduler.markDirty("run", { revision: 2 }, "mine");
    await vi.advanceTimersByTimeAsync(250);
    expect(saved).toEqual([{ revision: 2 }]);
    expect(scheduler.getStatus().dirtyDomains).toEqual([]);
  });

  it("明示フラッシュでは全領域を保存する", async () => {
    const order: string[] = [];
    const scheduler = new RunSaveScheduler({
      persistent: () => {
        order.push("persistent");
      },
      route: () => {
        order.push("route");
      },
      run: () => {
        order.push("run");
      },
    });
    scheduler.markDirty("persistent", {}, "upgrade");
    scheduler.markDirty("run", {}, "mine");
    const result = await scheduler.flushAll("hidden");
    expect(result.ok).toBe(true);
    expect(order.sort()).toEqual(["persistent", "run"]);
    scheduler.dispose();
  });

  it("失敗したスナップショットを再試行できるよう保持する", async () => {
    const scheduler = new RunSaveScheduler({
      persistent: () => undefined,
      route: () => undefined,
      run: () => {
        throw new Error("quota");
      },
    });
    scheduler.markDirty("run", { revision: 1 }, "mine");
    const result = await scheduler.flushAll("manual");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("quota");
    expect(scheduler.getStatus().dirtyDomains).toEqual(["run"]);
    scheduler.dispose();
  });
});
