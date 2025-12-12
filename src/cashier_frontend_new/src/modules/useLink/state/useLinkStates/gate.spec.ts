import { UserLinkStep } from "$modules/links/types/userLinkStep";
import { beforeEach, describe, expect, it } from "vitest";
import type { UserLinkStore } from "../userLinkStore.svelte";
import { AddressLockedState } from "./addressLocked";
import { AddressUnlockedState } from "./addressUnlocked";
import { GateState } from "./gate";

describe("GateState", () => {
  let mockStore: UserLinkStore;
  let state: GateState;

  beforeEach(() => {
    // Create a mock store with minimal required properties
    mockStore = {
      state: null,
      linkDetail: {
        id: "test-link-id",
      },
    } as unknown as UserLinkStore;

    state = new GateState(mockStore);
  });

  describe("initialization", () => {
    it("should have correct step", () => {
      expect(state.step).toBe(UserLinkStep.GATE);
    });

    it("should store reference to UserLinkStore", () => {
      expect(state).toBeDefined();
      // We can't directly test private field, but we can test behavior
    });
  });

  describe("goNext", () => {
    it("should transition to AddressUnlockedState", async () => {
      await state.goNext();

      expect(mockStore.state).toBeInstanceOf(AddressUnlockedState);
    });

    it("should pass the store to the new state", async () => {
      await state.goNext();

      const newState = mockStore.state as AddressUnlockedState;
      expect(newState).toBeDefined();
      expect(newState.step).toBe(UserLinkStep.ADDRESS_UNLOCKED);
    });
  });

  describe("goBack", () => {
    it("should transition to AddressLockedState", async () => {
      await state.goBack();

      expect(mockStore.state).toBeInstanceOf(AddressLockedState);
    });

    it("should pass the store to the new state", async () => {
      await state.goBack();

      const newState = mockStore.state as AddressLockedState;
      expect(newState).toBeDefined();
      expect(newState.step).toBe(UserLinkStep.ADDRESS_LOCKED);
    });
  });

  describe("action capabilities", () => {
    it("should not have createAction method", () => {
      expect("createAction" in state).toBe(false);
    });

    it("should not have processAction method", () => {
      expect("processAction" in state).toBe(false);
    });
  });
});
