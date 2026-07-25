/** PWA更新とオフライン状態をUIから扱うための状態を表す。 */
export interface PwaLifecycleState {
  readonly installAvailable: boolean;
  readonly offlineReady: boolean;
  readonly updateAvailable: boolean;
  readonly updateDeferred: boolean;
}

/** 保存成功後だけ更新を適用するPWAライフサイクル制御。 */
export class PwaLifecycleController {
  #state: PwaLifecycleState = {
    installAvailable: false,
    offlineReady: false,
    updateAvailable: false,
    updateDeferred: false,
  };
  readonly #saveBeforeReload: () => void | Promise<void>;
  readonly #applyUpdate: () => void | Promise<void>;

  /** 保存処理とService Worker更新処理を注入する。 */
  constructor(
    saveBeforeReload: () => void | Promise<void>,
    applyUpdate: () => void | Promise<void>,
  ) {
    this.#saveBeforeReload = saveBeforeReload;
    this.#applyUpdate = applyUpdate;
  }

  /** 現在のPWA状態を返す。 */
  get state(): PwaLifecycleState {
    return this.#state;
  }

  /** インストール可能状態を記録する。 */
  setInstallAvailable(available: boolean): void {
    this.#state = { ...this.#state, installAvailable: available };
  }

  /** オフラインキャッシュ準備完了を記録する。 */
  setOfflineReady(): void {
    this.#state = { ...this.#state, offlineReady: true };
  }

  /** 更新可能状態を記録する。 */
  setUpdateAvailable(): void {
    this.#state = {
      ...this.#state,
      updateAvailable: true,
      updateDeferred: false,
    };
  }

  /** 更新を次回起動まで延期する。 */
  deferUpdate(): void {
    this.#state = { ...this.#state, updateDeferred: true };
  }

  /** 現在状態を保存できた場合だけ更新を適用する。 */
  async applyUpdate(): Promise<boolean> {
    try {
      await this.#saveBeforeReload();
      await this.#applyUpdate();
      this.#state = {
        ...this.#state,
        updateAvailable: false,
        updateDeferred: false,
      };
      return true;
    } catch {
      return false;
    }
  }
}
