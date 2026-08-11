type TimeoutCB = () => unknown;

export type SessionManagerOptions = {
  /**
   * Callback after the timeout
   */
  onTimeout?: TimeoutCB;
  /**
   * timeout in ms
   */
  timeout: number;
};

/**
 * Detects if the `timeout` ms is over, and calls `onTimeout` and registered callbacks.
 * To override these defaults, you can pass an `onTimeout` callback, or configure a custom `timeout` in milliseconds
 */
export class SessionManager {
  callbacks: TimeoutCB[] = [];
  timeout?: SessionManagerOptions["timeout"];
  timeoutID?: number = undefined;
  private readonly resetTimer: () => void;
  private exited = false;

  /**
   * @param options {@link IdleManagerOptions}
   */
  constructor(options: SessionManagerOptions) {
    const { onTimeout, timeout } = options || {};

    this.callbacks = onTimeout ? [onTimeout] : [];
    this.timeout = timeout;

    this.resetTimer = this._resetTimer.bind(this);

    window.addEventListener("load", this.resetTimer, true);

    this.resetTimer();
  }

  /**
   * @param {TimeoutCB} callback function to be called on timeout
   */
  public registerCallback(callback: TimeoutCB): void {
    this.callbacks.push(callback);
  }

  /**
   * Cleans up the timeout manager and its listeners
   */
  public exit(): void {
    if (this.exited) return;

    this.exited = true;
    window.clearTimeout(this.timeoutID);
    this.timeoutID = undefined;
    window.removeEventListener("load", this.resetTimer, true);
  }

  /**
   * Resets the timeouts during cleanup
   */
  _resetTimer(): void {
    if (this.exited) return;

    window.clearTimeout(this.timeoutID);
    this.timeoutID = window.setTimeout(() => {
      this.callbacks.forEach((cb) => cb());
    }, this.timeout);
  }
}
