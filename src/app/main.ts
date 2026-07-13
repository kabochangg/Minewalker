import { createGame } from "./phaserConfig";
import "../ui/styles/global.css";
import { registerSW } from "virtual:pwa-register";

const game = createGame();

const updateServiceWorker = registerSW({
  onNeedRefresh() {
    showPwaNotice(
      "新しい版があります",
      "更新",
      () => void updateServiceWorker(true),
    );
  },
  onOfflineReady() {
    showPwaNotice("オフラインでも遊べます", "閉じる");
  },
});

if (import.meta.env.VITE_E2E === "1") {
  const browserWindow = window as typeof window & {
    __minewalkerStartExploration?: () => void;
  };
  browserWindow.__minewalkerStartExploration = () => {
    for (const scene of game.scene.getScenes(false)) {
      game.scene.stop(scene.scene.key);
    }
    game.scene.start("ExplorationScene");
  };
}

window.setTimeout(() => {
  document.querySelector("#loading-screen")?.remove();
}, 500);

function showPwaNotice(
  message: string,
  actionLabel: string,
  action?: () => void,
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
  notice.append(text, button);
  document.body.append(notice);
}
