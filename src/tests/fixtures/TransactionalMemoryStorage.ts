/** 書き込み失敗を任意の回数で注入できるStorageテストダブル。 */
export class TransactionalMemoryStorage implements Storage {
  readonly #data = new Map<string, string>();
  #writeCount = 0;
  #failAtWrite?: number;

  /** 初期値と失敗させる書き込み番号を設定する。 */
  constructor(
    initial: Readonly<Record<string, string>> = {},
    failAtWrite?: number,
  ) {
    for (const [key, value] of Object.entries(initial))
      this.#data.set(key, value);
    this.#failAtWrite = failAtWrite;
  }

  get length(): number {
    return this.#data.size;
  }

  clear(): void {
    this.#beforeWrite();
    this.#data.clear();
  }

  getItem(key: string): string | null {
    return this.#data.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.#data.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.#beforeWrite();
    this.#data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.#beforeWrite();
    this.#data.set(key, value);
  }

  /** 以後の指定番号の書き込みだけを失敗させる。 */
  failOnWrite(writeNumber?: number): void {
    this.#writeCount = 0;
    this.#failAtWrite = writeNumber;
  }

  /** 現在の内容を比較用のプレーンオブジェクトで返す。 */
  snapshot(): Readonly<Record<string, string>> {
    return Object.fromEntries(this.#data);
  }

  #beforeWrite(): void {
    this.#writeCount += 1;
    if (this.#writeCount === this.#failAtWrite) {
      throw new Error(`Injected storage failure at write ${this.#writeCount}`);
    }
  }
}
