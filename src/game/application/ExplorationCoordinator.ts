import type { ItemId } from "../../data/items";
import {
  executeSaveTransaction,
  recoverPendingTransaction,
} from "../../save/SaveTransactionSystem";
import type { SaveData } from "../../save/SaveSystem";
import type { InventoryState } from "../systems/InventorySystem";
import type { PlayerState } from "../entities/player";
import { getTile } from "../map/types";
import type {
  DomainEvent,
  ExplorationCommand,
  ExplorationState,
  SystemResult,
} from "../state/ExplorationState";
import type { RenderPatch } from "../presentation/RenderPatch";
import { buildRenderPatch } from "../presentation/RenderPatchBuilder";
import { claimCheckpoint } from "../systems/CheckpointSystem";
import {
  createDeathTransition,
  recoverDeathCache,
} from "../systems/DeathRecoverySystem";
import { disposeHazard, toggleDangerMark } from "../systems/HazardSystem";
import { mineTile } from "../systems/MiningSystem";
import { advanceContinuousMovement } from "../systems/MovementSystem";
import { applyLocomotionCost, recoverStamina } from "../systems/StaminaSystem";
import {
  calculateConnectedTerritory,
  expandTerritory,
} from "../systems/TerritorySystem";

/** Coordinatorへ注入する永続化依存を表す。 */
export interface ExplorationCoordinatorOptions {
  readonly storage?: Storage;
  readonly persistent?: SaveData;
}

/** コマンドを純粋Systemへ順序付けして配信する探索アプリケーション層。 */
export class ExplorationCoordinator {
  #state: ExplorationState;
  #persistent?: SaveData;
  readonly #storage?: Storage;
  readonly #listeners = new Set<(events: readonly DomainEvent[]) => void>();
  #active = true;
  #recoveryRequired = false;
  #renderRevision = 0;

