import { describe, expect, it, vi } from "vitest";
import { PwaLifecycleController } from "../app/PwaLifecycleController";

describe("PwaLifecycleController", () => {
  it("install・offline・update・defer状態を管理する", () => {
    const controller = new PwaLifecycleController(
      () => undefined,
      () => undefined,
    );
    controller.setInstallAvailable(true);
    controller.setOfflineReady();
    controller.setUpdateAvailable();
    controller.deferUpdate();
    expect(controller.state).toEqual({
      installAvailable: true,
      offlineReady: true,
      updateAvailable: true,
      updateDeferred: true,
    });
  });

  it("保存後にだけ更新を適用する", async () => {
    const order: string[] = [];
    const controller = new PwaLifecycleController(
      () => {
        order.push("save");
      },
      () => {
        order.push("update");
      },
    );
    controller.setUpdateAvailable();
    expect(await controller.applyUpdate()).toBe(true);
    expect(order).toEqual(["save", "update"]);
  });

  it("保存失敗時は更新しない", async () => {
    const update = vi.fn();
    const controller = new PwaLifecycleController(() => {
      throw new Error("save failed");
    }, update);
    expect(await controller.applyUpdate()).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });
});
