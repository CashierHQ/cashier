import { ActionType } from "$modules/links/types/action/actionType";
import { LinkStep } from "$modules/links/types/linkStep";
import {
  ActionState as SharedActionState,
  ActionType as SharedActionType,
  AddressType as SharedAddressType,
  type Action as SharedAction,
} from "$shared";
import { Principal } from "@dfinity/principal";
import { Err, Ok } from "ts-results-es";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LinkDetailStoreV3 } from "../linkDetailStoreV3.svelte";
import { LinkInactiveStateV3 } from "./inactive";

const mocks = vi.hoisted(() => ({
  createActionV3: vi.fn(),
  processActionV3: vi.fn(),
  refresh: vi.fn(),
  queryRefresh: vi.fn(),
}));

vi.mock("$modules/links/services/cashierBackend", () => ({
  cashierBackendService: {
    createActionV3: mocks.createActionV3,
    processActionV3: mocks.processActionV3,
  },
}));

vi.mock("$modules/links/state/linkListStore.svelte", () => ({
  linkListStore: {
    refresh: mocks.refresh,
  },
}));

const authStateMock = vi.hoisted(() => ({
  account: { owner: "" } as { owner: string } | null,
}));

vi.mock("$modules/auth/state/auth.svelte", () => ({
  authState: authStateMock,
}));

const CREATOR = Principal.fromText("aaaaa-aa");
const OTHER = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");

const DRAFT_WITHDRAW_ACTION: SharedAction = {
  id: "draft-withdraw-action",
  creator: CREATOR,
  creator_address_type: SharedAddressType.Creator,
  action_type: SharedActionType.Withdraw,
  intents: [],
  action_state: SharedActionState.Created,
};

function makeBackendAction(actionType: SharedActionType): SharedAction {
  return {
    id: "action-1",
    creator: CREATOR,
    creator_address_type: SharedAddressType.Creator,
    action_type: actionType,
    intents: [],
    action_state: SharedActionState.Created,
  };
}

function makeStore(overrides?: Partial<LinkDetailStoreV3>): LinkDetailStoreV3 {
  const store = {
    link: {
      id: "link-1",
      creator: CREATOR,
    },
    backendAction: makeBackendAction(SharedActionType.Withdraw),
    getDraftingAction: vi.fn().mockReturnValue(Ok(DRAFT_WITHDRAW_ACTION)),
    query: {
      refresh: mocks.queryRefresh,
    },
    ...overrides,
  };
  return store as unknown as LinkDetailStoreV3;
}

