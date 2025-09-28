import { describe, expect, it } from "vitest";
import { GlobalStore } from ".";

describe("GlobalStore", () => {

    it('should get set and remove items', () => {
        // Arrange
        let store = new GlobalStore("test_key");
        store.removeItem();

        // Act
        store.setItem("test");

        // Assert
        expect(store.getItem()).toEqual("test");

        // Act
        store.removeItem();

        // Assert
        expect(store.getItem()).toEqual(null);
        
    })

    it('should overwrite items', () => {
        // Arrange
        let store = new GlobalStore("test_key");
        store.removeItem();

        // Act
        store.setItem("test");
        store.setItem("test2");

        // Assert
        expect(store.getItem()).toEqual("test2");
    })

    it('should get global initial value if present', () => {
        // Arrange
        let store = new GlobalStore("test_key")
        store.removeItem();
        store.setItem(123456);

        // Act
        let store2 = new GlobalStore("test_key");

        // Assert
        expect(store2.getItem()).toEqual(123456);
    })

    it('should use different keys', () => {
        // Arrange
        let store = new GlobalStore("test_key");
        store.removeItem();

        // Act
        let store2 = new GlobalStore("test_key2");        
        store2.setItem(123456);

        // Assert
        expect(store.getItem()).toEqual(null);
        expect(store2.getItem()).toEqual(123456);
    })
})