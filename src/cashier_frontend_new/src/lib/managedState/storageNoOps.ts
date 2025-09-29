import type { Storage } from ".";

/**
 * A Storage implementation that does nothing
 */
export class NoOpsStore<T> implements Storage<T> {
  getItem(): T | null {
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setItem(value: T): void {}
  removeItem(): void {}
}
