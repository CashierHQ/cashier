import { browser } from '$app/environment';

// DEMO: A simple state wrapper that automatically syncs with local storage
export class LocalStorageState<T> {
  #value;
  #derived;
  #key = '';

  constructor(key: string, value: T) {
    this.#key = key;
    this.#value = $state(value);

    this.#derived = $derived(this.#value);

    if (browser) {
      
      const item = localStorage.getItem(key);
      try {
        if (item) this.#value = this.#deserialize(item);
      } catch (e) {
        console.warn("Error parsing state from local storage:", e);
      }

      $effect.root(() => {
        $effect(() => {
          localStorage.setItem(this.#key, this.#serialize(this.#derived));
        })
      });

    }

  }

  get value(): T {
    return this.#value;
  }

  set value(value: T) {
    this.#value = value;
  }

  #serialize(value: T): string {
    return JSON.stringify(value);
  }

  #deserialize(item: string): T {
    return JSON.parse(item);
  }
}

export function localStorageState<T>(key: string, value: T) {
  return new LocalStorageState(key, value);
}