import { describe, it, expect, vi, beforeEach } from "vitest";
import { LinkCreatedState } from "./created";
import type { LinkDetailStore } from "../linkDetailStore.svelte";
import { Principal } from "@dfinity/principal";
import Action from "$modules/links/types/action/action";
import { Ed25519KeyIdentity } from "@dfinity/identity";
import { ActionType } from "$modules/links/types/action/actionType";
import { ActionState } from "$modules/links/types/action/actionState";
import type { Link } from "$modules/links/types/link/link";
import { LinkType } from "$modules/links/types/link/linkType";
import { LinkState } from "$modules/links/types/link/linkState";
import { LinkDetailStep } from "./linkStep";
import { Err, Ok } from "ts-results-es";

const mocks = vi.hoisted(() => {
  const user_process_action_v2Mock = vi.fn();
  const get_link_details_v2Mock = vi.fn();

  return {
    cashierBackendService: {
      processActionV2: vi.fn(),
    },
    linkListStore: {
      refresh: vi.fn(),
    },
    user_process_action_v2Mock,
    get_link_details_v2Mock,
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
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const mockAction: Action = {
  id: "act-1",
  creator: Ed25519KeyIdentity.generate().getPrincipal(),
  type: ActionType.CREATE_LINK,
  state: ActionState.CREATED,
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

describe("LinkCreatedState", () => {
  describe("createAction", () => {
    it("should reject with not supported error", async () => {
      // Arrange
      const store = {
        link: mockLink,
        action: mockAction,
      } as LinkDetailStore;
      const state = new LinkCreatedState(store);

      // Act
      const res = state.createAction();

      // Assert
      await expect(res).rejects.toThrow(
        "Created state does not support creating actions.",
      );
    });
  });

  describe("processAction", () => {
    it("should throw when link missing", async () => {
      // Arrange
      const store = {
        link: undefined,
        action: mockAction,
      } as LinkDetailStore;
      const state = new LinkCreatedState(store);

      // Act
      const res = state.processAction();

      // Assert
      await expect(res).rejects.toThrow("Link is missing");
    });

    it("should throw when action id missing", async () => {
      // Arrange
      const store = {
        link: mockLink,
        action: undefined,
      } as LinkDetailStore;
      const state = new LinkCreatedState(store);

      // Act
      const res = state.processAction();

      // Assert
      await expect(res).rejects.toThrow("Action ID is missing");
    });

    it("should throw when action type invalid", async () => {
      // Arrange
      const store = {
        link: mockLink,
        action: {
          ...mockAction,
          type: ActionType.RECEIVE,
        },
      } as LinkDetailStore;
      const state = new LinkCreatedState(store);

      // Act
      const res = state.processAction();

      // Assert
      await expect(res).rejects.toThrow(
        "Invalid action type for Created state",
      );
    });

    it("should throw error when action type is not CREATE_LINK", async () => {
      // Arrange
      const store = {
        link: mockLink,
        action: {
          ...mockAction,
          type: ActionType.WITHDRAW,
        },
      } as LinkDetailStore;
      const state = new LinkCreatedState(store);

      // Act
      const res = state.processAction();

      // Assert
      await expect(res).rejects.toThrow(
        "Invalid action type for Created state",
      );
    });

    it("should throw when backend returns error", async () => {
      // Arrange
      const store = {
        link: mockLink,
        action: mockAction,
      } as LinkDetailStore;
      const state = new LinkCreatedState(store);
      mocks.cashierBackendService.processActionV2.mockResolvedValueOnce(
        Err("Backend error"),
      );

      // Act
      const res = state.processAction();

      // Assert
      await expect(res).rejects.toThrow("Failed to activate link");
    });

    it("should process action and transition to active state", async () => {
      // Arrange
      const store = {
        link: mockLink,
        action: mockAction,
      } as LinkDetailStore;
      const state = new LinkCreatedState(store);
      // construct backend-shaped DTOs matching what the mappers expect
      const backendLinkDto = {
        id: mockLink.id,
        title: mockLink.title,
        creator: mockLink.creator,
        asset_info: [
          {
            asset: {
              IC: {
                address: Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai"),
              },
            },
            amount_per_link_use_action: 10n,
            label: "ICP",
          },
        ],
        link_type: { SendTip: null },
        create_at: mockLink.create_at,
        state: { Active: null },
        link_use_action_max_count: mockLink.link_use_action_max_count,
        link_use_action_counter: mockLink.link_use_action_counter,
      };
      const backendIntentDto = {
        id: "intent-1",
        chain: { IC: null },
        task: { TransferWalletToLink: null },
        type: {
          Transfer: {
            to: {
              IC: {
                address: Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai"),
                subaccount: [],
              },
            },
            asset: {
              IC: {
                address: Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai"),
              },
            },
            from: {
              IC: {
                address: Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai"),
                subaccount: [],
              },
            },
            amount: 100_000_000n,
          },
        },
        created_at: 0n,
        state: { Created: null },
        transactions: [],
      };
      const backendActionDto = {
        id: mockAction.id,
        icrc_112_requests: [],
        creator: mockAction.creator,
        intents: [backendIntentDto],
        type: { CreateLink: null },
        state: { Success: null },
      };
      mocks.cashierBackendService.processActionV2.mockResolvedValueOnce(
        Ok({
          link: backendLinkDto,
          action: backendActionDto,
        }),
      );

      // Act
      await state.processAction();

      // Assert
      expect(mocks.cashierBackendService.processActionV2).toHaveBeenCalledWith(
        mockAction.id,
      );
      expect(mocks.linkListStore.refresh).toHaveBeenCalled();
      expect(store.state?.step).toBe(LinkDetailStep.ACTIVE);
    });
  });
});
