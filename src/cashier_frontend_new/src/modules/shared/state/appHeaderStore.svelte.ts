type BackHandler = () => Promise<void>;
type LogoClickHandler = () => Promise<void>;

class AppHeaderStore {
  #backHandler = $state<BackHandler | null>(null);
  #headerName = $state<string | null>(null);
  #logoClickHandler = $state<LogoClickHandler | null>(null);

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

  setLogoClickHandler(handler: LogoClickHandler) {
    this.#logoClickHandler = handler;
  }

  clearLogoClickHandler() {
    this.#logoClickHandler = null;
  }

  async triggerLogoClick() {
    if (this.#logoClickHandler) {
      await this.#logoClickHandler();
    }
  }

  hasLogoClickHandler() {
    return this.#logoClickHandler !== null;
  }
}

export const appHeaderStore = new AppHeaderStore();
