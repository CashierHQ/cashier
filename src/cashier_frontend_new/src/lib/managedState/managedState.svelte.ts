import { onDestroy } from "svelte";
import type { Storage } from ".";
import { GlobalStore } from "./storageGlobal";
import { LocalStorageStore } from "./storageLocalStorage";
import { NoOpsStore } from "./storageNoOps";
import { SessionStorageStore } from "./storageSessionStorage";
import { watch as runedWatch } from "runed";
import { assertUnreachable } from "$lib/rsMatch";

// watch([() => age, () => name], ([age, name], [prevAge, prevName]) => {
// 	// ...
// })

export type StateConfig<T> = {
  /**
   * The function to fetch the data.
   */
  queryFn: () => Promise<T>;
  /**
   * The time in milliseconds after data is considered stale.
   * If set to `Infinity`, the data will never be considered stale.
   * If set to a function, the function will be executed with the query to compute a `staleTime`.
   * Defaults to `0`.
   */
  staleTime?: number;
  /**
   * If set, the query will continuously refetch at this frequency in milliseconds.
   */
  refetchInterval?: number;
  /**
   * If provided, the data will be persisted in a storage. The default storage is 'global', which stores the data in the
   * global window object.
   * Defaults to `undefined`
   */
  persistedKey?: string[];

  /**
   * Only valid if `persisted_key` is provided.
   * The type of storage to use for persisting the data.
   * Defaults to `global`.
   *
   * - `global`: storage in the global window object
   * - `localStorage`: storage in the localStorage
   * - `sessionStorage`: storage in the sessionStorage
   *
   */
  storageType?: "global" | "localStorage" | "sessionStorage";

  /**
   * If set to true, the query will run whenever its dependencies change, i.e. $state or $derived values. E.g.:
   *
   * ```ts
   * const count1 = $state(0);
   * const count2 = $state(0);
   * const count3 = $state(0);
   * const store = managedState<number>({
   *   queryFn: () => count1.get() + count2.get() + count3.get(),
   *   watch: true, /// Runs whenever count1, count2, or count3 changes
   * });
   * ```
   *
   * If set to a function, query will run whenever one of the dependencies of the function changes. E.g.:
   *
   * ```ts
   * const count1 = $state(0);
   * const count2 = $state(0);
   * const count3 = $state(0);
   * const store = managedState<number>({
   *   queryFn: () => count1.get() + count2.get() + count3.get(),
   *   watch: () => count1, /// Runs whenever count1 changes
   * });
   * ```
   *
   * If set to an array of functions, query will run whenever one of the dependencies of the functions in the array changes. E.g.:
   *
   * ```ts
   * const count1 = $state(0);
   * const count2 = $state(0);
   * const count3 = $state(0);
   * const store = managedState<number>({
   *   queryFn: () => count1.get() + count2.get() + count3.get(),
   *   watch: [() => count1, () => count2], /// Runs whenever count1 or count2 changes
   * });
   * ```
   *
   * Warning: This can cause the query to run multiple times and can lead to performance issues, infinite loops, or other unexpected behavior.
   * Only use this use with caution.
   *
   * Defaults to `false`.
   */
  watch?: boolean | (() => unknown) | (() => unknown)[];
};

type Data<T> = {
  // The time the data was created in milliseconds
  created_ts: number;
  data: T;
};

// A svelte state that automatically manages fetching data from a queryFn
export class ManagedState<T> {
  #isLoading = $state(false);
  #error = $state();
  #isSuccess = $state(true);
  #data = $state<Data<T> | undefined>();
  #storage: Storage<Data<T>>;
  #config: StateConfig<T>;

  constructor(config: StateConfig<T>) {
    this.#config = config;

    if (config.persistedKey && config.persistedKey.length > 0) {
      switch (config.storageType) {
        case "global":
        case undefined:
          this.#storage = new GlobalStore(config.persistedKey);
          break;
        case "localStorage":
          this.#storage = new LocalStorageStore(config.persistedKey);
          break;
        case "sessionStorage":
          this.#storage = new SessionStorageStore(config.persistedKey);
          break;
      }
    } else {
      this.#storage = new NoOpsStore();
    }

    if (config.watch) {
      this.#watchQuery();
    }

    const initialData = this.#storage.getItem();
    if (initialData !== null) {
      this.#data = initialData;
    } else {
      this.#fetch();
    }

    if (config.refetchInterval) {
      this.refresh(config.refetchInterval);
    }
  }

