/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it } from "vitest";
import * as devalue from "devalue";
import { LocalStorageStore } from "./storageLocalStorage";

describe("LocalStorageStore", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should get set and remove items", () => {
    // Arrange
    let store = new LocalStorageStore("test_key");
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
    let store = new LocalStorageStore("test_key");
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
    let store = new LocalStorageStore("test_key");
    store.removeItem();
    store.setItem(123456);

    // Act
    let store2 = new LocalStorageStore("test_key");

    // Assert
    expect(store2.getItem()).toEqual(123456);
  });

  it("should use different keys", () => {
    // Arrange
    let store = new LocalStorageStore("test_key");
    store.removeItem();

    // Act
    let store2 = new LocalStorageStore("test_key2");
    store2.setItem(123456);

    // Assert
    expect(store.getItem()).toEqual(null);
    expect(store2.getItem()).toEqual(123456);
  });

  it("should handle null values", () => {
    // Arrange
    let store = new LocalStorageStore("test_key");
    store.removeItem();

    // Act
    store.setItem(null);

    // Assert
    expect(store.getItem()).toEqual(null);
  });

  it("should handle undefined values", () => {
    // Arrange
    let store = new LocalStorageStore("test_key");
    store.removeItem();

    // Act
    store.setItem(undefined);

    // Assert
    expect(store.getItem()).toEqual(null);
  });
});
