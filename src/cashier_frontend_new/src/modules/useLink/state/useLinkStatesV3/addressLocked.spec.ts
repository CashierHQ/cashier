import type Action from "$modules/links/types/action/action";
import { UserLinkStep } from "$modules/links/types/userLinkStep";
import type { UserLinkStoreV3 } from "$modules/useLink/state/userLinkStoreV3.svelte";
import { beforeEach, describe, expect, it } from "vitest";
import { AddressLockedStateV3 } from "$modules/useLink/state/useLinkStatesV3/addressLocked";
import { GateStateV3 } from "$modules/useLink/state/useLinkStatesV3/gate";
import { LandingStateV3 } from "$modules/useLink/state/useLinkStatesV3/landing";

describe("AddressLockedStateV3", () => {
  let mockStore: UserLinkStoreV3;
  let state: AddressLockedStateV3;

  beforeEach(() => {
    mockStore = {
      state: null,
      action: null,
      linkDetail: {
        id: "test-link-id",
        gates: [],
      },
    } as unknown as UserLinkStoreV3;

    state = new AddressLockedStateV3(mockStore);
  });

  describe("step", () => {
    it("it_should_succeed_do_have_address_locked_step", () => {
      expect(state.step).toBe(UserLinkStep.ADDRESS_LOCKED);
    });
  });

  describe("goNext", () => {
    it("it_should_succeed_do_transition_to_gate_state_when_no_gates", async () => {
      await state.goNext();
      expect(mockStore.state).toBeInstanceOf(GateStateV3);
    });

    it("it_should_succeed_do_transition_to_gate_state_when_gates_closed", async () => {
      const storeWithGates = {
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
      } as unknown as UserLinkStoreV3;
      const stateWithGates = new AddressLockedStateV3(storeWithGates);
      await stateWithGates.goNext();
      expect(storeWithGates.state).toBeInstanceOf(GateStateV3);
    });

    it("it_should_succeed_do_transition_to_gate_state_even_when_gates_open", async () => {
      const storeWithOpenGates = {
        state: null,
        action: null,
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
      const stateWithOpenGates = new AddressLockedStateV3(storeWithOpenGates);
      await stateWithOpenGates.goNext();
      expect(storeWithOpenGates.state).toBeInstanceOf(GateStateV3);
    });
  });

  describe("goBack", () => {
    it("it_should_fail_do_go_back_due_to_existing_action", async () => {
      const storeWithAction = {
        state: null,
        action: { id: "action-1" } as Action,
        linkDetail: { id: "test-link-id" },
      } as unknown as UserLinkStoreV3;
      const stateWithAction = new AddressLockedStateV3(storeWithAction);

      await expect(stateWithAction.goBack()).rejects.toThrow(
        "Cannot go back: action already exists",
      );
    });

    it("it_should_succeed_do_transition_to_landing_state", async () => {
      await state.goBack();
      expect(mockStore.state).toBeInstanceOf(LandingStateV3);
    });
  });

  describe("goToLanding", () => {
    it("it_should_fail_do_go_to_landing_due_to_existing_action", async () => {
      const storeWithAction = {
        state: null,
        action: { id: "action-1" } as Action,
        linkDetail: { id: "test-link-id" },
      } as unknown as UserLinkStoreV3;
      const stateWithAction = new AddressLockedStateV3(storeWithAction);

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
