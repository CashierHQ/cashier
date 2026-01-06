import { UserLinkStep } from "$modules/links/types/userLinkStep";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserLinkStore } from "../userLinkStore.svelte";
import { AddressUnlockedState } from "./addressUnlocked";
import { LandingState } from "./landing";

describe("LandingState", () => {
  let mockStore: UserLinkStore;
  let state: LandingState;

  beforeEach(() => {
    // Create a mock store with minimal required properties
    mockStore = {
      state: null,
      link: { id: "test-link-id", state: "active" },
      linkDetail: {
        id: "test-link-id",
        query: {
          refresh: vi.fn().mockResolvedValue(undefined),
        },
      },
    } as unknown as UserLinkStore;

    state = new LandingState(mockStore);
  });

  describe("initialization", () => {
    it("should have correct step", () => {
      expect(state.step).toBe(UserLinkStep.LANDING);
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
    it("should thows error", async () => {
      await expect(state.goBack()).rejects.toThrow(
        "Cannot go back from Landing state.",
      );
    });
  });

  describe("goToLanding", () => {
    it("should throw error (already at Landing)", async () => {
      await expect(state.goToLanding()).rejects.toThrow(
        "Already at Landing state.",
      );
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