  /**
   * Gets the current data state.
   * If the data is stale (older than staleTime), it will refetch the data and return undefined.
   * Otherwise, it will return the current data.
   * @returns The current data state, or undefined if the data is stale.
   */
  get data(): T | undefined {
    const data = this.#data;

    if (data === undefined) {
      return undefined;
    }

    // Check if the data is stale
    if (
      this.#config.staleTime &&
      Date.now() - data.created_ts > this.#config.staleTime
    ) {
      this.#storage.removeItem();
      this.#fetch();
      return undefined;
    } else {
      return data.data;
    }
  }

  /**
   * Gets whether the data is currently being refetched.
   * @returns Whether the data is currently being refetched.
   */
  get isLoading(): boolean {
    return this.#isLoading;
  }

  /**
   * Gets the last error that occurred while fetching the data.
   * If no error occurred, it will return undefined.
   * @returns The last error that occurred while fetching the data, or undefined if no error occurred.
   */
  get error(): unknown | undefined {
    return this.#error;
  }

  /**
   * Gets whether the last data fetch was successful.
   * @returns Whether the last data fetch was successful.
   */
  get isSuccess(): boolean {
    return this.#isSuccess;
  }

  /**
   * Sets the data state and update the storage.
   * @param data The data to set.
   */
  #setData(data: Data<T> | undefined): void {
    this.#data = data;
    if (data) {
      this.#storage.setItem(data);
    } else {
      this.#storage.removeItem();
    }
  }

  /**
   * Watches the query for state changes and refetches the data.
   */
  #watchQuery(): void {
    if (typeof this.#config.watch !== "undefined") {
      const watchQuery = this.#config.watch;

      const cleanUp = $effect.root(() => {
        switch (true) {
          case typeof watchQuery === "boolean":
            if (watchQuery) {
              $effect(() => {
                this.refresh();
              });
            }
            break;

          case typeof watchQuery === "function":
            runedWatch(
              [watchQuery],
              ([current], [prev]) => {
                if (current !== prev) {
                  this.refresh();
                }
              },
              {
                lazy: true,
              },
            );
            break;

          case Array.isArray(watchQuery):
            console.log("watchQuery is an array");
            runedWatch(
              watchQuery,
              (current, prev) => {
                console.log("watchQuery is an array", current, prev);
                if (!current.every((value, index) => value === prev[index])) {
                  console.log("refresh");
                  this.refresh();
                }
              },
              {
                lazy: true,
              },
            );
            break;

          default:
            assertUnreachable(watchQuery);
        }
      });

      // Ignore the error. This should fail silently if the state is created outside of a svelte component.
      try {
        onDestroy(() => {
          cleanUp(); // cancel before component unmount
        });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_e) {
        // This is ok, if the state is created outside of a svelte component
        // then the onDestroy will not be called and the interval will not be cleared
      }
    }
  }

  /**
   * Refetches the data.
   * If an interval is provided, it will refetch the data at that interval.
   *
   * If a refetch interval is provided within a svelte component, it will be cleared when the component is destroyed,
   * this is useful to refresh data only when a component is visible.
   *
   * @param {number} [interval] The interval in milliseconds at which to refetch the data.
   */
  refresh(interval?: number): void {
    if (interval) {
      const intervalHandler = setInterval(() => {
        this.#fetch();
      }, interval);

      // Ignore the error. This should fail silently if the state is created outside of a svelte component.
      try {
        onDestroy(() => {
          clearInterval(intervalHandler);
        });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_e) {
        // This is ok, if the state is created outside of a svelte component
        // then the onDestroy will not be called and the interval will not be cleared
      }
    } else {
      this.#fetch();
    }
  }

  /**
   * Resets the data state and storage.
   */
  reset(): void {
    this.#setData(undefined);
  }

  /**
   * Refetches the data.
   */
  #fetch(): void {
    this.#isLoading = true;
    this.#isSuccess = false;
    this.#error = undefined;

    try {
      this.#config
        .queryFn()
        .then((data) => {
          this.#setData({
            created_ts: Date.now(),
            data,
          });
          this.#isLoading = false;
          this.#error = undefined;
          this.#isSuccess = true;
        })
        .catch((error) => {
          this.#isLoading = false;
          this.#error = error;
          this.#isSuccess = false;
        });
    } catch (e) {
      this.#isLoading = false;
      this.#error = e;
      this.#isSuccess = false;
      return;
    }
  }
}

export function managedState<T>(data: StateConfig<T>): ManagedState<T> {
  return new ManagedState(data);
}
