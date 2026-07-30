import type Action from "$modules/links/types/action/action";
import { ActionState } from "$modules/links/types/action/actionState";
import { ActionType } from "$modules/links/types/action/actionType";
import { UserLinkStep } from "$modules/links/types/userLinkStep";
import type { UserLinkStoreV3 } from "$modules/useLink/state/userLinkStoreV3.svelte";
import { Err, Ok } from "ts-results-es";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddressUnlockedStateV3 } from "$modules/useLink/state/useLinkStatesV3/addressUnlocked";
import { CompletedStateV3 } from "$modules/useLink/state/useLinkStatesV3/completed";
import { LandingStateV3 } from "$modules/useLink/state/useLinkStatesV3/landing";

const mocks = vi.hoisted(() => ({
  createActionV3: vi.fn(),
  processActionV3: vi.fn(),
  refreshAsync: vi.fn(),
  getDraftingAction: vi.fn(),
}));

vi.mock("$modules/links/services/cashierBackend", () => ({
  cashierBackendService: {
    createActionV3: mocks.createActionV3,
    processActionV3: mocks.processActionV3,
  },
}));

describe("AddressUnlockedStateV3", () => {
  let mockStore: UserLinkStoreV3;
  let state: AddressUnlockedStateV3;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore = {
      state: null,
      action: null,
      linkDetail: {
        id: "test-link-id",
        getDraftingAction: mocks.getDraftingAction,
        query: {
          refreshAsync: mocks.refreshAsync,
        },
      },
    } as unknown as UserLinkStoreV3;

    state = new AddressUnlockedStateV3(mockStore);
  });

  describe("step", () => {
    it("it_should_succeed_do_have_address_unlocked_step", () => {
      expect(state.step).toBe(UserLinkStep.ADDRESS_UNLOCKED);
    });
  });

  describe("goNext", () => {
    it("it_should_fail_do_go_next_due_to_no_action", async () => {
      await expect(state.goNext()).rejects.toThrow(
        "Cannot go next from Address Unlocked state.",
      );
    });

    it("it_should_fail_do_go_next_due_to_action_not_success", async () => {
      const storeWithPendingAction = {
        ...mockStore,
        action: {
          id: "action-1",
          type: ActionType.RECEIVE,
          state: ActionState.PROCESSING,
        } as unknown as Action,
      } as UserLinkStoreV3;
      const stateWithPendingAction = new AddressUnlockedStateV3(
        storeWithPendingAction,
      );

      await expect(stateWithPendingAction.goNext()).rejects.toThrow(
        "Cannot go next from Address Unlocked state.",
      );
    });

    it("it_should_succeed_do_transition_to_completed_state_when_action_succeeded", async () => {
      const storeWithSuccessAction = {
        ...mockStore,
        action: {
          id: "action-1",
          type: ActionType.RECEIVE,
          state: ActionState.SUCCESS,
        } as unknown as Action,
      } as UserLinkStoreV3;
      const stateWithSuccessAction = new AddressUnlockedStateV3(
        storeWithSuccessAction,
      );

      await stateWithSuccessAction.goNext();

      expect(storeWithSuccessAction.state).toBeInstanceOf(CompletedStateV3);
    });
  });

  describe("goBack", () => {
    it("it_should_fail_do_go_back_due_to_existing_action", async () => {
      const storeWithAction = {
        ...mockStore,
        action: { id: "action-1", type: ActionType.RECEIVE } as Action,
      } as UserLinkStoreV3;
      const stateWithAction = new AddressUnlockedStateV3(storeWithAction);

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
        ...mockStore,
        action: { id: "action-1", type: ActionType.RECEIVE } as Action,
      } as UserLinkStoreV3;
      const stateWithAction = new AddressUnlockedStateV3(storeWithAction);

      await expect(stateWithAction.goToLanding()).rejects.toThrow(
        "Cannot return to Landing: action already exists",
      );
    });

    it("it_should_succeed_do_transition_to_landing_state", async () => {
      await state.goToLanding();
      expect(mockStore.state).toBeInstanceOf(LandingStateV3);
    });
  });

  describe("createAction", () => {
    it("it_should_fail_do_create_action_due_to_unsupported_action_type", async () => {
      await expect(state.createAction(ActionType.WITHDRAW)).rejects.toThrow(
        `Action type ${ActionType.WITHDRAW} not supported in AddressUnlocked state.`,
      );
    });

    it("it_should_fail_do_create_action_due_to_get_drafting_action_error", async () => {
      mocks.getDraftingAction.mockReturnValueOnce(Err("template missing"));

      await expect(state.createAction(ActionType.RECEIVE)).rejects.toThrow(
        "Failed to get drafting receive action: template missing",
      );
    });

    it("it_should_fail_do_create_action_due_to_backend_error", async () => {
      const draftAction = { id: "draft-action" };
      mocks.getDraftingAction.mockReturnValueOnce(Ok(draftAction));
      mocks.createActionV3.mockResolvedValueOnce(Err("backend error"));

      await expect(state.createAction(ActionType.RECEIVE)).rejects.toThrow(
        "Failed to create action: backend error",
      );
    });

    it("it_should_succeed_do_create_action", async () => {
      const draftAction = { id: "draft-action" };
      const backendResponse = { action: { id: "action-1" } };
      mocks.getDraftingAction.mockReturnValueOnce(Ok(draftAction));
      mocks.createActionV3.mockResolvedValueOnce(Ok(backendResponse));

      const result = await state.createAction(ActionType.RECEIVE);

      expect(mocks.getDraftingAction).toHaveBeenCalledWith(ActionType.RECEIVE);
      expect(mocks.createActionV3).toHaveBeenCalledWith({
        link_id: "test-link-id",
        action: draftAction,
      });
      expect(mocks.refreshAsync).toHaveBeenCalled();
      expect(result).toBe(backendResponse);
    });
  });

  describe("processAction", () => {
    it("it_should_fail_do_process_action_due_to_missing_action", async () => {
      await expect(state.processAction()).rejects.toThrow(
        "Action is not created",
      );
    });

    it("it_should_fail_do_process_action_due_to_unsupported_action_type", async () => {
      const storeWithSendAction = {
        ...mockStore,
        action: { id: "action-1", type: ActionType.SEND } as Action,
      } as UserLinkStoreV3;
      const stateWithSendAction = new AddressUnlockedStateV3(
        storeWithSendAction,
      );

      await expect(stateWithSendAction.processAction()).rejects.toThrow(
        `Action type ${ActionType.SEND} not supported in AddressUnlocked state.`,
      );
    });

    it("it_should_fail_do_process_action_due_to_backend_error", async () => {
      const storeWithReceiveAction = {
        ...mockStore,
        action: { id: "action-1", type: ActionType.RECEIVE } as Action,
      } as UserLinkStoreV3;
      const stateWithReceiveAction = new AddressUnlockedStateV3(
        storeWithReceiveAction,
      );
      mocks.processActionV3.mockResolvedValueOnce(Err("backend error"));

      await expect(stateWithReceiveAction.processAction()).rejects.toThrow(
        "Failed to process action: backend error",
      );
    });

    it("it_should_succeed_do_process_action", async () => {
      const storeWithReceiveAction = {
        ...mockStore,
        action: { id: "action-1", type: ActionType.RECEIVE } as Action,
      } as UserLinkStoreV3;
      const stateWithReceiveAction = new AddressUnlockedStateV3(
        storeWithReceiveAction,
      );
      const backendResponse = {
        action: { id: "action-1" },
        isSuccess: true,
        errors: [],
      };
      mocks.processActionV3.mockResolvedValueOnce(Ok(backendResponse));

      const result = await stateWithReceiveAction.processAction();

      expect(mocks.processActionV3).toHaveBeenCalledWith("action-1");
      expect(mocks.refreshAsync).toHaveBeenCalled();
      // A successful claim always ends the flow at Completed, regardless of
      // remaining slots — multiple claims are supported by reopening the
      // link fresh, not by staying on AddressUnlocked after claiming.
      expect(storeWithReceiveAction.state).toBeInstanceOf(CompletedStateV3);
      expect(result).toBe(backendResponse);
    });

    it("it_should_fail_do_process_action_when_not_success", async () => {
      const storeWithReceiveAction = {
        ...mockStore,
        action: { id: "action-1", type: ActionType.RECEIVE } as Action,
      } as UserLinkStoreV3;
      const stateWithReceiveAction = new AddressUnlockedStateV3(
        storeWithReceiveAction,
      );
      // Backend returns Ok but the claim itself failed (isSuccess=false) — must NOT complete.
      const backendResponse = {
        action: { id: "action-1" },
        isSuccess: false,
        errors: ["InsufficientFunds"],
      };
      mocks.processActionV3.mockResolvedValueOnce(Ok(backendResponse));

      await expect(stateWithReceiveAction.processAction()).rejects.toThrow(
        "Action processing failed: InsufficientFunds",
      );
      expect(storeWithReceiveAction.state).not.toBeInstanceOf(CompletedStateV3);
    });
  });
});
