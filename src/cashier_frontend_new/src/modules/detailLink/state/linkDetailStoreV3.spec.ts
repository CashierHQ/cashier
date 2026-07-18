import { LinkActiveStateV3 } from "$modules/detailLink/state/linkDetailStatesV3/active";
import { LinkCreatedStateV3 } from "$modules/detailLink/state/linkDetailStatesV3/created";
import { LinkEndedStateV3 } from "$modules/detailLink/state/linkDetailStatesV3/ended";
import { LinkInactiveStateV3 } from "$modules/detailLink/state/linkDetailStatesV3/inactive";
import {
  ActionState as SharedActionState,
  ActionType as SharedActionType,
  AddressType as SharedAddressType,
  LinkState as SharedLinkState,
  LinkType as SharedLinkType,
  type Action as SharedAction,
  type Link as SharedLink,
} from "$shared";
import { Principal } from "@icp-sdk/core/principal";
import { Err, Ok } from "ts-results-es";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LinkDetailStoreV3 } from "$modules/detailLink/state/linkDetailStoreV3.svelte";

const mocks = vi.hoisted(() => ({
  queryState: {
    data: undefined as unknown,
    refresh: vi.fn(),
    refreshAsync: vi.fn(),
  },
  managedStateOptions: undefined as
    | {
        queryFn: () => Promise<unknown>;
        watch: boolean;
      }
    | undefined,
  managedState: vi.fn(),
  fetchLinkDetailV3: vi.fn(),
  createActionFromTemplate: vi.fn(),
  fromSharedLink: vi.fn(),
  fromSharedAction: vi.fn(),
  disableLinkV3: vi.fn(),
}));

const authStateMock = vi.hoisted(() => ({
  isLoggedIn: true,
  account: { owner: "" } as { owner: string } | null,
}));

vi.mock("$lib/managedState", () => ({
  managedState: (opts: { queryFn: () => Promise<unknown>; watch: boolean }) => {
    mocks.managedStateOptions = opts;
    mocks.managedState(opts);
    return mocks.queryState;
  },
}));

vi.mock("$modules/detailLink/services/detailLink", () => ({
  detailLinkService: {
    fetchLinkDetailV3: mocks.fetchLinkDetailV3,
  },
}));

vi.mock("$modules/auth/state/auth.svelte", () => ({
  authState: authStateMock,
}));

vi.mock("$modules/actionTemplate/services/actionTemplateLoader", () => ({
  actionTemplateLoader: {
    createActionFromTemplate: mocks.createActionFromTemplate,
  },
}));

vi.mock("$modules/links/types/link/link", () => ({
  LinkMapper: {
    fromSharedLink: mocks.fromSharedLink,
  },
}));

vi.mock("$modules/links/types/action/action", () => ({
  ActionMapper: {
    fromSharedAction: mocks.fromSharedAction,
  },
}));

vi.mock("$modules/links/services/cashierBackend", () => ({
  cashierBackendService: {
    disableLinkV3: mocks.disableLinkV3,
  },
}));

const CREATOR = Principal.fromText("aaaaa-aa");
const USER = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");

function makeSharedLink(linkState: string): SharedLink {
  return {
    id: "link-1",
    creator: CREATOR,
    title: "Test Link",
    link_type: SharedLinkType.SendTip,
    asset_info: [],
    max_use: 1n,
    use_count: 0n,
    link_state: linkState as SharedLink["link_state"],
  };
}

function makeSharedAction(actionType: string): SharedAction {
  return {
    id: "action-1",
    creator: CREATOR,
    creator_address_type: SharedAddressType.Creator,
    action_type: actionType as SharedAction["action_type"],
    intents: [],
    action_state: SharedActionState.Created,
  };
}

