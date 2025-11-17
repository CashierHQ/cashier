import type { DevalueSerde, Storage } from ".";
import * as devalue from "devalue";

/**
 * A Storage implementation that stores data in the localStorage.
 * Data is stored as devalue
 */
export class LocalStorageStore<T> implements Storage<T> {
  readonly key: string;
  readonly serde?: DevalueSerde;

  constructor(key: string | string[], serde?: DevalueSerde) {
    this.key = Array.isArray(key) ? key.join(".") : key;
    this.serde = serde;
  }

  getItem(): T | null {
    const item = this.#localStorage()?.getItem(this.key);
    return item ? devalue.parse(item, this.serde?.deserialize) : null;
  }

  setItem(value: T): void {
    if (value) {
      try {
        this.#localStorage()?.setItem(
          this.key,
          devalue.stringify(value, this.serde?.serialize),
        );
      } catch (e) {
        console.error("Error setting item in LocalStorageStore", e);
      }
    } else {
      this.removeItem();
    }
  }

  removeItem(): void {
    this.#localStorage()?.removeItem(this.key);
  }

  #localStorage(): globalThis.Storage | null {
    if (typeof localStorage !== "undefined") {
      return localStorage;
    } else {
      console.warn("localStorage not available");
      return null;
    }
  }
}
