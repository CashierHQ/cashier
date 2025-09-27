/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, test, vi } from "vitest";
import { dataState } from "./dataStore.svelte";
import * as devalue from "devalue";


beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.clearAllTimers();
})


describe("In memory state", () => {

  it('should fetch data from queryFn', async () => {
    vi.useFakeTimers();

    const store = dataState<number>({
      queryFn: () => Promise.resolve(426),
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(store.isLoading).toEqual(false);
    expect(store.error).toEqual(undefined);
    expect(store.isSuccess).toEqual(true);
    expect(store.data).toEqual(426);
  })

  it('data should expire if stale', async () => {
    vi.useFakeTimers();

    let count = 10;
    const store = dataState<number>({
      queryFn: () => new Promise((resolve) => {
        resolve(count)
        count += 5;
      }),
      staleTime: 100,
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(store.isLoading).toEqual(false);
    expect(store.error).toEqual(undefined);
    expect(store.isSuccess).toEqual(true);
    expect(store.data).toEqual(10);

    await vi.advanceTimersByTimeAsync(91);
    expect(store.data).toEqual(undefined);

    // Await for the refetch to finish
    await vi.advanceTimersByTimeAsync(10);
    expect(store.data).toEqual(15);
  })

  it('should refetch data at intervals', async () => {
    vi.useFakeTimers();

    let count = 10;
    const store = dataState<number>({
      queryFn: () => new Promise((resolve) => {
        resolve(count)
        count += 5;
      }),
      refetchInterval: 1000,
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(store.data).toEqual(10);

    await vi.advanceTimersByTimeAsync(1001);
    expect(store.data).toEqual(15);

    await vi.advanceTimersByTimeAsync(1001);
    expect(store.data).toEqual(20);

  })

  it('isLoading should be true while fetching', async () => {
    vi.useFakeTimers();

    const store = dataState<number>({
      queryFn: () => neverResolvingPromise(),
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(store.isLoading).toEqual(true);
    expect(store.error).toEqual(undefined);
    expect(store.isSuccess).toEqual(false);
    expect(store.data).toEqual(undefined);
  })

  it('should handle errors', async () => {
    vi.useFakeTimers();

    const store = dataState<number>({
      queryFn: () => Promise.reject("error from promise"),
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(store.isLoading).toEqual(false);
    expect(store.error).toEqual("error from promise");
    expect(store.isSuccess).toEqual(false);
    expect(store.data).toEqual(undefined);
  })

  it('should catch thrown errors', async () => {
    vi.useFakeTimers();

    const store = dataState<number>({
      queryFn: () => {
        throw new Error("error from promise");
      },
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(store.isLoading).toEqual(false);
    expect(store.error).toEqual(new Error("error from promise"));
    expect(store.isSuccess).toEqual(false);
    expect(store.data).toEqual(undefined);
  })

});

describe("Persisted state", () => {

  it('should fetch data from queryFn', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1123);

    const store = dataState<number>({
      queryFn: () => Promise.resolve(426),
      persistedKey: ["test_key_1"],
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(store.isLoading).toEqual(false);
    expect(store.error).toEqual(undefined);
    expect(store.isSuccess).toEqual(true);
    expect(store.data).toEqual(426);

    expect(localStorage.getItem("test_key_1")).toEqual(devalue.stringify({
      created_ts: 1123,
      data: 426
    }));
  })

  it('should fetch existing data from localStorage', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(2000);

    const store = dataState<number>({
      queryFn: () => Promise.resolve(42),
      persistedKey: ["test_key_4"],
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(store.data).toEqual(42);

    expect(localStorage.getItem("test_key_4")).toEqual(devalue.stringify({
      created_ts: 2000,
      data: 42
    }));

    const store2 = dataState<number>({
      queryFn: () => Promise.resolve(45),
      persistedKey: ["test_key_4"],
      staleTime: 100
    });

    await vi.advanceTimersByTimeAsync(10);
    // The data should be read from localStorage
    expect(store2.data).toEqual(42);

    // Let's the data expire
    await vi.advanceTimersByTimeAsync(90);
    expect(store2.data).toEqual(undefined);

    // Await for the refetch to finish
    await vi.advanceTimersByTimeAsync(10);
    expect(store2.data).toEqual(45);

    expect(localStorage.getItem("test_key_4")).toEqual(devalue.stringify({
      created_ts: 2110,
      data: 45
    }));
  })

  it('data should expire if stale', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(2123);

    let count = 10;
    const store = dataState<number>({
      queryFn: () => new Promise((resolve) => {
        resolve(count)
        count += 5;
      }),
      staleTime: 100,
      persistedKey: ["test_key_2"],
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(store.isLoading).toEqual(false);
    expect(store.error).toEqual(undefined);
    expect(store.isSuccess).toEqual(true);
    expect(store.data).toEqual(10);

    expect(localStorage.getItem("test_key_2")).toEqual(devalue.stringify({
      created_ts: 2123,
      data: 10
    }));

    await vi.advanceTimersByTimeAsync(91);
    expect(store.data).toEqual(undefined);

    // Await for the refetch to finish
    await vi.advanceTimersByTimeAsync(10);
    expect(store.data).toEqual(15);

    expect(localStorage.getItem("test_key_2")).toEqual(devalue.stringify({
      created_ts: 2224,
      data: 15
    }));
  })

  it('should refetch data at intervals', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);

    let count = 10;
    const store = dataState<number>({
      queryFn: () => new Promise((resolve) => {
        resolve(count)
        count += 5;
      }),
      refetchInterval: 1000,
      persistedKey: ["test_key_3"],
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(store.data).toEqual(10);

    expect(localStorage.getItem("test_key_3")).toEqual(devalue.stringify({
      created_ts: 1000,
      data: 10
    }));

    await vi.advanceTimersByTimeAsync(1001);
    expect(store.data).toEqual(15);

    expect(localStorage.getItem("test_key_3")).toEqual(devalue.stringify({
      created_ts: 2000,
      data: 15
    }));

    await vi.advanceTimersByTimeAsync(1001);
    expect(store.data).toEqual(20);

    expect(localStorage.getItem("test_key_3")).toEqual(devalue.stringify({
      created_ts: 3000,
      data: 20
    }));

  })

});

function neverResolvingPromise<T = never>(): Promise<T> {
  return new Promise<T>(() => { });
}