describe("LinkDetailStoreV3", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.queryState.data = undefined;
    authStateMock.isLoggedIn = true;
    authStateMock.account = { owner: CREATOR.toText() };
  });

  describe("constructor", () => {
    it("it_should_succeed_do_initialize_query_with_watch_enabled", () => {
      const store = new LinkDetailStoreV3({ id: "link-1" });
      expect(store.id).toBe("link-1");
      expect(mocks.managedState).toHaveBeenCalledTimes(1);
      expect(mocks.managedStateOptions?.watch).toBe(true);
    });

    it("it_should_succeed_do_query_fn_fetch_link_detail_with_authenticated_mode", async () => {
      new LinkDetailStoreV3({ id: "link-1" });
      const payload = { link: makeSharedLink(SharedLinkState.Active) };
      mocks.fetchLinkDetailV3.mockResolvedValueOnce(Ok(payload));

      const result = await mocks.managedStateOptions!.queryFn();

      expect(mocks.fetchLinkDetailV3).toHaveBeenCalledWith({
        id: "link-1",
        anonymous: false,
      });
      expect(result).toBe(payload);
    });

    it("it_should_succeed_do_query_fn_fetch_link_detail_with_anonymous_mode_when_logged_out", async () => {
      authStateMock.isLoggedIn = false;
      new LinkDetailStoreV3({ id: "link-2" });
      mocks.fetchLinkDetailV3.mockResolvedValueOnce(
        Ok({ link: makeSharedLink(SharedLinkState.Active) }),
      );

      await mocks.managedStateOptions!.queryFn();

      expect(mocks.fetchLinkDetailV3).toHaveBeenCalledWith({
        id: "link-2",
        anonymous: true,
      });
    });

    it("it_should_fail_do_query_fn_due_to_fetch_error", async () => {
      new LinkDetailStoreV3({ id: "link-1" });
      const error = new Error("fetch failed");
      mocks.fetchLinkDetailV3.mockResolvedValueOnce(Err(error));

      await expect(mocks.managedStateOptions!.queryFn()).rejects.toThrow(
        "fetch failed",
      );
    });
  });

  describe("getters", () => {
    it("it_should_succeed_do_get_query", () => {
      const store = new LinkDetailStoreV3({ id: "link-1" });
      expect(store.query).toBe(mocks.queryState);
    });

    it("it_should_succeed_do_return_undefined_link_when_missing", () => {
      const store = new LinkDetailStoreV3({ id: "link-1" });
      mocks.queryState.data = undefined;
      expect(store.link).toBeUndefined();
    });

    it("it_should_succeed_do_map_link_from_shared_link", () => {
      const mappedLink = { id: "mapped-link" };
      mocks.fromSharedLink.mockReturnValueOnce(mappedLink);
      const store = new LinkDetailStoreV3({ id: "link-1" });
      const sharedLink = makeSharedLink(SharedLinkState.Active);
      mocks.queryState.data = { link: sharedLink };

      expect(store.link).toBe(mappedLink);
      expect(mocks.fromSharedLink).toHaveBeenCalledWith(sharedLink);
    });

    it("it_should_succeed_do_return_shared_link_and_backend_action_and_icrc112_requests", () => {
      const store = new LinkDetailStoreV3({ id: "link-1" });
      const sharedLink = makeSharedLink(SharedLinkState.Active);
      const backendAction = makeSharedAction(SharedActionType.Receive);
      const icrc112Requests = [[{ id: "req-1" }]];
      mocks.queryState.data = {
        link: sharedLink,
        actions: [backendAction],
        icrc112_requests: icrc112Requests,
      };

      expect(store.sharedLink).toBe(sharedLink);
      expect(store.backendAction).toBe(backendAction);
      expect(store.icrc112Requests).toBe(icrc112Requests);
    });

    it("it_should_succeed_do_return_undefined_action_when_backend_action_missing", () => {
      const store = new LinkDetailStoreV3({ id: "link-1" });
      mocks.queryState.data = { link: makeSharedLink(SharedLinkState.Active) };
      expect(store.action).toBeUndefined();
    });

    it("it_should_succeed_do_map_action_from_shared_action", () => {
      const mappedAction = { id: "mapped-action" };
      mocks.fromSharedAction.mockReturnValueOnce(mappedAction);
      const store = new LinkDetailStoreV3({ id: "link-1" });
      const backendAction = makeSharedAction(SharedActionType.Receive);
      const icrc112Requests = [[{ id: "req-1" }]];
      mocks.queryState.data = {
        link: makeSharedLink(SharedLinkState.Active),
        actions: [backendAction],
        icrc112_requests: icrc112Requests,
      };

      expect(store.action).toBe(mappedAction);
      expect(mocks.fromSharedAction).toHaveBeenCalledWith(
        backendAction,
        icrc112Requests,
      );
    });

    it("it_should_return_all_actions_and_only_the_pending_one_as_action_when_multiple_claims_exist", () => {
      const store = new LinkDetailStoreV3({ id: "link-1" });
      const completedAction = {
        ...makeSharedAction(SharedActionType.Receive),
        id: "action-completed",
        action_state: SharedActionState.Success,
      };
      const pendingAction = {
        ...makeSharedAction(SharedActionType.Receive),
        id: "action-pending",
        action_state: SharedActionState.Created,
      };
      mocks.queryState.data = {
        link: makeSharedLink(SharedLinkState.Active),
        actions: [completedAction, pendingAction],
        icrc112_requests: undefined,
      };

      expect(store.actions).toEqual([completedAction, pendingAction]);
      expect(store.pendingBackendAction).toBe(pendingAction);
      void store.action;
      expect(mocks.fromSharedAction).toHaveBeenCalledWith(
        pendingAction,
        undefined,
      );
    });

    it("it_should_return_undefined_pending_action_when_all_claims_are_completed", () => {
      const store = new LinkDetailStoreV3({ id: "link-1" });
      const completedAction = {
        ...makeSharedAction(SharedActionType.Receive),
        action_state: SharedActionState.Success,
      };
      mocks.queryState.data = {
        link: makeSharedLink(SharedLinkState.Active),
        actions: [completedAction],
      };

      expect(store.pendingBackendAction).toBeUndefined();
      expect(store.action).toBeUndefined();
      expect(store.completedActions).toHaveLength(1);
    });
  });

  describe("getDraftingAction", () => {
    it("it_should_fail_do_get_drafting_action_due_to_missing_user_or_link", () => {
      authStateMock.account = null;
      const store = new LinkDetailStoreV3({ id: "link-1" });
      mocks.queryState.data = undefined;

      const result = store.getDraftingAction(SharedActionType.Withdraw);

      expect(result.isErr()).toBe(true);
      expect(result.isErr() && result.error.message).toBe(
        "User must be authenticated to create action",
      );
    });

    it("it_should_fail_do_get_drafting_action_due_to_template_loader_error", () => {
      const store = new LinkDetailStoreV3({ id: "link-1" });
      mocks.queryState.data = {
        link: makeSharedLink(SharedLinkState.Inactive),
      };
      mocks.createActionFromTemplate.mockReturnValueOnce(
        Err(new Error("template missing")),
      );

      const result = store.getDraftingAction(SharedActionType.Withdraw);

      expect(result.isErr()).toBe(true);
      expect(result.isErr() && result.error.message).toContain(
        "Failed to create withdraw action from template",
      );
    });

    it("it_should_succeed_do_get_drafting_action", () => {
      const expectedAction = makeSharedAction(SharedActionType.Withdraw);
      const store = new LinkDetailStoreV3({ id: "link-1" });
      const sharedLink = makeSharedLink(SharedLinkState.Inactive);
      mocks.queryState.data = { link: sharedLink };
      authStateMock.account = { owner: USER.toText() };
      mocks.createActionFromTemplate.mockReturnValueOnce(Ok(expectedAction));

      const result = store.getDraftingAction(SharedActionType.Withdraw);

      expect(mocks.createActionFromTemplate).toHaveBeenCalledWith(
        sharedLink.link_type,
        SharedActionType.Withdraw,
        USER,
      );
      expect(result.isOk()).toBe(true);
      expect(result.isOk() && result.value).toBe(expectedAction);
    });
  });

  describe("state", () => {
    it("it_should_fail_do_get_state_due_to_missing_link", () => {
      const store = new LinkDetailStoreV3({ id: "link-1" });
      mocks.queryState.data = undefined;
      expect(() => store.state).toThrow("Link is missing");
    });

    it("it_should_fail_do_get_state_due_to_unhandled_creation_state", () => {
      const store = new LinkDetailStoreV3({ id: "link-1" });
      mocks.queryState.data = {
        link: makeSharedLink(SharedLinkState.ChooseType),
      };
      expect(() => store.state).toThrow(
        "Link in state ChooseType should not be handled in LinkDetailStoreV3",
      );
    });

    it("it_should_succeed_do_get_created_state_handler", () => {
      const store = new LinkDetailStoreV3({ id: "link-1" });
      mocks.queryState.data = { link: makeSharedLink(SharedLinkState.Created) };
      expect(store.state).toBeInstanceOf(LinkCreatedStateV3);
    });

    it("it_should_succeed_do_get_active_state_handler", () => {
      const store = new LinkDetailStoreV3({ id: "link-1" });
      mocks.queryState.data = { link: makeSharedLink(SharedLinkState.Active) };
      expect(store.state).toBeInstanceOf(LinkActiveStateV3);
    });

    it("it_should_succeed_do_get_inactive_state_handler", () => {
      const store = new LinkDetailStoreV3({ id: "link-1" });
      mocks.queryState.data = {
        link: makeSharedLink(SharedLinkState.Inactive),
      };
      expect(store.state).toBeInstanceOf(LinkInactiveStateV3);
    });

    it("it_should_succeed_do_get_ended_state_handler", () => {
      const store = new LinkDetailStoreV3({ id: "link-1" });
      mocks.queryState.data = { link: makeSharedLink(SharedLinkState.Ended) };
      expect(store.state).toBeInstanceOf(LinkEndedStateV3);
    });
  });

  describe("createAction", () => {
    it("it_should_succeed_do_delegate_create_action_to_state_handler", async () => {
      const expected = { id: "create-result" };
      const spy = vi
        .spyOn(LinkActiveStateV3.prototype, "createAction")
        .mockResolvedValueOnce(expected as never);
      const store = new LinkDetailStoreV3({ id: "link-1" });
      mocks.queryState.data = { link: makeSharedLink(SharedLinkState.Active) };

      const result = await store.createAction(SharedActionType.Receive);

      expect(spy).toHaveBeenCalledWith(SharedActionType.Receive);
      expect(result).toBe(expected);
    });
  });

  describe("processAction", () => {
    it("it_should_succeed_do_delegate_process_action_to_state_handler", async () => {
      const expected = { id: "process-result" };
      const spy = vi
        .spyOn(LinkActiveStateV3.prototype, "processAction")
        .mockResolvedValueOnce(expected as never);
      const store = new LinkDetailStoreV3({ id: "link-1" });
      mocks.queryState.data = { link: makeSharedLink(SharedLinkState.Active) };

      const result = await store.processAction();

      expect(spy).toHaveBeenCalled();
      expect(result).toBe(expected);
    });
  });

  describe("disableLink", () => {
    it("it_should_fail_do_disable_link_due_to_missing_link", async () => {
      const store = new LinkDetailStoreV3({ id: "link-1" });
      mocks.queryState.data = undefined;
      await expect(store.disableLink()).rejects.toThrow("Link is missing");
    });

    it("it_should_fail_do_disable_link_due_to_link_not_active", async () => {
      const store = new LinkDetailStoreV3({ id: "link-1" });
      mocks.queryState.data = {
        link: makeSharedLink(SharedLinkState.Inactive),
      };
      await expect(store.disableLink()).rejects.toThrow(
        "Only active links can be disabled",
      );
    });

    it("it_should_fail_do_disable_link_due_to_backend_error", async () => {
      const store = new LinkDetailStoreV3({ id: "link-1" });
      mocks.queryState.data = { link: makeSharedLink(SharedLinkState.Active) };
      mocks.disableLinkV3.mockResolvedValueOnce(Err("backend error"));

      await expect(store.disableLink()).rejects.toThrow(
        "Failed to active link: backend error",
      );
    });

    it("it_should_succeed_do_disable_link", async () => {
      const store = new LinkDetailStoreV3({ id: "link-1" });
      mocks.queryState.data = { link: makeSharedLink(SharedLinkState.Active) };
      mocks.disableLinkV3.mockResolvedValueOnce(Ok({}));

      await store.disableLink();

      expect(mocks.disableLinkV3).toHaveBeenCalledWith("link-1");
      expect(mocks.queryState.refreshAsync).toHaveBeenCalled();
    });
  });
});
