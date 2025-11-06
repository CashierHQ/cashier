/**
 * @vitest-environment jsdom
 */

import * as devalue from "devalue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { managedState } from "./managedState.svelte";
import { TestValue, Option, testValueDevalueSerde } from "./utils";
import { Ed25519KeyIdentity } from "@dfinity/identity";

describe("ManagedState - Global storage", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  it("should fetch data from queryFn", async () => {
    vi.useFakeTimers();

    const store = managedState<number>({
      queryFn: () => Promise.resolve(426),
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(store.isLoading).toEqual(false);
    expect(store.error).toEqual(undefined);
    expect(store.isSuccess).toEqual(true);
    expect(store.data).toEqual(426);
  });

  it("data should expire if stale", async () => {
    vi.useFakeTimers();

    let count = 10;
    const store = managedState<number>({
      queryFn: () =>
        new Promise((resolve) => {
          resolve(count);
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
  });

  it("should refetch data at intervals", async () => {
    vi.useFakeTimers();

    let count = 10;
    const store = managedState<number>({
      queryFn: () =>
        new Promise((resolve) => {
          resolve(count);
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
  });

  it("isLoading should be true while fetching", async () => {
    vi.useFakeTimers();

    const store = managedState<number>({
      queryFn: () => neverResolvingPromise(),
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(store.isLoading).toEqual(true);
    expect(store.error).toEqual(undefined);
    expect(store.isSuccess).toEqual(false);
    expect(store.data).toEqual(undefined);
  });

  it("should handle errors", async () => {
    vi.useFakeTimers();

    const store = managedState<number>({
      queryFn: () => Promise.reject("error from promise"),
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(store.isLoading).toEqual(false);
    expect(store.error).toEqual("error from promise");
    expect(store.isSuccess).toEqual(false);
    expect(store.data).toEqual(undefined);
  });

  it("should catch thrown errors", async () => {
    vi.useFakeTimers();

    const store = managedState<number>({
      queryFn: () => {
        throw new Error("error from promise");
      },
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(store.isLoading).toEqual(false);
    expect(store.error).toEqual(new Error("error from promise"));
    expect(store.isSuccess).toEqual(false);
    expect(store.data).toEqual(undefined);
  });

  it("should reset the data correctly", async () => {
    vi.useFakeTimers();

    const store = managedState<number>({
      queryFn: () => Promise.resolve(426),
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(store.isLoading).toEqual(false);
    expect(store.error).toEqual(undefined);
    expect(store.isSuccess).toEqual(true);
    expect(store.data).toEqual(426);

    store.reset();
    expect(store.data).toEqual(undefined);
  });

  it("should watch the query for any state change", async () => {
    vi.useFakeTimers();

    let count1 = $state(1);
    let count2 = $state(10);
    let count3 = $state(100);
    const store = managedState<number>({
      queryFn: () => Promise.resolve(count1 + count2 + count3),
      watch: true,
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(store.data).toEqual(111);

    count1 = 2;
    await vi.advanceTimersByTimeAsync(10);
    expect(store.data).toEqual(112);

    count2 = 20;
    await vi.advanceTimersByTimeAsync(10);
    expect(store.data).toEqual(122);

    count3 = 200;
    await vi.advanceTimersByTimeAsync(10);
    expect(store.data).toEqual(222);
  });

  it("should watch the query for a single state change", async () => {
    vi.useFakeTimers();

    let count1 = $state(1);
    let count2 = $state(10);
    let count3 = $state(100);
    const store = managedState<number>({
      queryFn: () => Promise.resolve(count1 + count2 + count3),
      watch: () => count2,
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(store.data).toEqual(111);

    count1 = 2;
    await vi.advanceTimersByTimeAsync(10);
    expect(store.data).toEqual(111);

    count2 = 20;
    await vi.advanceTimersByTimeAsync(10);
    expect(store.data).toEqual(122);

    count3 = 200;
    await vi.advanceTimersByTimeAsync(10);
    expect(store.data).toEqual(122);
  });

  it("should watch the query for changes to an array of functions that return states", async () => {
    vi.useFakeTimers();

    let count1 = $state(1);
    let count2 = $state(10);
    let count3 = $state(100);
    const store = managedState<number>({
      queryFn: () => Promise.resolve(count1 + count2 + count3),
      watch: [() => count1, () => count3],
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(store.data).toEqual(111);

    count1 = 2;
    await vi.advanceTimersByTimeAsync(10);
    expect(store.data).toEqual(112);

    count2 = 20;
    await vi.advanceTimersByTimeAsync(10);
    expect(store.data).toEqual(112);

    count3 = 200;
    await vi.advanceTimersByTimeAsync(10);
    expect(store.data).toEqual(222);
  });
});

describe("ManagedState - LocalStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  it("should fetch data from queryFn", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1123);

    const store = managedState<number>({
      queryFn: () => Promise.resolve(426),
      persistedKey: ["test_key_1"],
      storageType: "localStorage",
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(store.isLoading).toEqual(false);
    expect(store.error).toEqual(undefined);
    expect(store.isSuccess).toEqual(true);
    expect(store.data).toEqual(426);

    expect(localStorage.getItem("test_key_1")).toEqual(
      devalue.stringify({
        created_ts: 1123,
        data: 426,
      }),
    );
  });

  it("should fetch existing data from localStorage", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(2000);

    const store = managedState<number>({
      queryFn: () => Promise.resolve(42),
      persistedKey: ["test_key_4"],
      storageType: "localStorage",
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(store.data).toEqual(42);

    expect(localStorage.getItem("test_key_4")).toEqual(
      devalue.stringify({
        created_ts: 2000,
        data: 42,
      }),
    );

    const store2 = managedState<number>({
      queryFn: () => Promise.resolve(45),
      persistedKey: ["test_key_4"],
      storageType: "localStorage",
      staleTime: 100,
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

    expect(localStorage.getItem("test_key_4")).toEqual(
      devalue.stringify({
        created_ts: 2110,
        data: 45,
      }),
    );
  });

  it("should persist and restore custom values with serde", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(5000);
    const item = new TestValue({
      name: "Alice",
      age: 30,
      principal: Ed25519KeyIdentity.generate().getPrincipal(),
      testers: [Ed25519KeyIdentity.generate().getPrincipal()],
      option: Option.OPTION_A,
    });

    const store = managedState<TestValue>({
      queryFn: () => Promise.resolve(item),
      persistedKey: ["test_key_serde"],
      storageType: "localStorage",
      serde: testValueDevalueSerde,
    });

    await vi.advanceTimersByTimeAsync(10);

    // Data should be available and equal (deep equality)
    expect(store.data).toEqual(item);

    // Stored value should be serialized using our serializer mapping
    expect(localStorage.getItem("test_key_serde")).toEqual(
      devalue.stringify(
        { created_ts: 5000, data: item },
        testValueDevalueSerde.serialize,
      ),
    );

    // Create a new managedState reading the same key; it should deserialize
    // the stored value into a TestValue instance via our deserializer.
    const store2 = managedState<TestValue>({
      queryFn: () =>
        Promise.resolve(
          new TestValue({
            name: "ignored",
            age: 0,
            principal: Ed25519KeyIdentity.generate().getPrincipal(),
            testers: [],
            option: Option.OPTION_A,
          }),
        ),
      persistedKey: ["test_key_serde"],
      storageType: "localStorage",
      serde: testValueDevalueSerde,
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(store2.data).toEqual(item);
  });

  it("data should expire if stale", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(2123);

    let count = 10;
    const store = managedState<number>({
      queryFn: () =>
        new Promise((resolve) => {
          resolve(count);
          count += 5;
        }),
      staleTime: 100,
      persistedKey: ["test_key_2"],
      storageType: "localStorage",
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(store.isLoading).toEqual(false);
    expect(store.error).toEqual(undefined);
    expect(store.isSuccess).toEqual(true);
    expect(store.data).toEqual(10);

    expect(localStorage.getItem("test_key_2")).toEqual(
      devalue.stringify({
        created_ts: 2123,
        data: 10,
      }),
    );

    await vi.advanceTimersByTimeAsync(91);
    expect(store.data).toEqual(undefined);

    // Await for the refetch to finish
    await vi.advanceTimersByTimeAsync(10);
    expect(store.data).toEqual(15);

    expect(localStorage.getItem("test_key_2")).toEqual(
      devalue.stringify({
        created_ts: 2224,
        data: 15,
      }),
    );
  });

  it("should refetch data at intervals", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);

    let count = 10;
    const store = managedState<number>({
      queryFn: () =>
        new Promise((resolve) => {
          resolve(count);
          count += 5;
        }),
      refetchInterval: 1000,
      persistedKey: ["test_key_3"],
      storageType: "localStorage",
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(store.data).toEqual(10);

    expect(localStorage.getItem("test_key_3")).toEqual(
      devalue.stringify({
        created_ts: 1000,
        data: 10,
      }),
    );

    await vi.advanceTimersByTimeAsync(1001);
    expect(store.data).toEqual(15);

    expect(localStorage.getItem("test_key_3")).toEqual(
      devalue.stringify({
        created_ts: 2000,
        data: 15,
      }),
    );

    await vi.advanceTimersByTimeAsync(1001);
    expect(store.data).toEqual(20);

    expect(localStorage.getItem("test_key_3")).toEqual(
      devalue.stringify({
        created_ts: 3000,
        data: 20,
      }),
    );
  });

  it("should reset the data correctly", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);

    const store = managedState<number>({
      queryFn: () => Promise.resolve(42),
      persistedKey: ["test_key_5"],
      storageType: "localStorage",
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(store.isLoading).toEqual(false);
    expect(store.error).toEqual(undefined);
    expect(store.isSuccess).toEqual(true);
    expect(store.data).toEqual(42);

    expect(localStorage.getItem("test_key_5")).toEqual(
      devalue.stringify({
        created_ts: 1000,
        data: 42,
      }),
    );

    store.reset();
    expect(store.data).toEqual(undefined);
    expect(localStorage.getItem("test_key_5")).toEqual(null);
  });
});

describe("ManagedState - SessionStorage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  it("should fetch data from queryFn", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1123);

    const store = managedState<number>({
      queryFn: () => Promise.resolve(426),
      persistedKey: ["test_key_1"],
      storageType: "sessionStorage",
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(store.isLoading).toEqual(false);
    expect(store.error).toEqual(undefined);
    expect(store.isSuccess).toEqual(true);
    expect(store.data).toEqual(426);

    expect(sessionStorage.getItem("test_key_1")).toEqual(
      devalue.stringify({
        created_ts: 1123,
        data: 426,
      }),
    );
  });

  it("should fetch existing data from sessionStorage", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(2000);

    const store = managedState<number>({
      queryFn: () => Promise.resolve(42),
      persistedKey: ["test_key_4"],
      storageType: "sessionStorage",
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(store.data).toEqual(42);

    expect(sessionStorage.getItem("test_key_4")).toEqual(
      devalue.stringify({
        created_ts: 2000,
        data: 42,
      }),
    );

    const store2 = managedState<number>({
      queryFn: () => Promise.resolve(45),
      persistedKey: ["test_key_4"],
      storageType: "sessionStorage",
      staleTime: 100,
    });

    await vi.advanceTimersByTimeAsync(10);
    // The data should be read from sessionStorage
    expect(store2.data).toEqual(42);

    // Let's the data expire
    await vi.advanceTimersByTimeAsync(90);
    expect(store2.data).toEqual(undefined);

    // Await for the refetch to finish
    await vi.advanceTimersByTimeAsync(10);
    expect(store2.data).toEqual(45);

    expect(sessionStorage.getItem("test_key_4")).toEqual(
      devalue.stringify({
        created_ts: 2110,
        data: 45,
      }),
    );
  });

  it("should persist and restore custom values with serde", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(5000);

    const item = new TestValue({
      name: "Alice",
      age: 30,
      principal: Ed25519KeyIdentity.generate().getPrincipal(),
      testers: [Ed25519KeyIdentity.generate().getPrincipal()],
      option: Option.OPTION_A,
    });

    const store = managedState<TestValue>({
      queryFn: () => Promise.resolve(item),
      persistedKey: ["test_key_serde_session"],
      storageType: "sessionStorage",
      serde: testValueDevalueSerde,
    });

    await vi.advanceTimersByTimeAsync(10);

    // Data should be available and equal (deep equality)
    expect(store.data).toEqual(item);

    // Stored value should be serialized using our serializer mapping
    expect(sessionStorage.getItem("test_key_serde_session")).toEqual(
      devalue.stringify(
        { created_ts: 5000, data: item },
        testValueDevalueSerde.serialize,
      ),
    );

    // Create a new managedState reading the same key; it should deserialize
    // the stored value into a TestValue instance via our deserializer.
    const store2 = managedState<TestValue>({
      queryFn: () =>
        Promise.resolve(
          new TestValue({
            name: "ignored",
            age: 0,
            principal: Ed25519KeyIdentity.generate().getPrincipal(),
            testers: [],
            option: Option.OPTION_A,
          }),
        ),
      persistedKey: ["test_key_serde_session"],
      storageType: "sessionStorage",
      serde: testValueDevalueSerde,
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(store2.data).toEqual(item);
  });

  it("data should expire if stale", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(2123);

    let count = 10;
    const store = managedState<number>({
      queryFn: () =>
        new Promise((resolve) => {
          resolve(count);
          count += 5;
        }),
      staleTime: 100,
      persistedKey: ["test_key_2"],
      storageType: "sessionStorage",
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(store.isLoading).toEqual(false);
    expect(store.error).toEqual(undefined);
    expect(store.isSuccess).toEqual(true);
    expect(store.data).toEqual(10);

    expect(sessionStorage.getItem("test_key_2")).toEqual(
      devalue.stringify({
        created_ts: 2123,
        data: 10,
      }),
    );

    await vi.advanceTimersByTimeAsync(91);
    expect(store.data).toEqual(undefined);

    // Await for the refetch to finish
    await vi.advanceTimersByTimeAsync(10);
    expect(store.data).toEqual(15);

    expect(sessionStorage.getItem("test_key_2")).toEqual(
      devalue.stringify({
        created_ts: 2224,
        data: 15,
      }),
    );
  });

  it("should refetch data at intervals", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);

    let count = 10;
    const store = managedState<number>({
      queryFn: () =>
        new Promise((resolve) => {
          resolve(count);
          count += 5;
        }),
      refetchInterval: 1000,
      persistedKey: ["test_key_3"],
      storageType: "sessionStorage",
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(store.data).toEqual(10);

    expect(sessionStorage.getItem("test_key_3")).toEqual(
      devalue.stringify({
        created_ts: 1000,
        data: 10,
      }),
    );

    await vi.advanceTimersByTimeAsync(1001);
    expect(store.data).toEqual(15);

    expect(sessionStorage.getItem("test_key_3")).toEqual(
      devalue.stringify({
        created_ts: 2000,
        data: 15,
      }),
    );

    await vi.advanceTimersByTimeAsync(1001);
    expect(store.data).toEqual(20);

    expect(sessionStorage.getItem("test_key_3")).toEqual(
      devalue.stringify({
        created_ts: 3000,
        data: 20,
      }),
    );
  });

  it("should reset the data correctly", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);

    const store = managedState<number>({
      queryFn: () => Promise.resolve(42),
      persistedKey: ["test_key_5"],
      storageType: "sessionStorage",
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(store.isLoading).toEqual(false);
    expect(store.error).toEqual(undefined);
    expect(store.isSuccess).toEqual(true);
    expect(store.data).toEqual(42);

    expect(sessionStorage.getItem("test_key_5")).toEqual(
      devalue.stringify({
        created_ts: 1000,
        data: 42,
      }),
    );

    store.reset();
    expect(store.data).toEqual(undefined);
    expect(sessionStorage.getItem("test_key_5")).toEqual(null);
  });
});

describe("ManagedState - NoOps storage", () => {
  it("should fetch data from queryFn", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);

    const store = managedState<number>({
      queryFn: () => Promise.resolve(42),
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(store.data).toEqual(42);
  });

  it("State should not be shared", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);

    const store = managedState<number>({
      queryFn: () => Promise.resolve(42),
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(store.data).toEqual(42);

    const store2 = managedState<number>({
      queryFn: () => Promise.resolve(45),
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(store2.data).toEqual(45);
  });

  it("should reset the data correctly", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);

    const store = managedState<number>({
      queryFn: () => Promise.resolve(42),
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(store.isLoading).toEqual(false);
    expect(store.error).toEqual(undefined);
    expect(store.isSuccess).toEqual(true);
    expect(store.data).toEqual(42);

    store.reset();
    expect(store.data).toEqual(undefined);
  });
});

function neverResolvingPromise<T = never>(): Promise<T> {
  return new Promise<T>(() => {});
}
