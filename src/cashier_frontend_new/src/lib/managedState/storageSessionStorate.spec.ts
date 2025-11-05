/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it } from "vitest";
import * as devalue from "devalue";
import { SessionStorageStore } from "./storageSessionStorage";
import type { DevalueSerde } from ".";
import { Principal } from "@dfinity/principal";

class TestValue {
  public name: string;
  public age: number;
  public principal: Principal;
  constructor({
    name,
    age,
    principal,
  }: {
    name: string;
    age: number;
    principal: Principal;
  }) {
    this.name = name;
    this.age = age;
    this.principal = principal;
  }
}

const testValueDevalueSerde: DevalueSerde = {
  serialize: {
    TestValue: (v) =>
      v instanceof TestValue && {
        name: v.name,
        age: v.age,
        principal: v.principal,
      },
    Principal: (principal) =>
      principal instanceof Principal && principal.toText(),
  },
  deserialize: {
    TestValue: (v) => {
      const value = v as { name: string; age: number; principal: Principal };
      return new TestValue({
        name: value.name,
        age: value.age,
        principal: value.principal,
      });
    },
    Principal: (data) => typeof data == "string" && Principal.fromText(data),
  },
};

describe("SessionStorageStore", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("should get set and remove items", () => {
    // Arrange
    const store = new SessionStorageStore("test_key");
    store.removeItem();

    // Act
    store.setItem("test");

    // Assert
    expect(store.getItem()).toEqual("test");
    expect(sessionStorage.getItem("test_key")).toEqual(
      devalue.stringify("test"),
    );

    // Act
    store.removeItem();

    // Assert
    expect(store.getItem()).toEqual(null);
    expect(sessionStorage.getItem("test_key")).toEqual(null);
  });

  it("should overwrite items", () => {
    // Arrange
    const store = new SessionStorageStore("test_key");
    store.removeItem();

    // Act
    store.setItem("test");
    store.setItem("test2");

    // Assert
    expect(store.getItem()).toEqual("test2");
    expect(sessionStorage.getItem("test_key")).toEqual(
      devalue.stringify("test2"),
    );
  });

  it("should get global initial value if present", () => {
    // Arrange
    const store = new SessionStorageStore("test_key");
    store.removeItem();
    store.setItem(123456);

    // Act
    const store2 = new SessionStorageStore("test_key");

    // Assert
    expect(store2.getItem()).toEqual(123456);
  });

  it("should use different keys", () => {
    // Arrange
    const store = new SessionStorageStore("test_key");
    store.removeItem();

    // Act
    const store2 = new SessionStorageStore("test_key2");
    store2.setItem(123456);

    // Assert
    expect(store.getItem()).toEqual(null);
    expect(store2.getItem()).toEqual(123456);
  });

  it("should handle null values", () => {
    // Arrange
    const store = new SessionStorageStore("test_key");
    store.removeItem();

    // Act
    store.setItem(null);

    // Assert
    expect(store.getItem()).toEqual(null);
  });

  it("should handle undefined values", () => {
    // Arrange
    const store = new SessionStorageStore("test_key");
    store.removeItem();

    // Act
    store.setItem(undefined);

    // Assert
    expect(store.getItem()).toEqual(null);
  });

  it("should handle custom values", () => {
    // Arrange
    const store = new SessionStorageStore("test_key", testValueDevalueSerde);
    store.removeItem();

    const item = new TestValue({
      name: "Alice123",
      age: 30,
      principal: Principal.fromText(
        "ur2tx-mciqf-h4p4b-qggnv-arpsc-s3wui-2blbn-aphly-wzoos-iqjik-hae",
      ),
    });

    // Act
    store.setItem(item);

    // Assert
    expect(store.getItem()).toEqual(item);
  });
});
