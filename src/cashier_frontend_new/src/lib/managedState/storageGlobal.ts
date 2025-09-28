import type { Storage } from ".";

const storage: Record<string, any> = {};

/**
 * A Storage implementation that stores data in the global window object
 */
export class GlobalStore<T> implements Storage<T> {

    readonly key: string;

    constructor(key: string | string[]) {
        this.key = Array.isArray(key) ? key.join(".") : key;
    }

    getItem(): T | null {
        let value = storage[this.key];
        return value === undefined ? null : value;
    }

    setItem(value: T): void {
        storage[this.key] = value;
    }

    removeItem(): void {
        delete storage[this.key];
    }
}