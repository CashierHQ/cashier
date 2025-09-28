import { onDestroy } from "svelte";
import type { Storage } from ".";
import { GlobalStore } from "./storageGlobal";
import { LocalStorageStore } from "./storageLocalStorage";
import { NoOpsStore } from "./storageNoOps";

export type StateConfig<T> = {
    queryFn: () => Promise<T>,
    /**
     * The time in milliseconds after data is considered stale.
     * If set to `Infinity`, the data will never be considered stale.
     * If set to a function, the function will be executed with the query to compute a `staleTime`.
     * Defaults to `0`.
     */
    staleTime?: number,
    /**
     * If set, the query will continuously refetch at this frequency in milliseconds.
     */
    refetchInterval?: number,
    /**
     * If provided, the data will be persisted in a storage. The default storage is 'global', which stores the data in the 
     * global window object.
     * Defaults to `undefined`
     */
    persistedKey?: string[]

    /**
     * Only valid if `persisted_key` is provided. 
     * The type of storage to use for persisting the data.
     * Defaults to `global`.
     * 
     * - `global`: storage in the global window object
     * - `localStorage`: storage in the localStorage
     * 
     */
    storageType?: 'global' | 'localStorage',
}

type Data<T> = {
    // The time the data was created in milliseconds
    created_ts: number,
    data: T
}

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
            };
        } else {
            this.#storage = new NoOpsStore();
        }

        let initialData = this.#storage.getItem();
        if (initialData !== null) {
            this.#data = initialData;
        } else {
            this.#fetch();
        }

        // console.log("data state created: ", this.#data.type);

        if (config.refetchInterval) {
            const interval = setInterval(() => {
                // console.log("refetching data...");
                this.#fetch();
            }, config.refetchInterval);

            try {
                onDestroy(() => {
                    // console.log("clearing interval");
                    clearInterval(interval)
                })
            } catch (_e) {
                // This is ok, if the state is created on a global object
                // then the onDestroy will not be called
            }

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

        if (this.#config.staleTime && (Date.now() - data.created_ts > this.#config.staleTime)) {
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
    get error(): any | undefined {
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
    #setData(data: Data<T> | undefined) {
        this.#data = data;
        if (data) {
            this.#storage.setItem(data);
        } else {
            this.#storage.removeItem();
        }
    }

    /**
     * Refetches the data.
     */
    #fetch() {
        // console.log("fetching data...");
        this.#isLoading = true;
        this.#isSuccess = false;
        this.#error = undefined;

        try {
            this.#config.queryFn()
                .then((data) => {
                    // console.log("fetched data: ");
                    this.#setData({
                        created_ts: Date.now(),
                        data
                    });
                    this.#isLoading = false;
                    this.#error = undefined;
                    this.#isSuccess = true;
                })
                .catch((error) => {
                    // console.log("error fetching data: ");
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

export function managedState<T>(data: StateConfig<T>) {
    return new ManagedState(data);
}
