import { UserLinkStep } from "$modules/links/types/userLinkStep";
import type { UserLinkStoreV3 } from "$modules/useLink/state/userLinkStoreV3.svelte";
import { beforeEach, describe, expect, it } from "vitest";
import { AddressLockedStateV3 } from "$modules/useLink/state/useLinkStatesV3/addressLocked";
import { AddressUnlockedStateV3 } from "$modules/useLink/state/useLinkStatesV3/addressUnlocked";
import { LandingStateV3 } from "$modules/useLink/state/useLinkStatesV3/landing";

describe("LandingStateV3", () => {
  let mockStore: UserLinkStoreV3;
  let state: LandingStateV3;

  beforeEach(() => {
    mockStore = {
      state: null,
      linkDetail: {
        id: "test-link-id",
        gates: [],
      },
    } as unknown as UserLinkStoreV3;

    state = new LandingStateV3(mockStore);
  });

  describe("step", () => {
    it("it_should_succeed_do_have_landing_step", () => {
      expect(state.step).toBe(UserLinkStep.LANDING);
    });
  });

  describe("goNext", () => {
    it("it_should_succeed_do_transition_to_address_unlocked_state_when_no_gates", async () => {
      await state.goNext();
      expect(mockStore.state).toBeInstanceOf(AddressUnlockedStateV3);
    });

    it("it_should_succeed_do_transition_to_address_locked_state_when_gates_closed", async () => {
      const storeWithGates = {
        state: null,
        linkDetail: {
          id: "test-link-id",
          gates: [
            {
              gate: { id: "gate-1" },
              gate_user_status: [{ status: { Closed: null } }],
            },
          ],
        },
      } as unknown as UserLinkStoreV3;
      const stateWithGates = new LandingStateV3(storeWithGates);
      await stateWithGates.goNext();
      expect(storeWithGates.state).toBeInstanceOf(AddressLockedStateV3);
    });

    it("it_should_succeed_do_transition_to_address_unlocked_state_when_all_gates_open", async () => {
      const storeWithOpenGates = {
        state: null,
        linkDetail: {
          id: "test-link-id",
          gates: [
            {
              gate: { id: "gate-1" },
              gate_user_status: [{ status: { Open: null } }],
            },
          ],
        },
      } as unknown as UserLinkStoreV3;
      const stateWithOpenGates = new LandingStateV3(storeWithOpenGates);
      await stateWithOpenGates.goNext();
      expect(storeWithOpenGates.state).toBeInstanceOf(AddressUnlockedStateV3);
    });
  });

  describe("goBack", () => {
    it("it_should_fail_do_go_back_due_to_landing_state", async () => {
      await expect(state.goBack()).rejects.toThrow(
        "Cannot go back from Landing state.",
      );
    });
  });

  describe("goToLanding", () => {
    it("it_should_fail_do_go_to_landing_due_to_already_at_landing", async () => {
      await expect(state.goToLanding()).rejects.toThrow(
        "Already at Landing state.",
      );
    });
  });
});
