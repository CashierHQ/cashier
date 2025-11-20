import type Action from "$modules/links/types/action/action";
import type { ProcessActionResult } from "$modules/links/types/action/action";
import { ActionType } from "$modules/links/types/action/actionType";
import { UserLinkStep } from "$modules/links/types/userLinkStep";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserLinkStore } from "../userLinkStore.svelte";
import { AddressUnlockedState } from "./addressUnlocked";
import { LandingState } from "./landing";

describe("AddressUnlockedState", () => {
  let mockStore: UserLinkStore;
  let state: AddressUnlockedState;
  let mockCreateAction: ReturnType<typeof vi.fn>;
  let mockProcessAction: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockCreateAction = vi.fn();
    mockProcessAction = vi.fn();

    // Create a mock store with required properties
    mockStore = {
      state: null,
      action: null,
      linkDetail: {
        id: "test-link-id",
        createAction: mockCreateAction,
        processAction: mockProcessAction,
      },
    } as unknown as UserLinkStore;

    state = new AddressUnlockedState(mockStore);
  });

  describe("initialization", () => {
    it("should have correct step", () => {
      expect(state.step).toBe(UserLinkStep.ADDRESS_UNLOCKED);
    });
  });

  describe("state transitions", () => {
    describe("goNext", () => {
      it("should throw error when trying to go next", async () => {
        await expect(state.goNext()).rejects.toThrow(
          "Cannot go next from Address Unlocked state.",
        );
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
  });

  describe("createAction", () => {
    it("should create RECEIVE action successfully", async () => {
      const mockAction = { id: "action-1", type: ActionType.RECEIVE } as Action;
      mockCreateAction.mockResolvedValue(mockAction);

      const result = await state.createAction(ActionType.RECEIVE);

      expect(mockCreateAction).toHaveBeenCalledWith(ActionType.RECEIVE);
      expect(result).toBe(mockAction);
    });

    it("should throw error for non-RECEIVE action types", async () => {
      await expect(state.createAction(ActionType.WITHDRAW)).rejects.toThrow(
        `Action type ${ActionType.WITHDRAW} not supported in AddressUnlocked state.`,
      );

      expect(mockCreateAction).not.toHaveBeenCalled();
    });
  });

  describe("processAction", () => {
    it("should process RECEIVE action successfully", async () => {
      const mockResult = { isSuccess: true } as ProcessActionResult;

      mockStore = {
        state: null,
        action: {
          id: "action-1",
          type: ActionType.RECEIVE,
        } as Action,
        linkDetail: {
          id: "test-link-id",
          createAction: mockCreateAction,
          processAction: mockProcessAction,
        },
      } as unknown as UserLinkStore;

      mockProcessAction.mockResolvedValue(mockResult);
      state = new AddressUnlockedState(mockStore);
      const result = await state.processAction();

      expect(mockProcessAction).toHaveBeenCalled();
      expect(result).toBe(mockResult);
    });

    it("should throw error when action is not created", async () => {
      await expect(state.processAction()).rejects.toThrow(
        "Action is not created",
      );

      expect(mockProcessAction).not.toHaveBeenCalled();
    });

    it("should throw error when action type is not RECEIVE", async () => {
      mockStore = {
        state: null,
        action: {
          id: "action-1",
          type: ActionType.SEND,
        } as Action,
        linkDetail: {
          id: "test-link-id",
          createAction: mockCreateAction,
          processAction: mockProcessAction,
        },
      } as unknown as UserLinkStore;
      state = new AddressUnlockedState(mockStore);

      await expect(state.processAction()).rejects.toThrow(
        `Action type ${ActionType.SEND} not supported in AddressUnlocked state.`,
      );

      expect(mockProcessAction).not.toHaveBeenCalled();
    });
  });

  describe("action capabilities", () => {
    it("should have createAction method", () => {
      expect("createAction" in state).toBe(true);
      expect(typeof state.createAction).toBe("function");
    });

    it("should have processAction method", () => {
      expect("processAction" in state).toBe(true);
      expect(typeof state.processAction).toBe("function");
    });

    it("should implement UserActionCapableState interface", () => {
      expect(state.step).toBe(UserLinkStep.ADDRESS_UNLOCKED);
      expect(typeof state.goNext).toBe("function");
      expect(typeof state.goBack).toBe("function");
      expect(typeof state.createAction).toBe("function");
      expect(typeof state.processAction).toBe("function");
    });
  });

  describe("error propagation", () => {
    it("should propagate errors from linkDetail.createAction", async () => {
      const error = new Error("API error");
      mockCreateAction.mockRejectedValue(error);

      await expect(state.createAction(ActionType.RECEIVE)).rejects.toThrow(
        "API error",
      );
    });

    it("should propagate errors from linkDetail.processAction", async () => {
      mockStore = {
        state: null,
        action: {
          id: "action-1",
          type: ActionType.RECEIVE,
        } as Action,
        linkDetail: {
          id: "test-link-id",
          createAction: mockCreateAction,
          processAction: mockProcessAction,
        },
      } as unknown as UserLinkStore;

      const error = new Error("Processing failed");
      mockProcessAction.mockRejectedValue(error);
      state = new AddressUnlockedState(mockStore);

      await expect(state.processAction()).rejects.toThrow("Processing failed");
    });
  });
});
