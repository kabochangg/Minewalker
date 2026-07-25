import { createGame } from "./phaserConfig";
import "../ui/styles/global.css";
import { registerSW } from "virtual:pwa-register";
import { getGameState } from "../game/state/GameState";
import { PwaLifecycleController } from "./PwaLifecycleController";
import { saveCoordinator } from "../save/saveCoordinator";
import type {
  ObjectCountSnapshot,
  PerformanceSnapshot,
} from "../game/presentation/PerformanceMonitor";

const game = createGame();
const pwaLifecycle = new PwaLifecycleController(
  async () => {
    saveCoordinator.markDirty("persistent", getGameState(), "pwaUpdate");
    const result = await saveCoordinator.flushAll("pwaUpdate");
    if (!result.ok) {
      throw new Error(result.error ?? "更新前の保存に失敗しました");
    }
  },
  () => updateServiceWorker(true),
);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    void saveCoordinator.flushAll("hidden");
  }
});
window.addEventListener("pagehide", () => {
  void saveCoordinator.flushAll("pagehide");
});

/** 更新通知を表示し、現在の探索状態を守ったまま適用方法を選べるようにする。 */
function showUpdateNotice(): void {
  pwaLifecycle.setUpdateAvailable();
  showPwaNotice(
    "新しい版があります",
    "更新",
    () => void pwaLifecycle.applyUpdate(),
    "あとで",
    () => pwaLifecycle.deferUpdate(),
  );
}

const updateServiceWorker = registerSW({
  onNeedRefresh() {
    showUpdateNotice();
  },
  onOfflineReady() {
    pwaLifecycle.setOfflineReady();
    showPwaNotice("オフラインでも遊べます", "閉じる");
  },
});

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  const promptEvent = event as BeforeInstallPromptEvent;
  pwaLifecycle.setInstallAvailable(true);
  showPwaNotice(
    "端末へインストールできます",
    "インストール",
    () => void promptEvent.prompt(),
    "あとで",
  );
});

if (import.meta.env.VITE_E2E === "1") {
  interface ExplorationPerformanceBridge {
    resetPerformance(): void;
    startPerformance(): void;
    performanceSnapshot(): PerformanceSnapshot;
  }
  const browserWindow = window as typeof window & {
    __minewalkerStartExploration?: () => void;
    __minewalkerActiveScene?: () => string | undefined;
    __minewalkerPwaE2E?: {
      readonly state: () => typeof pwaLifecycle.state;
      readonly notifyUpdate: () => void;
      readonly deferUpdate: () => void;
      readonly applyUpdate: () => Promise<boolean>;
    };
    __minewalkerE2E?: ExplorationPerformanceBridge;
    __minewalkerPerformance?: {
      reset(): void;
      start(windowMs: number): void;
      stop(): PerformanceSnapshot;
      getObjectCounts(): ObjectCountSnapshot;
      getFontStatus(): { readonly loaded: boolean; readonly family: string };
      getSaveStatus(): ReturnType<typeof saveCoordinator.getStatus>;
    };
  };
  browserWindow.__minewalkerStartExploration = () => {
    for (const scene of game.scene.getScenes(false)) {
      game.scene.stop(scene.scene.key);
    }
    game.scene.start("ExplorationScene");
  };
  browserWindow.__minewalkerActiveScene = () =>
    game.scene.getScenes(true).at(-1)?.scene.key;
  browserWindow.__minewalkerPwaE2E = {
    state: () => pwaLifecycle.state,
    notifyUpdate: showUpdateNotice,
    deferUpdate: () => pwaLifecycle.deferUpdate(),
    applyUpdate: () => pwaLifecycle.applyUpdate(),
  };
  browserWindow.__minewalkerPerformance = {
    reset: () => browserWindow.__minewalkerE2E?.resetPerformance(),
    start: () => browserWindow.__minewalkerE2E?.startPerformance(),
    stop: () =>
      browserWindow.__minewalkerE2E?.performanceSnapshot() ?? {
        averageFps: 0,
        frameDeltaP95Ms: 0,
        inputToPresentP95Ms: 0,
        stallsOver100Ms: 0,
        sampleCount: 0,
        objectCounts: { gameObjects: 0, texts: 0, activeChunks: 0 },
      },
    getObjectCounts: () =>
      browserWindow.__minewalkerE2E?.performanceSnapshot().objectCounts ?? {
        gameObjects: 0,
        texts: 0,
        activeChunks: 0,
      },
    getFontStatus: () => ({
      loaded: document.fonts.check(
        '400 16px "MinewalkerJP"',
        "鉱山 危険 処理 0123456789",
      ),
      family: "MinewalkerJP",
    }),
    getSaveStatus: () => saveCoordinator.getStatus(),
  };
}

window.setTimeout(() => {
  document.querySelector("#loading-screen")?.remove();
}, 500);

function showPwaNotice(
  message: string,
  actionLabel: string,
  action?: () => void,
  secondaryLabel?: string,
  secondaryAction?: () => void,
): void {
  document.querySelector(".pwa-notice")?.remove();
  const notice = document.createElement("div");
  notice.className = "pwa-notice";
  const text = document.createElement("span");
  text.textContent = message;
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = actionLabel;
  button.addEventListener("click", () => {
    action?.();
    notice.remove();
  });
  notice.append(text);
  if (secondaryLabel) {
    const secondary = document.createElement("button");
    secondary.type = "button";
    secondary.textContent = secondaryLabel;
    secondary.addEventListener("click", () => {
      secondaryAction?.();
      notice.remove();
    });
    notice.append(secondary);
  }
  notice.append(button);
  document.body.append(notice);
}
