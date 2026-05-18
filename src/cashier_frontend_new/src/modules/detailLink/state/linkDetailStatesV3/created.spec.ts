import { LinkStep } from "$modules/links/types/linkStep";
import {
  ActionState as SharedActionState,
  ActionType as SharedActionType,
  AddressType as SharedAddressType,
  type Action as SharedAction,
} from "$shared";
import { Principal } from "@icp-sdk/core/principal";
import { Err, Ok } from "ts-results-es";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LinkDetailStoreV3 } from "$modules/detailLink/state/linkDetailStoreV3.svelte";
import { LinkCreatedStateV3 } from "$modules/detailLink/state/linkDetailStatesV3/created";

const mocks = vi.hoisted(() => ({
  processActionV3: vi.fn(),
  refresh: vi.fn(),
  queryRefresh: vi.fn(),
}));

vi.mock("$modules/links/services/cashierBackend", () => ({
  cashierBackendService: {
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
    backendAction: makeBackendAction(SharedActionType.CreateLink),
    query: {
      refresh: mocks.queryRefresh,
    },
    ...overrides,
  };
  return store as unknown as LinkDetailStoreV3;
}

describe("LinkCreatedStateV3", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStateMock.account = { owner: CREATOR.toText() };
  });

  describe("step", () => {
    it("it_should_have_created_step", () => {
      const state = new LinkCreatedStateV3(makeStore());
      expect(state.step).toBe(LinkStep.CREATED);
    });
  });

  describe("createAction", () => {
    it("it_should_fail_do_create_action_due_to_not_supported_in_created_state", async () => {
      const state = new LinkCreatedStateV3(makeStore());
      await expect(
        state.createAction(SharedActionType.Withdraw),
      ).rejects.toThrow(
        "Creating Withdraw action is not supported in Created state",
      );
    });
  });

  describe("processAction", () => {
    it("it_should_fail_do_process_action_due_to_missing_link", async () => {
      const state = new LinkCreatedStateV3(makeStore({ link: undefined }));
      await expect(state.processAction()).rejects.toThrow("Link is missing");
    });

    it("it_should_fail_do_process_action_due_to_missing_action", async () => {
      const state = new LinkCreatedStateV3(
        makeStore({ backendAction: undefined }),
      );
      await expect(state.processAction()).rejects.toThrow("Action is missing");
    });

    it("it_should_fail_do_process_action_due_to_invalid_action_type", async () => {
      const state = new LinkCreatedStateV3(
        makeStore({
          backendAction: makeBackendAction(SharedActionType.Withdraw),
        }),
      );
      await expect(state.processAction()).rejects.toThrow(
        "Invalid action type for Created state",
      );
    });

    it("it_should_fail_do_process_action_due_to_user_not_authenticated", async () => {
      authStateMock.account = null;
      const state = new LinkCreatedStateV3(makeStore());
      await expect(state.processAction()).rejects.toThrow(
        "User is not authenticated",
      );
    });

    it("it_should_fail_do_process_action_due_to_user_is_not_creator", async () => {
      authStateMock.account = { owner: OTHER.toText() };
      const state = new LinkCreatedStateV3(makeStore());
      await expect(state.processAction()).rejects.toThrow(
        "Only the creator of the link can activate it",
      );
    });

    it("it_should_fail_do_process_action_due_to_backend_error", async () => {
      mocks.processActionV3.mockResolvedValueOnce(Err("backend error"));
      const state = new LinkCreatedStateV3(makeStore());
      await expect(state.processAction()).rejects.toThrow(
        "Failed to activate link: backend error",
      );
    });

    it("it_should_succeed_do_process_action", async () => {
      const backendResponse = {
        action: { id: "action-1" },
      };
      mocks.processActionV3.mockResolvedValueOnce(
        Ok(backendResponse as unknown),
      );
      const state = new LinkCreatedStateV3(makeStore());

      const result = await state.processAction();

      expect(mocks.processActionV3).toHaveBeenCalledWith("action-1");
      expect(mocks.refresh).toHaveBeenCalled();
      expect(mocks.queryRefresh).toHaveBeenCalled();
      expect(result).toBe(backendResponse);
    });
  });
});
