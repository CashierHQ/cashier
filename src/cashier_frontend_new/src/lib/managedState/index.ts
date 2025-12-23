export { managedState } from "./managedState.svelte";


// A simple storage interface for a single value
export interface Storage<T> {
  getItem(): T | null;
  setItem(value: T): void;
  removeItem(): void;
}

// A serializer/deserializer type
export type DevalueSerde = {
  /**
   * The serialization for devalue
   */
  serialize: Record<string, (value: unknown) => unknown>;
  /**
   * The deserialization for devalue
   */
  deserialize: Record<string, (data: unknown) => unknown>;
};
