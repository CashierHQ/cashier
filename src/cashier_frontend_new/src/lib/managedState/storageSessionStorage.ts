import type { Storage } from ".";
import * as devalue from "devalue";

/**
 * A Storage implementation that stores data in the sessionStorage.
 * Data is stored as devalue
 */
export class SessionStorageStore<T> implements Storage<T> {
  readonly key: string;

  constructor(key: string | string[]) {
    this.key = Array.isArray(key) ? key.join(".") : key;
  }

  getItem(): T | null {
    const item = this.#sessionStorage()?.getItem(this.key);
    return item ? devalue.parse(item) : null;
  }

  setItem(value: T): void {
    if (value) {
      this.#sessionStorage()?.setItem(this.key, devalue.stringify(value));
    } else {
      this.removeItem();
    }
  }

  removeItem(): void {
    this.#sessionStorage()?.removeItem(this.key);
  }

  #sessionStorage(): globalThis.Storage | null {
    if (typeof sessionStorage !== "undefined") {
      return sessionStorage;
    } else {
      console.warn("sessionStorage not available");
      return null;
    }
  }
}
