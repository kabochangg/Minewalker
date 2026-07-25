import type { ExplorationState } from "../game/state/ExplorationState";
import { loadExplorationState, saveExplorationState } from "./RunSaveSystem";
import {
  loadGame,
  saveGame,
  validateSaveData,
  type SaveData,
} from "./SaveSystem";

export const TRANSACTION_KEY = "minewalker.tx.v1";

/** 複数保存領域へ跨る操作種別を表す。 */
export type SaveTransactionOperation = "death" | "recovery" | "checkpointClaim";

/** write-ahead journalの進行段階を表す。 */
export type SaveTransactionPhase =
  "prepared" | "persistentWritten" | "runWritten" | "committed";

/** 中断時に再適用できる更新後スナップショットを表す。 */
export interface SaveTransactionRecord {
  readonly version: 1;
  readonly id: string;
  readonly operation: SaveTransactionOperation;
  readonly phase: SaveTransactionPhase;
  readonly nextPersistentSave: SaveData;
  readonly nextRunSave: ExplorationState | "clear";
  readonly createdAt: string;
}

/** トランザクション実行結果を表す。 */
export interface SaveTransactionResult {
  readonly ok: boolean;
  readonly recoveryRequired: boolean;
  readonly record?: SaveTransactionRecord;
  readonly error?: string;
}

/** journalを先行保存し、永続・探索領域を順番に確定する。 */
export function executeSaveTransaction(
  record: Omit<SaveTransactionRecord, "version" | "phase">,
  storage: Storage,
): SaveTransactionResult {
  const validatedPersistent = validateSaveData(record.nextPersistentSave);
  const prepared: SaveTransactionRecord = {
    ...record,
    version: 1,
    phase: "prepared",
    nextPersistentSave: validatedPersistent,
  };
  try {
    writeJournal(storage, prepared);
  } catch (error) {
    return {
      ok: false,
      recoveryRequired: false,
      error: errorMessage(error),
    };
  }
  try {
    rollForward(prepared, storage);
    return { ok: true, recoveryRequired: false };
  } catch (error) {
    return {
      ok: false,
      recoveryRequired: true,
      record: readTransaction(storage) ?? prepared,
      error: errorMessage(error),
    };
  }
}

/** 未完了journalを更新後スナップショットへroll-forwardする。 */
export function recoverPendingTransaction(
  storage: Storage,
): SaveTransactionResult {
  const record = readTransaction(storage);
  if (!record) return { ok: true, recoveryRequired: false };
  try {
    rollForward(record, storage);
    return { ok: true, recoveryRequired: false };
  } catch (error) {
    return {
      ok: false,
      recoveryRequired: true,
      record: readTransaction(storage) ?? record,
      error: errorMessage(error),
    };
  }
}

/** 現在のjournalを解析する。破損時は復旧必須として例外にせずundefinedを返す。 */
export function readTransaction(
  storage: Storage,
): SaveTransactionRecord | undefined {
  const serialized = storage.getItem(TRANSACTION_KEY);
  if (!serialized) return undefined;
  try {
    const parsed = JSON.parse(serialized) as SaveTransactionRecord;
    if (
      parsed.version !== 1 ||
      !parsed.id ||
      !["death", "recovery", "checkpointClaim"].includes(parsed.operation) ||
      !["prepared", "persistentWritten", "runWritten", "committed"].includes(
        parsed.phase,
      )
    ) {
      return undefined;
    }
    validateSaveData(parsed.nextPersistentSave);
    return parsed;
  } catch {
    return undefined;
  }
}

function rollForward(initial: SaveTransactionRecord, storage: Storage): void {
  let record = initial;
  if (record.phase === "prepared") {
    const current = loadGame(storage);
    if (current?.lastTransactionId !== record.id)
      saveGame(record.nextPersistentSave, storage);
    record = advanceJournal(storage, record, "persistentWritten");
  }
  if (record.phase === "persistentWritten") {
    if (record.nextRunSave === "clear") {
      storage.removeItem("minewalker.run.v2");
      storage.removeItem("minewalker.run.v2.backup");
    } else {
      const current = loadExplorationState(storage);
      if (current?.lastTransactionId !== record.id) {
        saveExplorationState(record.nextRunSave, storage);
      }
    }
    record = advanceJournal(storage, record, "runWritten");
  }
  if (record.phase === "runWritten") {
    record = advanceJournal(storage, record, "committed");
  }
  if (record.phase === "committed") storage.removeItem(TRANSACTION_KEY);
}

function advanceJournal(
  storage: Storage,
  record: SaveTransactionRecord,
  phase: SaveTransactionPhase,
): SaveTransactionRecord {
  const next = { ...record, phase };
  writeJournal(storage, next);
  return next;
}

function writeJournal(storage: Storage, record: SaveTransactionRecord): void {
  storage.setItem(TRANSACTION_KEY, JSON.stringify(record));
  const readBack = storage.getItem(TRANSACTION_KEY);
  if (
    !readBack ||
    (JSON.parse(readBack) as SaveTransactionRecord).id !== record.id
  ) {
    throw new Error("トランザクションjournalの読み戻しに失敗しました");
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "保存処理で不明なエラーが発生しました";
}
