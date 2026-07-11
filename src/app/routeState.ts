import type { AreaId } from "../data/areas";

let selectedAreaId: AreaId = "area.beginnerMine";

export function getSelectedAreaId(): AreaId {
  return selectedAreaId;
}

export function setSelectedAreaId(areaId: AreaId): void {
  selectedAreaId = areaId;
}
