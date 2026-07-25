import type {
  CheckpointComponent,
  CheckpointObjective,
} from "../components/progressionComponents";

/** 条件評価へ渡す探索実績を表す。 */
export interface ObjectiveContext {
  readonly reachedCheckpointIds: readonly string[];
  readonly disposedHazards: number;
  readonly acquiredItems: Readonly<Record<string, number>>;
  readonly defeatedMonsterIds: readonly string[];
  readonly hasSafeRoute: boolean;
}

/** 単一目的の現在値を返す。 */
export function objectiveProgress(
  objective: CheckpointObjective,
  checkpointId: string,
  context: ObjectiveContext,
): number {
  switch (objective.kind) {
    case "reach":
      return context.reachedCheckpointIds.includes(checkpointId) ? 1 : 0;
    case "disposeHazards":
      return Math.min(objective.required, context.disposedHazards);
    case "collectMaterials":
      if (objective.itemId) {
        return Math.min(
          objective.required,
          context.acquiredItems[objective.itemId] ?? 0,
        );
      }
      return Math.min(
        objective.required,
        Object.values(context.acquiredItems).reduce(
          (sum, count) => sum + count,
          0,
        ),
      );
    case "defeatBoss":
      return context.defeatedMonsterIds.includes(objective.monsterId) ? 1 : 0;
  }
}

/** 目的と安全経路からeligible状態を再評価する。 */
export function evaluateCheckpoint(
  checkpoint: CheckpointComponent,
  context: ObjectiveContext,
): CheckpointComponent {
  if (checkpoint.status === "claimed") return checkpoint;
  const progress = Object.fromEntries(
    checkpoint.objectives.map((objective) => [
      objective.id,
      objectiveProgress(objective, checkpoint.id, context),
    ]),
  );
  const complete = checkpoint.objectives.every(
    (objective) => (progress[objective.id] ?? 0) >= objective.required,
  );
  return {
    ...checkpoint,
    progress,
    status: complete && context.hasSafeRoute ? "eligible" : "locked",
  };
}

/** eligibleなチェックポイントを冪等に確保する。 */
export function claimCheckpoint(
  checkpoint: CheckpointComponent,
  territoryId: string,
): CheckpointComponent | undefined {
  if (checkpoint.status === "claimed") return checkpoint;
  if (checkpoint.status !== "eligible") return undefined;
  return {
    ...checkpoint,
    status: "claimed",
    connectedTerritoryId: territoryId,
  };
}
