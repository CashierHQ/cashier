import { ActionType } from "$modules/links/types/action/actionType";
import { UserLinkStep } from "$modules/links/types/userLinkStep";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserLinkStoreV3 } from "./userLinkStoreV3.svelte";

const mocks = vi.hoisted(() => ({
  LinkDetailStoreV3: vi.fn(),
  upsert: vi.fn(),
  getOne: vi.fn(),
  findUseActionTypeFromLinkType: vi.fn(),
}));

const authStateMock = vi.hoisted(() => ({
  account: { owner: "aaaaa-aa" } as { owner: string } | null,
  isLoggedIn: true,
}));

vi.mock("$modules/auth/state/auth.svelte", () => ({
  authState: authStateMock,
}));

vi.mock("$modules/detailLink/state/linkDetailStoreV3.svelte", () => ({
  LinkDetailStoreV3: mocks.LinkDetailStoreV3,
}));

vi.mock("../repositories/userLinkRepository", () => ({
  userLinkRepository: {
    upsert: mocks.upsert,
    getOne: mocks.getOne,
  },
}));

vi.mock("../utils/useActionTypeFromLinkType", () => ({
  findUseActionTypeFromLinkType: mocks.findUseActionTypeFromLinkType,
}));

function makeDetailStore(overrides?: Record<string, unknown>) {
  return {
    id: "link-1",
    link: undefined,
    action: undefined,
    query: {
      isLoading: false,
      refreshAsync: vi.fn().mockResolvedValue(undefined),
      data: undefined,
    },
    ...overrides,
  };
}

