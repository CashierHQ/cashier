import { onDestroy } from "svelte";
import { persisted, type Persisted } from "svelte-persisted-store";
import { get } from 'svelte/store'
import * as devalue from "devalue";

export type DataStateConfig<T> = {
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
     * If provided, the data will be persisted in the browser's local storage.
     * If undefined or empty, the data will not be persisted.
     * Defaults to `undefined`
     */
    persistedKey?: string[]

    /**
     * Only valid if `persisted_key` is provided. 
     * The type of storage to use for persisting the data.
     * Defaults to 'local'.
     * 
     * 'session' for sessionStorage
     * 'local' for localStorage
     * 
     */
    storageType?: 'session' | 'local',
}

type Data<T> = {
    // The time the data was created in milliseconds
    created_ts: number,
    data: T
}

type DataStorage<T> = {
    type: "state",
    data: Data<T> | undefined
} | {
    type: "persisted",
    data: Persisted<Data<T> | undefined>
}

export class DataState<T> {
    #isLoading = $state(false);
    #error = $state();
    #isSuccess = $state(true);
    #data: DataStorage<T>;
    #config: DataStateConfig<T>;

    constructor(config: DataStateConfig<T>) {
        this.#config = config;

        if (config.persistedKey && config.persistedKey.length > 0) {
            let persist: Persisted<Data<T> | undefined> = persisted(config.persistedKey.join("."), undefined, {
                serializer: devalue, // defaults to `JSON`
                storage: config.storageType || 'local',
                // syncTabs: true, // choose whether to sync localStorage across tabs, default is true
                // onWriteError: (error) => {/* handle or rethrow */}, // Defaults to console.error with the error object
                // onParseError: (raw, error) => {/* handle or rethrow */}, // Defaults to console.error with the error object
                // beforeRead: (value) => {/* change value after serialization but before setting store to return value*/},
                // beforeWrite: (value) => {/* change value after writing to store, but before writing return value to local storage*/},
            });
            this.#data = {
                type: "persisted",
                data: persist,
            }
        } else {
            let data = $state<Data<T> | undefined>();
            this.#data = {
                type: "state",
                data
            }
        }

        if (this.data === undefined) {
            this.#fetch();
        }

        console.log("data state created: ", this.#data.type);

        if (config.refetchInterval) {
            const interval = setInterval(() => {
                console.log("refetching data...");
                this.#fetch();
            }, config.refetchInterval);

            try {
                onDestroy(() => {
                    console.log("clearing interval");
                    clearInterval(interval)
                })
            } catch (_e) {
                // This is ok, if the state is created on a global object
                // then the onDestroy will not be called
            }

        }
    }

    get data(): T | undefined {
        const data = this.#data;
        if (data === undefined) {
            return undefined;
        }
        
        let fetchedData;

        if (data.type === "state") {
            fetchedData = data.data;
        } else if (data.type === "persisted" && data.data !== undefined) {
            fetchedData = get(data.data);
        }

        if (fetchedData === undefined) {
            return undefined;
        }

        if (this.#config.staleTime && (Date.now() - fetchedData.created_ts > this.#config.staleTime)) {
            this.#fetch();
            return undefined;
        } else {
            return fetchedData.data;
        }

    }



    get isPending(): boolean {
        return this.#isLoading;
    }

    get error(): any | undefined {
        return this.#error;
    }

    get isSuccess(): boolean {
        return this.#isSuccess;
    }

    #setData(data: Data<T> | undefined) {
        if (this.#data.type === "state") {
            this.#data.data = data;
        } else if (this.#data.type === "persisted") {
            this.#data.data.set(data);
        }
    }

    #fetch() {
        this.#isLoading = true;
        this.#isSuccess = false;
        this.#error = undefined;

        this.#config.queryFn()
            .then((data) => {
                this.#setData({
                    created_ts: Date.now(),
                    data
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
    }

}

export function dataState<T>(data: DataStateConfig<T>) {
    return new DataState(data);
}
