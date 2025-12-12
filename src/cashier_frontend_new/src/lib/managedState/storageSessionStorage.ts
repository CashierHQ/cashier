import type { DevalueSerde, Storage } from ".";
import * as devalue from "devalue";

/**
 * A Storage implementation that stores data in the sessionStorage.
 * Data is stored as devalue
 */
export class SessionStorageStore<T> implements Storage<T> {
  readonly key: string;
  readonly serde?: DevalueSerde;

  constructor(key: string | string[], serde?: DevalueSerde) {
    this.key = Array.isArray(key) ? key.join(".") : key;
    this.serde = serde;
  }

  getItem(): T | null {
    const item = this.#sessionStorage()?.getItem(this.key);
    return item ? devalue.parse(item, this.serde?.deserialize) : null;
  }

  setItem(value: T): void {
    if (value) {
      this.#sessionStorage()?.setItem(
        this.key,
        devalue.stringify(value, this.serde?.serialize),
      );
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
