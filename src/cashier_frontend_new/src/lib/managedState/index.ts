export { managedState } from "./managedState.svelte";

// A simple storage interface for a single value
export interface Storage<T> {
    getItem(): T | null;
    setItem(value: T): void;
    removeItem(): void;
}

