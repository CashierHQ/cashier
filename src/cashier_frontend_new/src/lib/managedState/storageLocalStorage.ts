import type { Storage } from ".";
import * as devalue from "devalue";

/**
 * A Storage implementation that stores data in the localStorage.
 * Data is stored as devalue
 */
export class LocalStorageStore<T> implements Storage<T> {
  readonly key: string;

  constructor(key: string | string[]) {
    this.key = Array.isArray(key) ? key.join(".") : key;
  }

  getItem(): T | null {
    const item = this.#localStorage()?.getItem(this.key);
    return item ? devalue.parse(item) : null;
  }

  setItem(value: T): void {
    if (value) {
      this.#localStorage()?.setItem(this.key, devalue.stringify(value));
    } else {
      this.removeItem();
    }
  }

  removeItem(): void {
    this.#localStorage()?.removeItem(this.key);
  }

  #localStorage(): globalThis.Storage | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage
    } else {
      console.warn("localStorage not available");
      return null;
    }
  };
}
