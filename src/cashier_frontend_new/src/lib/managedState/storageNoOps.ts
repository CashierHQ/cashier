import type { Storage } from ".";

/**
 * A Storage implementation that does nothing
 */
export class NoOpsStore<T> implements Storage<T> {
  getItem(): T | null {
    return null;
  }
  setItem(value: T): void {}
  removeItem(): void {}
}
