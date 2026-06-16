import { AddAssetStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/addAsset";
import { LockStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/lock";
import { PreviewStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/preview";
import { LinkCreatedStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/created";
import type { LinkCreationStoreV3 } from "$modules/creationLink/state/linkCreationStoreV3.svelte";
import type { CreateLinkResponseV3 } from "$modules/creationLink/types/dto/create_link_v3";
import { cashierBackendService } from "$modules/links/services/cashierBackend";
import { LinkStep } from "$modules/links/types/linkStep";
import {
  ActionState,
  ActionType,
  AddressType,
  LinkState,
  LinkType,
  type Action as SharedAction,
  type Link as SharedLink,
} from "$shared";
import { Principal } from "@icp-sdk/core/principal";
import { Err, Ok } from "ts-results-es";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$lib/i18n", () => ({
  locale: { t: vi.fn((key: string) => key) },
}));

vi.mock("$modules/creationLink/state/linkCreationStatesV3/addAsset", () => ({
  AddAssetStateV3: class AddAssetStateV3 {
    readonly step = LinkStep.ADD_ASSET;
    constructor() {}
  },
}));

vi.mock("$modules/auth/state/auth.svelte", () => ({
  authState: {
    account: { owner: "test-owner-principal" },
    buildAnonymousAgent: vi.fn(() => ({})),
  },
}));

vi.mock("$modules/creationLink/repositories/draftLinkRepository", () => ({
  draftLinkRepository: { delete: vi.fn(), create: vi.fn(), update: vi.fn() },
}));

vi.mock("$modules/creationLink/repositories/draftGateRepository", () => ({
  draftGateRepository: { delete: vi.fn() },
}));

vi.mock("$modules/links/services/cashierBackend", () => ({
  cashierBackendService: {
    createLinkV3: vi.fn(),
  },
}));

const VALID_PRINCIPAL = Principal.fromText("aaaaa-aa");

const MOCK_DRAFT_LINK: SharedLink = {
  id: "draft-link-id",
  title: "My link",
  link_type: LinkType.SendTip,
  link_state: LinkState.Preview,
  creator: VALID_PRINCIPAL,
  asset_info: [],
  max_use: 1n,
  use_count: 0n,
};

const MOCK_ACTION: SharedAction = {
  id: "action-id",
  creator: VALID_PRINCIPAL,
  creator_address_type: AddressType.Creator,
  action_type: ActionType.CreateLink,
  action_state: ActionState.Created,
  intents: [],
};

const MOCK_BACKEND_LINK: SharedLink = {
  ...MOCK_DRAFT_LINK,
  id: "backend-link-id",
  link_state: LinkState.Active,
};

const MOCK_CREATE_RESPONSE: CreateLinkResponseV3 = {
  link: MOCK_BACKEND_LINK,
  action: MOCK_ACTION,
  gates: [],
};

function makeStore(options?: {
  draftLinkUndefined?: boolean;
  initActionResult?: "ok" | "err";
  setDraftActionOnInit?: boolean;
  storeId?: string | null;
  linkType?: LinkType;
}): LinkCreationStoreV3 {
  const {
    draftLinkUndefined,
    initActionResult = "ok",
    setDraftActionOnInit = true,
    storeId = "store-id",
    linkType = LinkType.SendTip,
  } = options ?? {};

  const store: Record<string, unknown> = {
    draftLink: draftLinkUndefined
      ? undefined
      : { ...MOCK_DRAFT_LINK, link_type: linkType },
    draftAction: undefined as SharedAction | undefined,
    id: storeId ?? undefined,
    state: undefined,
    backendLink: undefined,
    backendAction: undefined,
    pendingGateDraft: null,
    initializeCreateLinkActionFromTemplate: vi.fn(() => {
      if (initActionResult === "err") {
        return Err(new Error("template init failed"));
      }
      if (setDraftActionOnInit) {
        store.draftAction = MOCK_ACTION;
      }
      return Ok(true);
    }),
  };
  return store as unknown as LinkCreationStoreV3;
}

describe("PreviewStateV3", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cashierBackendService.createLinkV3).mockResolvedValue(
      Ok(MOCK_CREATE_RESPONSE),
    );
  });

  describe("step", () => {
    it("it_should_succeed_have_preview_step", () => {
      const store = makeStore();
      const state = new PreviewStateV3(store);
      expect(state.step).toBe(LinkStep.PREVIEW);
    });
  });

  describe("constructor", () => {
    it("it_should_initialize_draft_action_on_construction", () => {
      const store = makeStore();
      new PreviewStateV3(store);
      expect(
        store.initializeCreateLinkActionFromTemplate,
      ).toHaveBeenCalledTimes(1);
      expect(store.draftAction).toEqual(MOCK_ACTION);
    });

    it("it_should_succeed_construction_when_init_action_fails", () => {
      const store = makeStore({ initActionResult: "err" });
      expect(() => new PreviewStateV3(store)).not.toThrow();
    });
  });

  describe("goNext", () => {
    it("it_should_fail_go_next_due_to_undefined_draft_link", async () => {
      const store = makeStore({ draftLinkUndefined: true });
      const state = new PreviewStateV3(store);
      await expect(state.goNext()).rejects.toThrow(
        "Link must be initialized to create",
      );
    });

    it("it_should_fail_go_next_due_to_initialize_action_failure", async () => {
      // initActionResult: "err" means every call fails (constructor + goNext)
      const store = makeStore({
        initActionResult: "err",
        setDraftActionOnInit: false,
      });
      const state = new PreviewStateV3(store);
      await expect(state.goNext()).rejects.toThrow(
        "Failed to initialize action from template: template init failed",
      );
    });

    it("it_should_fail_go_next_due_to_undefined_draft_action_after_initialization", async () => {
      const store = makeStore({ setDraftActionOnInit: false });
      const state = new PreviewStateV3(store);
      await expect(state.goNext()).rejects.toThrow(
        "Action must be initialized to create link",
      );
    });

    it("it_should_fail_go_next_due_to_backend_create_link_failure", async () => {
      vi.mocked(cashierBackendService.createLinkV3).mockResolvedValue(
        Err(new Error("backend error")),
      );
      const store = makeStore();
      const state = new PreviewStateV3(store);
      await expect(state.goNext()).rejects.toThrow(
        "Link creation failed: backend error",
      );
    });

    it("it_should_succeed_go_next_transition_to_created_state_for_send_tip", async () => {
      const store = makeStore({ linkType: LinkType.SendTip });
      const state = new PreviewStateV3(store);
      await state.goNext();
      expect(store.state).toBeInstanceOf(LinkCreatedStateV3);
    });

    it("it_should_succeed_go_next_transition_to_created_state_for_send_airdrop", async () => {
      const store = makeStore({ linkType: LinkType.SendAirdrop });
      const state = new PreviewStateV3(store);
      await state.goNext();
      expect(store.state).toBeInstanceOf(LinkCreatedStateV3);
    });

    it("it_should_succeed_go_next_transition_to_created_state_for_send_token_basket", async () => {
      const store = makeStore({ linkType: LinkType.SendTokenBasket });
      const state = new PreviewStateV3(store);
      await state.goNext();
      expect(store.state).toBeInstanceOf(LinkCreatedStateV3);
    });

    it("it_should_succeed_go_next_set_backend_link", async () => {
      const store = makeStore();
      const state = new PreviewStateV3(store);
      await state.goNext();
      expect(store.backendLink).toEqual(MOCK_BACKEND_LINK);
    });

    it("it_should_succeed_go_next_set_backend_action", async () => {
      const store = makeStore();
      const state = new PreviewStateV3(store);
      await state.goNext();
      expect(store.backendAction).toEqual(MOCK_ACTION);
    });

    it("it_should_succeed_go_next_set_link_backend_id_from_backend_link", async () => {
      const store = makeStore();
      const state = new PreviewStateV3(store);
      await state.goNext();
      expect(store.id).toBe(MOCK_BACKEND_LINK.id);
    });

    it("it_should_succeed_go_next_delete_draft_link_from_storage", async () => {
      const { draftLinkRepository } =
        await import("$modules/creationLink/repositories/draftLinkRepository");
      const { draftGateRepository } =
        await import("$modules/creationLink/repositories/draftGateRepository");
      const store = makeStore({ storeId: "test-store-id" });
      const state = new PreviewStateV3(store);
      await state.goNext();
      expect(draftLinkRepository.delete).toHaveBeenCalledWith(
        "test-store-id",
        "test-owner-principal",
      );
      expect(draftGateRepository.delete).toHaveBeenCalledWith(
        "test-owner-principal",
        "test-store-id",
      );
    });

    it("it_should_succeed_go_next_not_delete_from_storage_when_no_link_backend_id", async () => {
      const { draftLinkRepository } =
        await import("$modules/creationLink/repositories/draftLinkRepository");
      const { draftGateRepository } =
        await import("$modules/creationLink/repositories/draftGateRepository");
      const store = makeStore({ storeId: null });
      const state = new PreviewStateV3(store);
      await state.goNext();
      expect(draftLinkRepository.delete).not.toHaveBeenCalled();
      expect(draftGateRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe("goBack", () => {
    it("it_should_succeed_go_back_for_send_tip_link_type", async () => {
      const store = makeStore({ linkType: LinkType.SendTip });
      const state = new PreviewStateV3(store);
      await state.goBack();
      expect(store.state).toBeInstanceOf(LockStateV3);
    });

    it("it_should_succeed_go_back_for_send_airdrop_link_type", async () => {
      const store = makeStore({ linkType: LinkType.SendAirdrop });
      const state = new PreviewStateV3(store);
      await state.goBack();
      expect(store.state).toBeInstanceOf(LockStateV3);
    });

    it("it_should_succeed_go_back_for_send_token_basket_link_type", async () => {
      const store = makeStore({ linkType: LinkType.SendTokenBasket });
      const state = new PreviewStateV3(store);
      await state.goBack();
      expect(store.state).toBeInstanceOf(LockStateV3);
    });

    it("it_should_succeed_go_back_transition_to_lock_step", async () => {
      const store = makeStore();
      const state = new PreviewStateV3(store);
      await state.goBack();
      expect((store.state as LockStateV3).step).toBe(LinkStep.LOCK);
    });
  });
});