  /** 初期状態と任意の保存依存を設定する。 */
  constructor(
    state: ExplorationState,
    options: ExplorationCoordinatorOptions = {},
  ) {
    this.#state = state;
    this.#persistent = options.persistent;
    this.#storage = options.storage;
    if (this.#storage) {
      const recovery = recoverPendingTransaction(this.#storage);
      this.#recoveryRequired = recovery.recoveryRequired;
    }
  }

  /** 現在公開中の探索状態。 */
  get state(): ExplorationState {
    return this.#state;
  }

  /** journal復旧が必要で新規コマンドを拒否する状態。 */
  get recoveryRequired(): boolean {
    return this.#recoveryRequired;
  }

  /** DomainEventの購読を登録し、解除関数を返す。 */
  subscribe(listener: (events: readonly DomainEvent[]) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /** 1件のコマンドを固定順序で処理する。 */
  dispatch(command: ExplorationCommand): SystemResult {
    if (!this.#active) return this.#rejected("探索は終了しています");
    if (this.#recoveryRequired) return this.#rejected("保存データを復旧中です");
    const result = this.#dispatchActive(command);
    if (result.accepted) {
      this.#state = result.state;
      for (const listener of this.#listeners) listener(result.events);
    }
    return result;
  }

  /** コマンド結果と同じ更新に対応する描画差分を返す。 */
  dispatchWithPatch(
    command: ExplorationCommand,
    inputReceiptId?: string,
  ): SystemResult & { readonly patch: RenderPatch } {
    const previous = this.#state;
    const result = this.dispatch(command);
    this.#renderRevision += 1;
    return {
      ...result,
      patch: buildRenderPatch(previous, result.state, {
        revision: this.#renderRevision,
        events: result.events,
        ...(inputReceiptId ? { inputReceiptId } : {}),
      }),
    };
  }

  /** HP 0の状態を死亡トランザクションとして確定する。 */
  commitDeath(createdAt: string): SystemResult {
    if (!this.#persistent || !this.#storage) {
      return this.#rejected("死亡状態を保存できません");
    }
    const transition = createDeathTransition(
      this.#persistent,
      this.#state,
      createdAt,
    );
    const saved = executeSaveTransaction(
      {
        id: transition.transactionId,
        operation: "death",
        nextPersistentSave: transition.persistent,
        nextRunSave: transition.exploration,
        createdAt,
      },
      this.#storage,
    );
    if (!saved.ok) {
      this.#recoveryRequired = saved.recoveryRequired;
      return this.#rejected(saved.error ?? "死亡状態の保存に失敗しました");
    }
    this.#persistent = transition.persistent;
    this.#state = transition.exploration;
    const events: DomainEvent[] = [
      { type: "playerDied", cacheId: transition.cache.id },
    ];
    for (const listener of this.#listeners) listener(events);
    return { state: this.#state, events, accepted: true, requiresSave: true };
  }

  /** Scene終了後の入力とイベント配信を停止する。 */
  shutdown(): void {
    this.#active = false;
    this.#listeners.clear();
  }

  #dispatchActive(command: ExplorationCommand): SystemResult {
    switch (command.type) {
      case "move":
        return this.#move(command);
      case "mine":
        return this.#mine(command.x, command.y);
      case "toggleDangerMark":
        return this.#toggleMark(command.x, command.y);
      case "disposeHazard":
        return this.#dispose(command.x, command.y);
      case "tick":
        return this.#tick(command.elapsedActiveMs);
      case "claimCheckpoint":
        return this.#claim(command.checkpointId);
      case "recoverDeathCache":
        return this.#recover(command.cacheId);
      case "pause":
        return this.#accept({ ...this.#state, status: "paused" }, []);
      case "resume":
        return this.#accept({ ...this.#state, status: "active" }, []);
      case "attack":
        return this.#rejected("攻撃対象がいません");
    }
  }

  #move(command: Extract<ExplorationCommand, { type: "move" }>): SystemResult {
    const stamina = applyLocomotionCost(
      this.#state.player,
      command.locomotion,
      command.elapsedMs,
    );
    const speed = stamina.locomotion === "run" ? 3.5 : 2;
    const movement = advanceContinuousMovement(
      this.#state.dungeon.field,
      this.#state.player.gridPosition,
      this.#state.player.position,
      command.direction,
      (command.elapsedMs / 1_000) * speed,
      this.#state.monsters
        .filter((monster) => !monster.defeated)
        .map((monster) => monster.position),
    );
    if (!movement.moved) return this.#rejected("その方向へ移動できません");
    return this.#accept(
      {
        ...this.#state,
        player: {
          ...this.#state.player,
          ...stamina.state,
          position: movement.position,
          gridPosition: movement.gridPosition,
          locomotion: stamina.locomotion,
          actionState: "moving",
        },
      },
      [{ type: "playerMoved" }],
    );
  }

  #mine(x: number, y: number): SystemResult {
    const tile = getTile(this.#state.dungeon.field, x, y);
    if (!tile) return this.#rejected("盤面外です");
    const result = mineTile(
      this.#state.dungeon.field,
      toLegacyPlayer(this.#state),
      toLegacyInventory(this.#state),
      tile,
      `${this.#state.elapsedActiveMs}`,
    );
    if (!result.mined) return this.#rejected(result.message);
    const state: ExplorationState = {
      ...this.#state,
      dungeon: { ...this.#state.dungeon, field: result.field },
      player: {
        ...this.#state.player,
        hp: result.player.hp,
        stamina: result.player.stamina,
        actionState: result.player.actionState,
      },
      inventory: {
        ...this.#state.inventory,
        items: result.inventory.items,
        acquiredThisRun: result.gainedItemId
          ? {
              ...this.#state.inventory.acquiredThisRun,
              [result.gainedItemId]:
                (this.#state.inventory.acquiredThisRun[result.gainedItemId] ??
                  0) + (result.gainedAmount ?? 0),
            }
          : this.#state.inventory.acquiredThisRun,
      },
    };
    const events: DomainEvent[] = [
      { type: "wallMined", x, y },
      { type: "feedback", message: result.message },
    ];
    return this.#accept(state, events);
  }

  #toggleMark(x: number, y: number): SystemResult {
    const tile = getTile(this.#state.dungeon.field, x, y);
    if (!tile) return this.#rejected("盤面外です");
    const result = toggleDangerMark(this.#state.dungeon.field, tile);
    if (!result.accepted) return this.#rejected("このマスにはマークできません");
    return this.#accept(
      {
        ...this.#state,
        dungeon: { ...this.#state.dungeon, field: result.field },
      },
      [],
    );
  }

  #dispose(x: number, y: number): SystemResult {
    const tile = getTile(this.#state.dungeon.field, x, y);
    const tool = this.#state.tools[0];
    if (!tile || !tool) return this.#rejected("処理対象または道具がありません");
    const result = disposeHazard(
      this.#state.dungeon.field,
      this.#state.dungeon.hazards,
      tile,
      this.#state.player,
      tool,
    );
    if (!result.accepted) return this.#rejected(result.message);
    return this.#accept(
      {
        ...this.#state,
        dungeon: {
          ...this.#state.dungeon,
          field: result.field,
          hazards: result.hazards,
        },
        player: {
          ...this.#state.player,
          stamina: result.stamina.stamina,
          actionState: "disposing",
        },
        tools: [result.tool, ...this.#state.tools.slice(1)],
      },
      result.hazard
        ? [
            { type: "hazardDisposed", hazardId: result.hazard.id },
            { type: "feedback", message: result.message },
          ]
        : [{ type: "feedback", message: result.message }],
    );
  }

  #tick(elapsedActiveMs: number): SystemResult {
    if (this.#state.status !== "active")
      return this.#rejected("探索停止中です");
    const player = recoverStamina(this.#state.player, elapsedActiveMs, true);
    return this.#accept(
      {
        ...this.#state,
        player: { ...this.#state.player, stamina: player.stamina },
        elapsedActiveMs:
          this.#state.elapsedActiveMs +
          Math.max(0, Math.floor(elapsedActiveMs)),
      },
      [],
    );
  }

  #claim(checkpointId: string): SystemResult {
    const checkpoint = this.#state.checkpoints.find(
      (candidate) => candidate.id === checkpointId,
    );
    if (!checkpoint) return this.#rejected("チェックポイントがありません");
    const territoryId = `territory.${this.#state.areaId}`;
    const claimed = claimCheckpoint(checkpoint, territoryId);
    if (!claimed) return this.#rejected("クリア条件または安全な道筋が未達です");
    if (!this.#persistent || !this.#storage)
      return this.#rejected("確保状態を保存できません");
    const tileKeys = calculateConnectedTerritory(this.#state.dungeon.field, [
      this.#state.dungeon.config.entrance,
      claimed.position,
    ]);
    const sequence = this.#persistent.nextOperationSequence;
    const transactionId = `tx.checkpointClaim.${sequence}`;
    const territory = expandTerritory(
      this.#state.areaId,
      checkpointId,
      tileKeys,
      this.#persistent.territories[this.#state.areaId],
      new Date().toISOString(),
    );
    const exploration: ExplorationState = {
      ...this.#state,
      checkpoints: this.#state.checkpoints.map((candidate) =>
        candidate.id === checkpointId ? claimed : candidate,
      ),
      dungeon: {
        ...this.#state.dungeon,
        checkpoints: this.#state.dungeon.checkpoints.map((candidate) =>
          candidate.id === checkpointId ? claimed : candidate,
        ),
      },
      lastTransactionId: transactionId,
    };
    const persistent: SaveData = {
      ...this.#persistent,
      territories: {
        ...this.#persistent.territories,
        [this.#state.areaId]: territory,
      },
      lastTransactionId: transactionId,
      nextOperationSequence: sequence + 1,
    };
    const saved = executeSaveTransaction(
      {
        id: transactionId,
        operation: "checkpointClaim",
        nextPersistentSave: persistent,
        nextRunSave: exploration,
        createdAt: territory.updatedAt,
      },
      this.#storage,
    );
    if (!saved.ok) {
      this.#recoveryRequired = saved.recoveryRequired;
      return this.#rejected(saved.error ?? "領域の保存に失敗しました");
    }
    this.#persistent = persistent;
    return this.#accept(
      exploration,
      [{ type: "checkpointClaimed", checkpointId }],
      true,
    );
  }

  #recover(cacheId: string): SystemResult {
    if (!this.#persistent || !this.#storage)
      return this.#rejected("回収状態を保存できません");
    const transition = recoverDeathCache(
      this.#persistent,
      this.#state,
      cacheId,
    );
    if (!transition)
      return this.#rejected(
        "この場所では回収できないか、バッグ容量が不足しています",
      );
    const saved = executeSaveTransaction(
      {
        id: transition.transactionId,
        operation: "recovery",
        nextPersistentSave: transition.persistent,
        nextRunSave: transition.exploration,
        createdAt: new Date().toISOString(),
      },
      this.#storage,
    );
    if (!saved.ok) {
      this.#recoveryRequired = saved.recoveryRequired;
      return this.#rejected(saved.error ?? "回収状態の保存に失敗しました");
    }
    this.#persistent = transition.persistent;
    return this.#accept(
      transition.exploration,
      [{ type: "deathCacheRecovered", cacheId }],
      true,
    );
  }

  #accept(
    state: ExplorationState,
    events: readonly DomainEvent[],
    requiresSave = false,
  ): SystemResult {
    return { state, events, accepted: true, requiresSave };
  }

  #rejected(reason: string): SystemResult {
    return { state: this.#state, events: [], accepted: false, reason };
  }
}

function toLegacyPlayer(state: ExplorationState): PlayerState {
  return {
    x: state.player.gridPosition.x,
    y: state.player.gridPosition.y,
    hp: state.player.hp,
    maxHp: state.player.maxHp,
    stamina: Math.floor(state.player.stamina),
    maxStamina: Math.floor(state.player.maxStamina),
    attack: 10,
    defense: 3,
    coins: 0,
    depth: 0,
    actionState:
      state.player.actionState === "disposing"
        ? "usingItem"
        : state.player.actionState,
  };
}

function toLegacyInventory(state: ExplorationState): InventoryState {
  return {
    capacity: state.inventory.capacity,
    items: state.inventory.items as Readonly<Record<ItemId, number>>,
    ...state.inventory.consumables,
  };
}