describe("LinkInactiveStateV3", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStateMock.account = { owner: CREATOR.toText() };
  });

  describe("step", () => {
    it("it_should_succeed_do_have_inactive_step", () => {
      const state = new LinkInactiveStateV3(makeStore());
      expect(state.step).toBe(LinkStep.INACTIVE);
    });
  });

  describe("createAction", () => {
    it("it_should_fail_do_create_action_due_to_missing_link", async () => {
      const state = new LinkInactiveStateV3(makeStore({ link: undefined }));
      await expect(
        state.createAction(SharedActionType.Withdraw),
      ).rejects.toThrow("Link is missing");
    });

    it("it_should_fail_do_create_action_due_to_invalid_action_type", async () => {
      const state = new LinkInactiveStateV3(makeStore());
      await expect(
        state.createAction(SharedActionType.Receive),
      ).rejects.toThrow("Invalid action type for Inactive state");
    });

    it("it_should_fail_do_create_action_due_to_user_not_authenticated", async () => {
      authStateMock.account = null;
      const state = new LinkInactiveStateV3(makeStore());
      await expect(
        state.createAction(SharedActionType.Withdraw),
      ).rejects.toThrow("User is not authenticated");
    });

    it("it_should_fail_do_create_action_due_to_user_is_not_creator", async () => {
      authStateMock.account = { owner: OTHER.toText() };
      const state = new LinkInactiveStateV3(makeStore());
      await expect(
        state.createAction(SharedActionType.Withdraw),
      ).rejects.toThrow("Only the creator of the link can activate it");
    });

    it("it_should_fail_do_create_action_due_to_failed_get_drafting_action", async () => {
      const state = new LinkInactiveStateV3(
        makeStore({
          getDraftingAction: vi.fn().mockReturnValue(Err("missing template")),
        }),
      );
      await expect(
        state.createAction(SharedActionType.Withdraw),
      ).rejects.toThrow(
        "Failed to get drafting withdraw action: missing template",
      );
    });

    it("it_should_fail_do_create_action_due_to_backend_error", async () => {
      mocks.createActionV3.mockResolvedValueOnce(Err("backend error"));
      const state = new LinkInactiveStateV3(makeStore());
      await expect(
        state.createAction(SharedActionType.Withdraw),
      ).rejects.toThrow("Failed to create action: backend error");
    });

    it("it_should_succeed_do_create_action", async () => {
      const backendResponse = {
        action: { id: "action-1" },
      };
      mocks.createActionV3.mockResolvedValueOnce(
        Ok(backendResponse as unknown),
      );
      const store = makeStore();
      const state = new LinkInactiveStateV3(store);

      const result = await state.createAction(SharedActionType.Withdraw);

      expect(store.getDraftingAction).toHaveBeenCalledWith(ActionType.WITHDRAW);
      expect(mocks.createActionV3).toHaveBeenCalledWith({
        link_id: "link-1",
        action: DRAFT_WITHDRAW_ACTION,
      });
      expect(mocks.queryRefresh).toHaveBeenCalled();
      expect(result).toBe(backendResponse);
    });
  });

  describe("processAction", () => {
    it("it_should_fail_do_process_action_due_to_missing_link", async () => {
      const state = new LinkInactiveStateV3(makeStore({ link: undefined }));
      await expect(state.processAction()).rejects.toThrow("Link is missing");
    });

    it("it_should_fail_do_process_action_due_to_missing_action", async () => {
      const state = new LinkInactiveStateV3(
        makeStore({ backendAction: undefined }),
      );
      await expect(state.processAction()).rejects.toThrow("Action is missing");
    });

    it("it_should_fail_do_process_action_due_to_invalid_action_type", async () => {
      const state = new LinkInactiveStateV3(
        makeStore({
          backendAction: makeBackendAction(SharedActionType.Receive),
        }),
      );
      await expect(state.processAction()).rejects.toThrow(
        "Invalid action type for Inactive state",
      );
    });

    it("it_should_fail_do_process_action_due_to_user_not_authenticated", async () => {
      authStateMock.account = null;
      const state = new LinkInactiveStateV3(makeStore());
      await expect(state.processAction()).rejects.toThrow(
        "User is not authenticated",
      );
    });

    it("it_should_fail_do_process_action_due_to_user_is_not_creator", async () => {
      authStateMock.account = { owner: OTHER.toText() };
      const state = new LinkInactiveStateV3(makeStore());
      await expect(state.processAction()).rejects.toThrow(
        "Only the creator of the link can activate it",
      );
    });

    it("it_should_fail_do_process_action_due_to_backend_error", async () => {
      mocks.processActionV3.mockResolvedValueOnce(Err("backend error"));
      const state = new LinkInactiveStateV3(makeStore());
      await expect(state.processAction()).rejects.toThrow(
        "Failed to process action: backend error",
      );
    });

    it("it_should_succeed_do_process_action", async () => {
      const backendResponse = {
        action: { id: "action-1" },
      };
      mocks.processActionV3.mockResolvedValueOnce(
        Ok(backendResponse as unknown),
      );
      const state = new LinkInactiveStateV3(makeStore());

      const result = await state.processAction();

      expect(mocks.processActionV3).toHaveBeenCalledWith("action-1");
      expect(mocks.refresh).toHaveBeenCalled();
      expect(mocks.queryRefresh).toHaveBeenCalled();
      expect(result).toBe(backendResponse);
    });
  });
});
