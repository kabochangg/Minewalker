import type { AreaId } from "../data/areas";
import type { DifficultyId } from "../data/difficulties";
import type { InputProfile } from "../game/components/toolComponents";

const ROUTE_KEY = "minewalker.route.v1";

export type RequestedStartMode = "continue" | "new";

export interface RouteState {
  readonly selectedAreaId: AreaId;
  readonly selectedDifficulty: DifficultyId;
  readonly inputProfile?: InputProfile;
  readonly requestedStartMode: RequestedStartMode;
}

let routeState: RouteState = {
  selectedAreaId: "area.beginnerMine",
  selectedDifficulty: "normal",
  requestedStartMode: "new",
};

export function getSelectedAreaId(): AreaId {
  return routeState.selectedAreaId;
}

export function setSelectedAreaId(areaId: AreaId): void {
  routeState = { ...routeState, selectedAreaId: areaId };
  persistRouteState();
}

/** 現在の画面遷移設定を返す。 */
export function getRouteState(): RouteState {
  return routeState;
}

/** 開始方式・難易度・入力方式をまとめて更新する。 */
export function setRouteState(next: RouteState, storage?: Storage): void {
  routeState = next;
  persistRouteState(storage);
}

/** 保存済み画面遷移設定を復元する。 */
export function restoreRouteState(storage?: Storage): RouteState {
  const target =
    storage ?? (typeof localStorage === "undefined" ? undefined : localStorage);
  const raw = target?.getItem(ROUTE_KEY);
  if (!raw) return routeState;
  try {
    const parsed = JSON.parse(raw) as Partial<RouteState>;
    if (
      [
        "area.beginnerMine",
        "area.crystalCave",
        "area.volcanoMine",
        "area.ancientSite",
      ].includes(parsed.selectedAreaId ?? "") &&
      ["easy", "normal", "hard"].includes(parsed.selectedDifficulty ?? "") &&
      ["continue", "new"].includes(parsed.requestedStartMode ?? "")
    ) {
      routeState = parsed as RouteState;
    }
  } catch {
    // 破損した一時画面状態は安全な既定値のまま扱う。
  }
  return routeState;
}

function persistRouteState(storage?: Storage): void {
  const target =
    storage ?? (typeof localStorage === "undefined" ? undefined : localStorage);
  target?.setItem(ROUTE_KEY, JSON.stringify(routeState));
}
