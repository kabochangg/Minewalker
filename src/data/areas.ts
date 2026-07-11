export type AreaId =
  | "area.beginnerMine"
  | "area.crystalCave"
  | "area.volcanoMine"
  | "area.ancientSite";

export interface AreaDefinition {
  readonly id: AreaId;
  readonly name: string;
  readonly recommendedLevel: string;
  readonly staminaCost: number;
  readonly maxDepth: number;
  readonly mineDensity: number;
  readonly difficulty: number;
  readonly theme: "beginnerMine" | "crystalCave" | "volcanoMine" | "ancientSite";
  readonly unlocked: boolean;
}

export const AREAS: readonly AreaDefinition[] = [
  {
    id: "area.beginnerMine",
    name: "初心者鉱山",
    recommendedLevel: "1-3",
    staminaCost: 5,
    maxDepth: 10,
    mineDensity: 0.16,
    difficulty: 1,
    theme: "beginnerMine",
    unlocked: true
  },
  {
    id: "area.crystalCave",
    name: "水晶洞窟",
    recommendedLevel: "4-8",
    staminaCost: 10,
    maxDepth: 20,
    mineDensity: 0.2,
    difficulty: 2,
    theme: "crystalCave",
    unlocked: false
  },
  {
    id: "area.volcanoMine",
    name: "火山鉱山",
    recommendedLevel: "9-14",
    staminaCost: 15,
    maxDepth: 30,
    mineDensity: 0.24,
    difficulty: 3,
    theme: "volcanoMine",
    unlocked: false
  },
  {
    id: "area.ancientSite",
    name: "古代採掘場",
    recommendedLevel: "15-20",
    staminaCost: 20,
    maxDepth: 50,
    mineDensity: 0.28,
    difficulty: 4,
    theme: "ancientSite",
    unlocked: false
  }
];

export function getArea(id: AreaId): AreaDefinition {
  const area = AREAS.find((candidate) => candidate.id === id);
  if (!area) {
    throw new Error(`Unknown area id: ${id}`);
  }
  return area;
}
