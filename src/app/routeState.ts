import type { AreaId } from "../data/areas";

export interface RouteState {
  readonly selectedAreaId: AreaId;
}

export const routeState: RouteState = {
  selectedAreaId: "area.beginnerMine"
};
