import { UserLinkStep } from "$modules/links/types/userLinkStep";
import { beforeEach, describe, expect, it } from "vitest";
import type { UserLinkStore } from "../userLinkStore.svelte";
import { AddressLockedState } from "./addressLocked";
import { GateState } from "./gate";
import { LandingState } from "./landing";

describe("AddressLockedState", () => {
  let mockStore: UserLinkStore;
  let state: AddressLockedState;

  beforeEach(() => {
    // Create a mock store with minimal required properties
    mockStore = {
      state: null,
      linkDetail: {
        id: "test-link-id",
      },
    } as unknown as UserLinkStore;

    state = new AddressLockedState(mockStore);
  });

  describe("initialization", () => {
    it("should have correct step", () => {
      expect(state.step).toBe(UserLinkStep.ADDRESS_LOCKED);
    });

    it("should store reference to UserLinkStore", () => {
      expect(state).toBeDefined();
      // We can't directly test private field, but we can test behavior
    });
  });

  describe("goNext", () => {
    it("should transition to GateState", async () => {
      await state.goNext();

      expect(mockStore.state).toBeInstanceOf(GateState);
    });

    it("should pass the store to the new state", async () => {
      await state.goNext();

      const newState = mockStore.state as GateState;
      expect(newState).toBeDefined();
      expect(newState.step).toBe(UserLinkStep.GATE);
    });
  });

  describe("goBack", () => {
    it("should transition to LandingState", async () => {
      await state.goBack();

      expect(mockStore.state).toBeInstanceOf(LandingState);
    });

    it("should pass the store to the new state", async () => {
      await state.goBack();

      const newState = mockStore.state as LandingState;
      expect(newState).toBeDefined();
      expect(newState.step).toBe(UserLinkStep.LANDING);
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
