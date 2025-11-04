import { describe, it, expect, vi, beforeEach } from "vitest";
import { LinkInactiveState } from "./inactive";
import type { LinkDetailStore } from "../linkDetailStore.svelte";
import { Ed25519KeyIdentity } from "@dfinity/identity";
import Action from "$modules/links/types/action/action";
import type { Link } from "$modules/links/types/link/link";
import { LinkType } from "$modules/links/types/link/linkType";
import { LinkState } from "$modules/links/types/link/linkState";
import { ActionType } from "$modules/links/types/action/actionType";
import { Err, Ok } from "ts-results-es";

const mocks = vi.hoisted(() => {
  const createActionV2 = vi.fn();
  const processActionV2 = vi.fn();

  return {
    cashierBackendService: {
      createActionV2,
      processActionV2,
    },
    linkListStore: {
      refresh: vi.fn(),
    },
    createActionV2,
    processActionV2,
  };
});

vi.mock("$modules/links/services/cashierBackend", () => ({
  cashierBackendService: mocks.cashierBackendService,
}));

vi.mock("../linkListStore.svelte", () => ({
  linkListStore: mocks.linkListStore,
}));

vi.mock("$modules/auth/state/auth.svelte", () => ({
  authState: {
    isLoggedIn: true,
    buildActor: () => ({}),
  },
}));

vi.mock("$modules/links/types/action/action", () => ({
  ActionMapper: {
    fromBackendType: (a: Record<string, unknown>) => ({
      id: typeof a["id"] === "string" ? (a["id"] as string) : "mapped-act",
    }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const mockAction: Action = {
  id: "act-1",
  creator: Ed25519KeyIdentity.generate().getPrincipal(),
  type: { Withdraw: null } as unknown as Action["type"],
  state: { Success: null } as unknown as Action["state"],
  intents: [],
  icrc_112_requests: [],
};

const mockLink: Link = {
  id: "link-1",
  title: "Test Link",
  creator: Ed25519KeyIdentity.generate().getPrincipal(),
  asset_info: [],
  link_type: LinkType.TIP,
  create_at: BigInt(Date.now()),
  state: LinkState.CREATE_LINK,
  link_use_action_max_count: BigInt(1),
  link_use_action_counter: BigInt(0),
};

describe("LinkInactiveState", () => {
  describe("createAction", () => {
    it("should throw when link missing", async () => {
      // Arrange
      const store = { link: undefined } as LinkDetailStore;
      const state = new LinkInactiveState(store);

      // Act
      const res = state.createAction();

      // Assert
      await expect(res).rejects.toThrow("Link is missing");
    });

    it("should call backend and set action and refresh query", async () => {
      // Arrange
      const store = {
        link: mockLink,
        query: { refresh: vi.fn() },
      } as unknown as LinkDetailStore;
      const state = new LinkInactiveState(store);

      const backendActionDto = { id: "backend-act-1" };
      mocks.createActionV2.mockResolvedValueOnce(Ok(backendActionDto));

      // Act
      await state.createAction();

      // Assert
      expect(mocks.createActionV2).toHaveBeenCalledWith({
        linkId: mockLink.id,
        actionType: ActionType.WITHDRAW,
      });
      expect(store.action).toEqual({ id: backendActionDto.id });
      expect(store.query.refresh).toHaveBeenCalled();
    });
  });

  describe("processAction", () => {
    it("should throw when action id missing", async () => {
      // Arrange
      const store = { link: mockLink, action: undefined } as LinkDetailStore;
      const state = new LinkInactiveState(store);

      // Act
      const res = state.processAction();

      // Assert
      await expect(res).rejects.toThrow("Action ID is missing");
    });

    it("should throw when backend returns error", async () => {
      // Arrange
      const store = { link: mockLink, action: mockAction } as LinkDetailStore;
      const state = new LinkInactiveState(store);

      mocks.processActionV2.mockResolvedValueOnce(Err("Backend error"));

      // Act
      const res = state.processAction();

      // Assert
      await expect(res).rejects.toThrow(
        "Failed to activate link: Backend error",
      );
    });

    it("should call backend and refresh link list on success", async () => {
      // Arrange
      const store = { link: mockLink, action: mockAction } as LinkDetailStore;
      const state = new LinkInactiveState(store);

      mocks.processActionV2.mockResolvedValueOnce(Ok({}));

      // Act
      await state.processAction();

      // Assert
      expect(mocks.processActionV2).toHaveBeenCalledWith(mockAction.id);
      expect(mocks.linkListStore.refresh).toHaveBeenCalled();
    });
  });
});
