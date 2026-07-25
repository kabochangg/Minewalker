import type { RouteState } from "../app/routeState";
import type { LegacyRunInput } from "./RunSaveSystem";
import { saveRun } from "./RunSaveSystem";
import type { SaveData } from "./SaveSystem";
import { saveGame } from "./SaveSystem";
import { RunSaveScheduler } from "./RunSaveScheduler";

const ROUTE_KEY = "minewalker.route.v1";

/** アプリ全体で共有する通常保存スケジューラ。 */
export const saveCoordinator = new RunSaveScheduler({
  persistent: (snapshot) => saveGame(snapshot as SaveData),
  run: (snapshot) => saveRun(snapshot as LegacyRunInput),
  route: (snapshot) => {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(ROUTE_KEY, JSON.stringify(snapshot as RouteState));
  },
});
