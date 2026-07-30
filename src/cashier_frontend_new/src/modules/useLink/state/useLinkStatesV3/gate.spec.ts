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
        gates: [],
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
    it("it_should_succeed_do_transition_to_address_unlocked_state_when_gates_open", async () => {
      await state.goNext();
      expect(mockStore.refreshAsync).toHaveBeenCalled();
      expect(mockStore.state).toBeInstanceOf(AddressUnlockedStateV3);
    });

    it("it_should_stay_in_gate_state_when_gates_still_closed", async () => {
      const storeWithClosedGates = {
        state: null,
        action: null,
        linkDetail: {
          id: "test-link-id",
          gates: [
            {
              gate: { id: "gate-1" },
              gate_user_status: [{ status: { Closed: null } }],
            },
          ],
        },
        refreshAsync: vi.fn().mockResolvedValue(undefined),
      } as unknown as UserLinkStoreV3;
      const stateWithClosedGates = new GateStateV3(storeWithClosedGates);

      await stateWithClosedGates.goNext();

      expect(storeWithClosedGates.refreshAsync).toHaveBeenCalled();
      expect(storeWithClosedGates.state).toBeNull();
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

    it("it_should_succeed_do_transition_to_address_locked_state_when_gates_closed", async () => {
      const storeWithClosedGates = {
        state: null,
        action: null,
        linkDetail: {
          id: "test-link-id",
          gates: [
            {
              gate: { id: "gate-1" },
              gate_user_status: [{ status: { Closed: null } }],
            },
          ],
        },
        refreshAsync: vi.fn().mockResolvedValue(undefined),
      } as unknown as UserLinkStoreV3;
      const stateWithClosedGates = new GateStateV3(storeWithClosedGates);

      await stateWithClosedGates.goBack();

      expect(storeWithClosedGates.refreshAsync).toHaveBeenCalled();
      expect(storeWithClosedGates.state).toBeInstanceOf(AddressLockedStateV3);
    });

    it("it_should_succeed_do_transition_to_address_unlocked_state_when_gates_open", async () => {
      await state.goBack();
      expect(mockStore.refreshAsync).toHaveBeenCalled();
      expect(mockStore.state).toBeInstanceOf(AddressUnlockedStateV3);
    });

    it("it_should_refresh_before_checking_gates_so_a_just_unlocked_gate_is_seen", async () => {
      // Simulates: user unlocks the gate (backend now reports Open) but the
      // store's cached `gates` snapshot is still stale until refreshed - the
      // exact scenario from the bug where clicking Back right after unlocking
      // (without ever clicking Continue/goNext) sent the user to
      // AddressLockedStateV3 instead of AddressUnlockedStateV3.
      const gates = [
        {
          gate: { id: "gate-1" },
          gate_user_status: [{ status: { Closed: null } }],
        },
      ];
      const storeWithStaleGates = {
        state: null,
        action: null,
        linkDetail: {
          id: "test-link-id",
          get gates() {
            return gates;
          },
        },
        refreshAsync: vi.fn().mockImplementation(() => {
          gates[0].gate_user_status[0].status = { Open: null };
          return Promise.resolve();
        }),
      } as unknown as UserLinkStoreV3;
      const stateWithStaleGates = new GateStateV3(storeWithStaleGates);

      await stateWithStaleGates.goBack();

      expect(storeWithStaleGates.refreshAsync).toHaveBeenCalled();
      expect(storeWithStaleGates.state).toBeInstanceOf(AddressUnlockedStateV3);
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
