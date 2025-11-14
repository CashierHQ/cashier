type BackHandler = () => Promise<void>;

class AppHeaderStore {
  #backHandler = $state<BackHandler | null>(null);

  setBackHandler(handler: BackHandler) {
    this.#backHandler = handler;
  }

  getBackHandler() {
    return this.#backHandler;
  }

  clearBackHandler() {
    this.#backHandler = null;
  }

  async triggerBack() {
    if (this.#backHandler) {
      await this.#backHandler();
    }
  }
}

export const appHeaderStore = new AppHeaderStore();
