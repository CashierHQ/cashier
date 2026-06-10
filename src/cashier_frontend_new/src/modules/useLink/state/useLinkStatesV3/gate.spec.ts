import type Action from "$modules/links/types/action/action";
import { UserLinkStep } from "$modules/links/types/userLinkStep";
import type { UserLinkStoreV3 } from "$modules/useLink/state/userLinkStoreV3.svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddressLockedStateV3 } from "$modules/useLink/state/useLinkStatesV3/addressLocked";
import { AddressUnlockedStateV3 } from "$modules/useLink/state/useLinkStatesV3/addressUnlocked";
import { GateStateV3 } from "$modules/useLink/state/useLinkStatesV3/gate";
import { LandingStateV3 } from "$modules/useLink/state/useLinkStatesV3/landing";

describe("GateStateV3", () => {
  let mockStore: UserLinkStoreV3;
  let state: GateStateV3;

  beforeEach(() => {
    mockStore = {
      state: null,
      action: null,
      linkDetail: {
        id: "test-link-id",
      },
      refreshAsync: vi.fn().mockResolvedValue(undefined),
    } as unknown as UserLinkStoreV3;

    state = new GateStateV3(mockStore);
  });

  describe("step", () => {
    it("it_should_succeed_do_have_gate_step", () => {
      expect(state.step).toBe(UserLinkStep.GATE);
    });
  });

  describe("goNext", () => {
    it("it_should_succeed_do_transition_to_address_unlocked_state", async () => {
      await state.goNext();
      expect(mockStore.state).toBeInstanceOf(AddressUnlockedStateV3);
    });
  });

  describe("goBack", () => {
    it("it_should_fail_do_go_back_due_to_existing_action", async () => {
      const storeWithAction = {
        state: null,
        action: { id: "action-1" } as Action,
        linkDetail: { id: "test-link-id" },
      } as unknown as UserLinkStoreV3;
      const stateWithAction = new GateStateV3(storeWithAction);

      await expect(stateWithAction.goBack()).rejects.toThrow(
        "Cannot go back: action already exists",
      );
    });

    it("it_should_succeed_do_transition_to_address_locked_state", async () => {
      await state.goBack();
      expect(mockStore.state).toBeInstanceOf(AddressLockedStateV3);
    });
  });

  describe("goToLanding", () => {
    it("it_should_fail_do_go_to_landing_due_to_existing_action", async () => {
      const storeWithAction = {
        state: null,
        action: { id: "action-1" } as Action,
        linkDetail: { id: "test-link-id" },
      } as unknown as UserLinkStoreV3;
      const stateWithAction = new GateStateV3(storeWithAction);

      await expect(stateWithAction.goToLanding()).rejects.toThrow(
        "Cannot return to Landing: action already exists",
      );
    });

    it("it_should_succeed_do_transition_to_landing_state", async () => {
      await state.goToLanding();
      expect(mockStore.state).toBeInstanceOf(LandingStateV3);
    });
  });
});
