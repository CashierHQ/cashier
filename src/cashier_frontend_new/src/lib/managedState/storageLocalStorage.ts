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
        const item = localStorage.getItem(this.key);
        return item ? devalue.parse(item) : null;
    }

    setItem(value: T): void {
        localStorage.setItem(this.key, devalue.stringify(value));
    }
    
    removeItem(): void {
        localStorage.removeItem(this.key);
    }
}