describe("UserLinkStoreV3", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStateMock.account = { owner: "aaaaa-aa" };
    authStateMock.isLoggedIn = true;
    mocks.getOne.mockReturnValue(undefined);
    mocks.findUseActionTypeFromLinkType.mockReturnValue(ActionType.RECEIVE);
    mocks.LinkDetailStoreV3.mockImplementation(() => makeDetailStore());
  });

  describe("constructor", () => {
    it("it_should_succeed_do_initialize_link_detail_store_with_id", () => {
      const store = new UserLinkStoreV3({ id: "link-123" });

      expect(store.linkDetail).toBeDefined();
      expect(mocks.LinkDetailStoreV3).toHaveBeenCalledWith({ id: "link-123" });
      expect(store.step).toBe(UserLinkStep.LANDING);
    });
  });

  describe("restore persisted state", () => {
    it("it_should_succeed_restore_landing_step_from_persisted_zero_value", () => {
      mocks.getOne.mockReturnValue({
        linkId: "link-1",
        step: UserLinkStep.LANDING,
        updatedAt: 1,
      });

      const store = new UserLinkStoreV3({ id: "link-1" });

      expect(store.step).toBe(UserLinkStep.LANDING);
    });

    it("it_should_succeed_restore_address_unlocked_step_from_persisted_state", () => {
      mocks.getOne.mockReturnValue({
        linkId: "link-1",
        step: UserLinkStep.ADDRESS_UNLOCKED,
        updatedAt: 1,
      });

      const store = new UserLinkStoreV3({ id: "link-1" });

      expect(store.step).toBe(UserLinkStep.ADDRESS_UNLOCKED);
    });
  });

  describe("syncUserLink", () => {
    it("it_should_fail_do_skip_sync_due_to_missing_owner", () => {
      authStateMock.account = null;
      const store = new UserLinkStoreV3({ id: "link-1" });

      store.syncUserLink();

      expect(mocks.upsert).not.toHaveBeenCalled();
    });

    it("it_should_fail_do_skip_sync_due_to_missing_link_id", () => {
      mocks.LinkDetailStoreV3.mockImplementation(() =>
        makeDetailStore({ id: "" }),
      );
      const store = new UserLinkStoreV3({ id: "link-1" });

      store.syncUserLink();

      expect(mocks.upsert).not.toHaveBeenCalled();
    });

    it("it_should_succeed_do_upsert_user_link_state", () => {
      const store = new UserLinkStoreV3({ id: "link-1" });

      store.syncUserLink();

      expect(mocks.upsert).toHaveBeenCalledWith({
        owner: "aaaaa-aa",
        linkId: "link-1",
        data: { linkId: "link-1", step: UserLinkStep.LANDING },
      });
    });
  });

  describe("state accessors", () => {
    it("it_should_succeed_do_set_and_get_state", () => {
      const store = new UserLinkStoreV3({ id: "link-1" });
      const mockState = {
        step: UserLinkStep.GATE,
        goNext: vi.fn(),
        goBack: vi.fn(),
        goToLanding: vi.fn(),
      };

      store.state = mockState as never;

      expect(store.state).toBe(mockState);
      expect(store.step).toBe(UserLinkStep.GATE);
    });
  });

  describe("convenience getters", () => {
    it("it_should_succeed_do_return_link_action_loading_and_query", () => {
      const detailStore = makeDetailStore({
        link: { id: "link-1", link_type: "TIP" },
        action: { id: "action-1", type: ActionType.RECEIVE },
        query: {
          isLoading: true,
          refreshAsync: vi.fn().mockResolvedValue(undefined),
          data: undefined,
        },
      });
      mocks.LinkDetailStoreV3.mockImplementation(() => detailStore);
      const store = new UserLinkStoreV3({ id: "link-1" });

      expect(store.link).toBe(detailStore.link);
      expect(store.action).toBe(detailStore.action);
      expect(store.isLoading).toBe(true);
      expect(store.query).toBe(detailStore.query);
    });

    it("it_should_succeed_do_refresh_async_from_query", async () => {
      const refreshAsync = vi.fn().mockResolvedValue(undefined);
      const detailStore = makeDetailStore({
        query: { isLoading: false, refreshAsync, data: undefined },
      });
      mocks.LinkDetailStoreV3.mockImplementation(() => detailStore);
      const store = new UserLinkStoreV3({ id: "link-1" });

      await store.refreshAsync();

      expect(refreshAsync).toHaveBeenCalled();
    });
  });

  describe("navigation delegation", () => {
    it("it_should_succeed_do_delegate_go_next_to_state", async () => {
      const goNext = vi.fn().mockResolvedValue(undefined);
      const store = new UserLinkStoreV3({ id: "link-1" });
      store.state = {
        step: UserLinkStep.LANDING,
        goNext,
        goBack: vi.fn(),
        goToLanding: vi.fn(),
      } as never;

      await store.goNext();

      expect(goNext).toHaveBeenCalled();
    });

    it("it_should_succeed_do_delegate_go_back_to_state", async () => {
      const goBack = vi.fn().mockResolvedValue(undefined);
      const store = new UserLinkStoreV3({ id: "link-1" });
      store.state = {
        step: UserLinkStep.GATE,
        goNext: vi.fn(),
        goBack,
        goToLanding: vi.fn(),
      } as never;

      await store.goBack();

      expect(goBack).toHaveBeenCalled();
    });

    it("it_should_succeed_do_delegate_go_to_landing_to_state", async () => {
      const goToLanding = vi.fn().mockResolvedValue(undefined);
      const store = new UserLinkStoreV3({ id: "link-1" });
      store.state = {
        step: UserLinkStep.ADDRESS_LOCKED,
        goNext: vi.fn(),
        goBack: vi.fn(),
        goToLanding,
      } as never;

      await store.goToLanding();

      expect(goToLanding).toHaveBeenCalled();
    });
  });

  describe("createAction", () => {
    it("it_should_fail_do_create_action_due_to_non_action_capable_state", async () => {
      const store = new UserLinkStoreV3({ id: "link-1" });
      store.state = {
        step: UserLinkStep.LANDING,
        goNext: vi.fn(),
        goBack: vi.fn(),
        goToLanding: vi.fn(),
      } as never;

      await expect(store.createAction(ActionType.RECEIVE)).rejects.toThrow(
        `Current state ${UserLinkStep.LANDING} does not support user actions`,
      );
    });

    it("it_should_succeed_do_delegate_create_action_to_state", async () => {
      const createAction = vi.fn().mockResolvedValue({ id: "created-action" });
      const store = new UserLinkStoreV3({ id: "link-1" });
      store.state = {
        step: UserLinkStep.ADDRESS_UNLOCKED,
        goNext: vi.fn(),
        goBack: vi.fn(),
        goToLanding: vi.fn(),
        createAction,
        processAction: vi.fn(),
      } as never;

      const result = await store.createAction(ActionType.RECEIVE);

      expect(createAction).toHaveBeenCalledWith(ActionType.RECEIVE);
      expect(result).toEqual({ id: "created-action" });
    });
  });

  describe("processAction", () => {
    it("it_should_fail_do_process_action_due_to_non_action_capable_state", async () => {
      const store = new UserLinkStoreV3({ id: "link-1" });
      store.state = {
        step: UserLinkStep.GATE,
        goNext: vi.fn(),
        goBack: vi.fn(),
        goToLanding: vi.fn(),
      } as never;

      await expect(store.processAction()).rejects.toThrow(
        `Current state ${UserLinkStep.GATE} does not support user actions`,
      );
    });

    it("it_should_succeed_do_delegate_process_action_to_state", async () => {
      const processAction = vi
        .fn()
        .mockResolvedValue({ id: "processed-action", is_success: true });
      const store = new UserLinkStoreV3({ id: "link-1" });
      store.state = {
        step: UserLinkStep.ADDRESS_UNLOCKED,
        goNext: vi.fn(),
        goBack: vi.fn(),
        goToLanding: vi.fn(),
        createAction: vi.fn(),
        processAction,
      } as never;

      const result = await store.processAction();

      expect(processAction).toHaveBeenCalled();
      expect(result).toEqual({ id: "processed-action", is_success: true });
    });
  });

  describe("findUseActionType", () => {
    it("it_should_fail_do_return_null_due_to_missing_link", () => {
      const store = new UserLinkStoreV3({ id: "link-1" });

      const result = store.findUseActionType();

      expect(result).toBeNull();
      expect(mocks.findUseActionTypeFromLinkType).not.toHaveBeenCalled();
    });

    it("it_should_succeed_do_resolve_action_type_from_link_type", () => {
      const detailStore = makeDetailStore({
        link: { id: "link-1", link_type: "TIP" },
      });
      mocks.LinkDetailStoreV3.mockImplementation(() => detailStore);
      mocks.findUseActionTypeFromLinkType.mockReturnValue(ActionType.RECEIVE);
      const store = new UserLinkStoreV3({ id: "link-1" });

      const result = store.findUseActionType();

      expect(mocks.findUseActionTypeFromLinkType).toHaveBeenCalledWith("TIP");
      expect(result).toBe(ActionType.RECEIVE);
    });
  });
});
