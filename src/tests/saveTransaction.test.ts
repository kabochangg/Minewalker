import { describe, expect, it } from "vitest";
import { createSaveData } from "../save/SaveSystem";
import {
  executeSaveTransaction,
  recoverPendingTransaction,
  TRANSACTION_KEY,
} from "../save/SaveTransactionSystem";
import { createExplorationFixture } from "./fixtures/explorationFixtures";
import { TransactionalMemoryStorage } from "./fixtures/TransactionalMemoryStorage";

function createRecord(
  operation: "death" | "recovery" | "checkpointClaim" = "checkpointClaim",
) {
  const id = `tx.${operation}.1`;
  return {
    id,
    operation,
    createdAt: "2026-01-01T00:00:00.000Z",
    nextPersistentSave: { ...createSaveData(), lastTransactionId: id },
    nextRunSave: { ...createExplorationFixture(), lastTransactionId: id },
  };
}

describe("SaveTransactionSystem", () => {
  it("永続領域と探索領域を順に保存してjournalを削除する", () => {
    const storage = new TransactionalMemoryStorage();
    expect(executeSaveTransaction(createRecord(), storage).ok).toBe(true);
    expect(storage.getItem(TRANSACTION_KEY)).toBeNull();
    expect(storage.getItem("minewalker.save.v3")).toContain(
      "tx.checkpointClaim.1",
    );
    expect(storage.getItem("minewalker.run.v2")).toContain(
      "tx.checkpointClaim.1",
    );
  });

  it.each([2, 3, 4, 5, 6])(
    "%i番目の書き込み停止後も再起動時にroll-forwardする",
    (failureWrite) => {
      const storage = new TransactionalMemoryStorage({}, failureWrite);
      const result = executeSaveTransaction(createRecord(), storage);
      expect(result.ok).toBe(false);
      expect(result.recoveryRequired).toBe(true);
      storage.failOnWrite(undefined);
      expect(recoverPendingTransaction(storage).ok).toBe(true);
      expect(storage.getItem(TRANSACTION_KEY)).toBeNull();
    },
  );

  it("同じtransaction IDを再適用しても状態を重複させない", () => {
    const storage = new TransactionalMemoryStorage();
    const record = createRecord();
    expect(executeSaveTransaction(record, storage).ok).toBe(true);
    expect(executeSaveTransaction(record, storage).ok).toBe(true);
    const saved = JSON.parse(storage.getItem("minewalker.save.v3") ?? "{}") as {
      nextOperationSequence: number;
    };
    expect(saved.nextOperationSequence).toBe(1);
  });

  it("破損journalは通常データへ適用しない", () => {
    const storage = new TransactionalMemoryStorage({
      [TRANSACTION_KEY]: "{broken",
    });
    expect(recoverPendingTransaction(storage).ok).toBe(true);
    expect(storage.getItem("minewalker.save.v3")).toBeNull();
  });

  it.each(["death", "recovery"] as const)(
    "%s操作も中断後に同じjournalをroll-forwardする",
    (operation) => {
      const storage = new TransactionalMemoryStorage({}, 4);
      expect(
        executeSaveTransaction(createRecord(operation), storage)
          .recoveryRequired,
      ).toBe(true);
      storage.failOnWrite(undefined);
      expect(recoverPendingTransaction(storage).ok).toBe(true);
      expect(storage.getItem(TRANSACTION_KEY)).toBeNull();
    },
  );
});
