/** 描画オブジェクト数のスナップショット。 */
export interface ObjectCountSnapshot {
  readonly gameObjects: number;
  readonly texts: number;
  readonly activeChunks: number;
}

/** フォント読み込み状態。 */
export interface FontStatusSnapshot {
  readonly loaded: boolean;
  readonly family: string;
}

/** 計測結果。 */
export interface PerformanceSnapshot {
  readonly averageFps: number;
  readonly frameDeltaP95Ms: number;
  readonly inputToPresentP95Ms: number;
  readonly stallsOver100Ms: number;
  readonly sampleCount: number;
  readonly objectCounts: ObjectCountSnapshot;
}

/** RAFと入力応答を軽量に記録する性能モニター。 */
export class PerformanceMonitor {
  /** 記録済みのフレーム間隔。 */
  readonly #frameDeltas: number[] = [];
  /** 未完了入力の受付時刻。 */
  readonly #inputStartedAt = new Map<string, number>();
  /** 表示まで完了した入力遅延。 */
  readonly #inputLatencies: number[] = [];
  /** 最新の表示オブジェクト数。 */
  #objectCounts: ObjectCountSnapshot = {
    gameObjects: 0,
    texts: 0,
    activeChunks: 0,
  };
  /** 計測開始時刻。 */
  #startedAt = 0;
  /** 直前のRAF時刻。 */
  #lastFrameAt?: number;

  /** 計測値を消去する。 */
  reset(): void {
    this.#frameDeltas.length = 0;
    this.#inputLatencies.length = 0;
    this.#inputStartedAt.clear();
    this.#startedAt = 0;
    this.#lastFrameAt = undefined;
  }

  /** 計測を開始する。 */
  start(now = performance.now()): void {
    this.reset();
    this.#startedAt = now;
    this.#lastFrameAt = now;
  }

  /** RAF時刻を記録する。 */
  recordFrame(now = performance.now()): void {
    if (this.#lastFrameAt !== undefined) {
      this.#frameDeltas.push(Math.max(0, now - this.#lastFrameAt));
    }
    this.#lastFrameAt = now;
  }

  /** 入力受付時刻を記録する。 */
  recordInput(receiptId: string, now = performance.now()): void {
    this.#inputStartedAt.set(receiptId, now);
  }

  /** 対応表示が完了した入力の遅延を記録する。 */
  recordPresented(receiptId: string, now = performance.now()): void {
    const startedAt = this.#inputStartedAt.get(receiptId);
    if (startedAt === undefined) return;
    this.#inputLatencies.push(Math.max(0, now - startedAt));
    this.#inputStartedAt.delete(receiptId);
  }

  /** 現在の表示オブジェクト数を更新する。 */
  setObjectCounts(counts: ObjectCountSnapshot): void {
    this.#objectCounts = counts;
  }

  /** 現在までの計測結果を返す。 */
  stop(now = performance.now()): PerformanceSnapshot {
    const elapsedMs = Math.max(1, now - this.#startedAt);
    return {
      averageFps: (this.#frameDeltas.length * 1_000) / elapsedMs,
      frameDeltaP95Ms: percentile(this.#frameDeltas, 0.95),
      inputToPresentP95Ms: percentile(this.#inputLatencies, 0.95),
      stallsOver100Ms: this.#frameDeltas.filter((delta) => delta > 100).length,
      sampleCount: this.#frameDeltas.length,
      objectCounts: this.#objectCounts,
    };
  }
}

function percentile(values: readonly number[], ratio: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * ratio) - 1),
  );
  return sorted[index] ?? 0;
}
