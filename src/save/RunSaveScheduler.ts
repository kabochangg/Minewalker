/** 保存対象領域。 */
export type SaveDomain = "persistent" | "run" | "route";

/** 即時フラッシュ理由。 */
export type FlushReason =
  | "timer"
  | "hidden"
  | "pagehide"
  | "sceneShutdown"
  | "navigation"
  | "pwaUpdate"
  | "manual";

/** 1回のフラッシュ結果。 */
export interface FlushResult {
  readonly ok: boolean;
  readonly domains: readonly SaveDomain[];
  readonly durationMs: number;
  readonly coalescedCount: number;
  readonly error?: string;
}

/** 保存調停の状態。 */
export interface SaveCoordinatorStatus {
  readonly dirtyDomains: readonly SaveDomain[];
  readonly lastSuccessfulAt?: number;
  readonly lastDurationMs?: number;
  readonly pendingCount: number;
}

/** 領域別の低水準保存関数。 */
export type SaveDomainWriter = (
  snapshot: unknown,
  reason: string,
) => void | Promise<void>;

interface DirtyEntry {
  snapshot: unknown;
  reason: string;
  count: number;
}

/** 通常保存を集約し、重要な画面遷移前に確実にフラッシュする。 */
export class RunSaveScheduler {
  /** 領域ごとの低水準保存関数。 */
  readonly #writers: Readonly<Record<SaveDomain, SaveDomainWriter>>;
  /** 通常保存を集約する最大時間。 */
  readonly #delayMs: number;
  /** 領域ごとの最新未保存スナップショット。 */
  readonly #dirty = new Map<SaveDomain, DirtyEntry>();
  /** 予約中の通常保存タイマー。 */
  #timer?: ReturnType<typeof setTimeout>;
  /** 最後に保存へ成功した時刻。 */
  #lastSuccessfulAt?: number;
  /** 最後に成功した保存の所要時間。 */
  #lastDurationMs?: number;

  /** 保存関数と最大集約時間を設定する。 */
  constructor(
    writers: Readonly<Record<SaveDomain, SaveDomainWriter>>,
    delayMs = 250,
  ) {
    this.#writers = writers;
    this.#delayMs = delayMs;
  }

  /** 最新スナップショットを保存待ちとして登録する。 */
  markDirty(domain: SaveDomain, snapshot: unknown, reason: string): void {
    const previous = this.#dirty.get(domain);
    this.#dirty.set(domain, {
      snapshot,
      reason,
      count: (previous?.count ?? 0) + 1,
    });
    if (this.#timer === undefined) {
      this.#timer = setTimeout(() => {
        this.#timer = undefined;
        void this.flushAll("timer");
      }, this.#delayMs);
    }
  }

  /** 指定領域だけを保存する。 */
  async flushDomain(
    domain: SaveDomain,
    reason: FlushReason | string,
  ): Promise<FlushResult> {
    const entry = this.#dirty.get(domain);
    if (!entry) return emptyResult();
    const startedAt = performance.now();
    try {
      await this.#writers[domain](entry.snapshot, reason);
      if (this.#dirty.get(domain) === entry) this.#dirty.delete(domain);
      const durationMs = performance.now() - startedAt;
      this.#lastSuccessfulAt = Date.now();
      this.#lastDurationMs = durationMs;
      return {
        ok: true,
        domains: [domain],
        durationMs,
        coalescedCount: Math.max(0, entry.count - 1),
      };
    } catch (error) {
      return {
        ok: false,
        domains: [domain],
        durationMs: performance.now() - startedAt,
        coalescedCount: Math.max(0, entry.count - 1),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /** すべての未保存領域を保存する。 */
  async flushAll(reason: FlushReason): Promise<FlushResult> {
    if (this.#timer !== undefined) {
      clearTimeout(this.#timer);
      this.#timer = undefined;
    }
    const startedAt = performance.now();
    const domains = [...this.#dirty.keys()];
    const results = await Promise.all(
      domains.map((domain) => this.flushDomain(domain, reason)),
    );
    const failed = results.find((result) => !result.ok);
    return {
      ok: failed === undefined,
      domains,
      durationMs: performance.now() - startedAt,
      coalescedCount: results.reduce(
        (total, result) => total + result.coalescedCount,
        0,
      ),
      ...(failed?.error ? { error: failed.error } : {}),
    };
  }

  /** 現在の保存待ち状態を返す。 */
  getStatus(): SaveCoordinatorStatus {
    return {
      dirtyDomains: [...this.#dirty.keys()],
      ...(this.#lastSuccessfulAt !== undefined
        ? { lastSuccessfulAt: this.#lastSuccessfulAt }
        : {}),
      ...(this.#lastDurationMs !== undefined
        ? { lastDurationMs: this.#lastDurationMs }
        : {}),
      pendingCount: [...this.#dirty.values()].reduce(
        (total, entry) => total + entry.count,
        0,
      ),
    };
  }

  /** タイマーを止め、未保存状態を維持したまま破棄する。 */
  dispose(): void {
    if (this.#timer !== undefined) clearTimeout(this.#timer);
    this.#timer = undefined;
  }
}

function emptyResult(): FlushResult {
  return {
    ok: true,
    domains: [],
    durationMs: 0,
    coalescedCount: 0,
  };
}
