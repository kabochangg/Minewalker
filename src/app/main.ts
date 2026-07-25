import { createGame } from "./phaserConfig";
import "../ui/styles/global.css";
import { registerSW } from "virtual:pwa-register";
import { getGameState } from "../game/state/GameState";
import { saveGame } from "../save/SaveSystem";
import { PwaLifecycleController } from "./PwaLifecycleController";

const game = createGame();
const pwaLifecycle = new PwaLifecycleController(
  () => saveGame(getGameState()),
  () => updateServiceWorker(true),
);

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
  const browserWindow = window as typeof window & {
    __minewalkerStartExploration?: () => void;
    __minewalkerActiveScene?: () => string | undefined;
    __minewalkerPwaE2E?: {
      readonly state: () => typeof pwaLifecycle.state;
      readonly notifyUpdate: () => void;
      readonly deferUpdate: () => void;
      readonly applyUpdate: () => Promise<boolean>;
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
