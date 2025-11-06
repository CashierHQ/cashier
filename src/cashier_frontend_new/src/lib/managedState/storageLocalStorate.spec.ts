/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it } from "vitest";
import * as devalue from "devalue";
import { LocalStorageStore } from "./storageLocalStorage";
import { Ed25519KeyIdentity } from "@dfinity/identity";
import { TestValue, Option, testValueDevalueSerde } from "./utils";

describe("LocalStorageStore", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should get set and remove items", () => {
    // Arrange
    const store = new LocalStorageStore("test_key");
    store.removeItem();

    // Act
    store.setItem("test");

    // Assert
    expect(store.getItem()).toEqual("test");
    expect(localStorage.getItem("test_key")).toEqual(devalue.stringify("test"));

    // Act
    store.removeItem();

    // Assert
    expect(store.getItem()).toEqual(null);
    expect(localStorage.getItem("test_key")).toEqual(null);
  });

  it("should overwrite items", () => {
    // Arrange
    const store = new LocalStorageStore("test_key");
    store.removeItem();

    // Act
    store.setItem("test");
    store.setItem("test2");

    // Assert
    expect(store.getItem()).toEqual("test2");
    expect(localStorage.getItem("test_key")).toEqual(
      devalue.stringify("test2"),
    );
  });

  it("should get global initial value if present", () => {
    // Arrange
    const store = new LocalStorageStore("test_key");
    store.removeItem();
    store.setItem(123456);

    // Act
    const store2 = new LocalStorageStore("test_key");

    // Assert
    expect(store2.getItem()).toEqual(123456);
  });

  it("should use different keys", () => {
    // Arrange
    const store = new LocalStorageStore("test_key");
    store.removeItem();

    // Act
    const store2 = new LocalStorageStore("test_key2");
    store2.setItem(123456);

    // Assert
    expect(store.getItem()).toEqual(null);
    expect(store2.getItem()).toEqual(123456);
  });

  it("should handle null values", () => {
    // Arrange
    const store = new LocalStorageStore("test_key");
    store.removeItem();

    // Act
    store.setItem(null);

    // Assert
    expect(store.getItem()).toEqual(null);
  });

  it("should handle undefined values", () => {
    // Arrange
    const store = new LocalStorageStore("test_key");
    store.removeItem();

    // Act
    store.setItem(undefined);

    // Assert
    expect(store.getItem()).toEqual(null);
  });

  it("should handle custom values", () => {
    // Arrange
    const store = new LocalStorageStore("test_key", testValueDevalueSerde);
    store.removeItem();

    const item = {
      owner: Ed25519KeyIdentity.generate().getPrincipal(),
      deepnested: {
        test: [
          new TestValue({
            name: "Bob",
            age: 25,
            principal: Ed25519KeyIdentity.generate().getPrincipal(),
            testers: [
              Ed25519KeyIdentity.generate().getPrincipal(),
              Ed25519KeyIdentity.generate().getPrincipal(),
              Ed25519KeyIdentity.generate().getPrincipal(),
            ],
            option: Option.OPTION_B,
          }),
        ],
        testBigint: 42n,
      },
      nested: new TestValue({
        name: "Alice123",
        age: 30,
        principal: Ed25519KeyIdentity.generate().getPrincipal(),
        testers: [
          Ed25519KeyIdentity.generate().getPrincipal(),
          Ed25519KeyIdentity.generate().getPrincipal(),
          Ed25519KeyIdentity.generate().getPrincipal(),
        ],
        option: Option.OPTION_C,
      }),
    };
    // Act
    store.setItem(item);

    // Assert
    expect(store.getItem()).toEqual(item);
  });
});
