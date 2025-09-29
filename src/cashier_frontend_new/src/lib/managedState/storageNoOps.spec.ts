import { describe, expect, it } from "vitest";
import { NoOpsStore } from "./storageNoOps";

describe("NoOpsStore", () => {
  it("shuold get set and remove items", () => {
    // Arrange
    const store = new NoOpsStore();

    // Act
    store.setItem("test");

    // Assert
    expect(store.getItem()).toEqual(null);

    // Act
    store.removeItem();

    // Assert
    expect(store.getItem()).toEqual(null);

    // Act
    store.setItem(null);

    // Assert
    expect(store.getItem()).toEqual(null);

    // Act
    store.setItem(undefined);

    // Assert
    expect(store.getItem()).toEqual(null);
  });
});
