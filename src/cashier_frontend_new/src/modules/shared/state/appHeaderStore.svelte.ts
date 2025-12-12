type BackHandler = () => Promise<void>;

class AppHeaderStore {
  #backHandler = $state<BackHandler | null>(null);
  #headerName = $state<string | null>(null);

  setBackHandler(handler: BackHandler) {
    this.#backHandler = handler;
  }

  getBackHandler() {
    return this.#backHandler;
  }

  clearBackHandler() {
    this.#backHandler = null;
  }

  setHeaderName(name: string | null) {
    this.#headerName = name;
  }

  getHeaderName() {
    return this.#headerName;
  }

  clearHeaderName() {
    this.#headerName = null;
  }

  async triggerBack() {
    if (this.#backHandler) {
      await this.#backHandler();
    }
  }
}

export const appHeaderStore = new AppHeaderStore();
