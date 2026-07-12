import { createGame } from "./phaserConfig";
import "../ui/styles/global.css";

createGame();

window.setTimeout(() => {
  document.querySelector("#loading-screen")?.remove();
}, 500);
