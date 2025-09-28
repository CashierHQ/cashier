export * from "./storageGlobal";
export * from "./storageLocalStorage";

// A simple storage interface for a single value
export interface Storage<T> {
    getItem(): T | null;
    setItem(value: T): void;
    removeItem(): void;
}

