import { LinkCreationStoreV3 } from "$modules/creationLink/state/linkCreationStoreV3.svelte";
import { ChooseLinkTypeStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/chooseLinkType";
import { AddAssetStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/addAsset";
import type { DraftLink } from "$modules/creationLink/repositories/draftLinkRepository";
import { PreviewStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/preview";
import { LinkCreatedStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/created";
import { actionTemplateLoader } from "$modules/actionTemplate/services/actionTemplateLoader";
import { draftLinkService } from "$modules/creationLink/services/draftLink";
import { GateType } from "$modules/gating/types/gate";
import { walletStore } from "$modules/token/state/walletStore.svelte";
import { TokenStandard } from "$modules/token/types/tokenStandard";
import {
  ActionState,
  ActionType,
  AddressType,
  LinkState,
  LinkType,
  TokenStandard as SharedTokenStandard,
  type Action as SharedAction,
} from "$shared";
import { Principal } from "@icp-sdk/core/principal";
import { Err, Ok } from "ts-results-es";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("$lib/i18n", () => ({
  locale: { t: vi.fn((key: string) => key) },
}));

const mockAuthState = vi.hoisted(() => ({
  account: {
    owner: "xybay-d2owu-tceww-zgxi4-fez55-626yd-knfze-rzeei-k2raw-6bng2-bae",
  } as { owner: string } | undefined,
}));
vi.mock("$modules/auth/state/auth.svelte", () => ({
  authState: mockAuthState,
}));

vi.mock("$modules/actionTemplate/services/actionTemplateLoader", () => ({
  actionTemplateLoader: { createActionFromTemplate: vi.fn() },
}));

vi.mock("$modules/creationLink/services/draftLink", () => ({
  draftLinkService: { update: vi.fn(), create: vi.fn(), delete: vi.fn() },
}));

vi.mock("$modules/token/state/walletStore.svelte", () => ({
  walletStore: { findTokenByAddress: vi.fn() },
}));

vi.mock("$modules/links/services/cashierBackend", () => ({
  cashierBackendService: { createLinkV3: vi.fn() },
}));

vi.mock("$modules/creationLink/repositories/draftLinkRepository", () => ({
  draftLinkRepository: { delete: vi.fn() },
}));

// ── Fixtures ───────────────────────────────────────────────────────────────

const CREATOR_TEXT =
  "xybay-d2owu-tceww-zgxi4-fez55-626yd-knfze-rzeei-k2raw-6bng2-bae";
const CREATOR = Principal.fromText(CREATOR_TEXT);

function makeDraftLink(overrides?: Partial<DraftLink>): DraftLink {
  return {
    id: "test-id",
    title: "Test Link",
    link_type: LinkType.SendTip,
    link_state: LinkState.ChooseType,
    creator: CREATOR,
    asset_info: [],
    max_use: 1n,
    use_count: 0n,
    ...overrides,
  };
}

// Use a factory to avoid sharing mutable intent objects between tests
function makeMockActionFull(): SharedAction {
  return {
    id: "action-id",
    creator: CREATOR,
    creator_address_type: AddressType.Creator,
    action_type: ActionType.CreateLink,
    action_state: ActionState.Created,
    intents: [],
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("LinkCreationStoreV3", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState.account = { owner: CREATOR_TEXT };
    vi.mocked(actionTemplateLoader.createActionFromTemplate).mockReturnValue(
      Err(new Error("no template configured")),
    );
  });

  describe("constructor / getStateHandler", () => {
    it("it_should_succeed_initialize_with_choose_type_state_for_choose_type_link_state", () => {
      const store = new LinkCreationStoreV3(
        makeDraftLink({ link_state: LinkState.ChooseType }),
      );
      expect(store.state).toBeInstanceOf(ChooseLinkTypeStateV3);
    });

    it("it_should_succeed_initialize_with_add_asset_state_for_add_asset_link_state", () => {
      const store = new LinkCreationStoreV3(
        makeDraftLink({ link_state: LinkState.AddAsset }),
      );
      expect(store.state).toBeInstanceOf(AddAssetStateV3);
    });

    it("it_should_succeed_initialize_with_preview_state_for_preview_link_state", () => {
      const store = new LinkCreationStoreV3(
        makeDraftLink({ link_state: LinkState.Preview }),
      );
      expect(store.state).toBeInstanceOf(PreviewStateV3);
    });

    it("it_should_succeed_initialize_with_created_state_for_created_link_state", () => {
      const store = new LinkCreationStoreV3(
        makeDraftLink({ link_state: LinkState.Created }),
      );
      expect(store.state).toBeInstanceOf(LinkCreatedStateV3);
    });

    it("it_should_succeed_initialize_with_choose_type_state_as_default_fallback", () => {
      const store = new LinkCreationStoreV3(
        makeDraftLink({
          link_state: "UnknownState" as typeof LinkState.ChooseType,
        }),
      );
      expect(store.state).toBeInstanceOf(ChooseLinkTypeStateV3);
    });

    it("it_should_succeed_set_draft_link_from_constructor_argument", () => {
      const draftLink = makeDraftLink({
        title: "My link",
        link_type: LinkType.SendAirdrop,
      });
      const store = new LinkCreationStoreV3(draftLink);
      expect(store.draftLink.title).toBe("My link");
      expect(store.draftLink.link_type).toBe(LinkType.SendAirdrop);
    });

    it("it_should_succeed_set_id_from_draft_link", () => {
      const store = new LinkCreationStoreV3(makeDraftLink({ id: "my-id" }));
      expect(store.id).toBe("my-id");
    });
  });

  describe("linkType", () => {
    it("it_should_succeed_return_send_tip_link_type", () => {
      const store = new LinkCreationStoreV3(
        makeDraftLink({ link_type: LinkType.SendTip }),
      );
      expect(store.linkType).toBe(LinkType.SendTip);
    });

    it("it_should_succeed_return_send_airdrop_link_type", () => {
      const store = new LinkCreationStoreV3(
        makeDraftLink({ link_type: LinkType.SendAirdrop }),
      );
      expect(store.linkType).toBe(LinkType.SendAirdrop);
    });

    it("it_should_succeed_return_send_token_basket_link_type", () => {
      const store = new LinkCreationStoreV3(
        makeDraftLink({ link_type: LinkType.SendTokenBasket }),
      );
      expect(store.linkType).toBe(LinkType.SendTokenBasket);
    });
  });

  describe("setAssets", () => {
    it("it_should_succeed_set_assets_with_icrc2_token_metadata", () => {
      vi.mocked(walletStore.findTokenByAddress).mockReturnValue(
        Ok({ fee: 10_000n, tokenStandards: [TokenStandard.ICRC2] } as never),
      );
      const store = new LinkCreationStoreV3(makeDraftLink());
      store.setAssets([{ address: "aaaaa-aa", useAmount: 500n }]);
      const assetInfo = store.draftLink.asset_info[0];
      expect(assetInfo.asset.network_fee).toBe(10_000n);
      expect(assetInfo.asset.token_standard).toBe(SharedTokenStandard.ICRC2);
      expect(assetInfo.amount).toBe(500n);
    });

    it("it_should_succeed_set_assets_with_icrc1_token_metadata", () => {
      vi.mocked(walletStore.findTokenByAddress).mockReturnValue(
        Ok({ fee: 5_000n, tokenStandards: [TokenStandard.ICRC1] } as never),
      );
      const store = new LinkCreationStoreV3(makeDraftLink());
      store.setAssets([{ address: "aaaaa-aa", useAmount: 200n }]);
      const assetInfo = store.draftLink.asset_info[0];
      expect(assetInfo.asset.network_fee).toBe(5_000n);
      expect(assetInfo.asset.token_standard).toBe(SharedTokenStandard.ICRC1);
    });

    it("it_should_succeed_set_assets_with_default_fee_and_icrc2_when_token_not_found", () => {
      vi.mocked(walletStore.findTokenByAddress).mockReturnValue(
        Err(new Error("token not found")),
      );
      const store = new LinkCreationStoreV3(makeDraftLink());
      store.setAssets([{ address: "aaaaa-aa", useAmount: 100n }]);
      const assetInfo = store.draftLink.asset_info[0];
      expect(assetInfo.asset.network_fee).toBe(0n);
      expect(assetInfo.asset.token_standard).toBe(SharedTokenStandard.ICRC2);
    });

    it("it_should_succeed_set_empty_asset_info_for_empty_assets_list", () => {
      const store = new LinkCreationStoreV3(makeDraftLink());
      store.setAssets([]);
      expect(store.draftLink.asset_info).toHaveLength(0);
    });

    it("it_should_succeed_set_multiple_assets_for_token_basket", () => {
      vi.mocked(walletStore.findTokenByAddress).mockReturnValue(
        Ok({ fee: 10_000n, tokenStandards: [TokenStandard.ICRC2] } as never),
      );
      const store = new LinkCreationStoreV3(
        makeDraftLink({ link_type: LinkType.SendTokenBasket }),
      );
      store.setAssets([
        { address: "aaaaa-aa", useAmount: 100n },
        { address: "ryjl3-tyaaa-aaaaa-aaaba-cai", useAmount: 200n },
      ]);
      expect(store.draftLink.asset_info).toHaveLength(2);
    });
  });

  describe("initializeCreateLinkActionFromTemplate", () => {
    it("it_should_fail_initialize_action_due_to_unauthenticated_user", () => {
      mockAuthState.account = undefined;
      const store = new LinkCreationStoreV3(makeDraftLink());
      const result = store.initializeCreateLinkActionFromTemplate();
      expect(result.isErr()).toBe(true);
      expect(result.isErr() && result.error.message).toContain(
        "User must be authenticated to initialize action from template",
      );
    });

    it("it_should_fail_initialize_action_due_to_action_template_loader_failure", () => {
      vi.mocked(actionTemplateLoader.createActionFromTemplate).mockReturnValue(
        Err(new Error("template not found")),
      );
      const store = new LinkCreationStoreV3(makeDraftLink());
      const result = store.initializeCreateLinkActionFromTemplate();
      expect(result.isErr()).toBe(true);
      expect(result.isErr() && result.error.message).toContain(
        "Failed to load action from template",
      );
    });

    it("it_should_succeed_initialize_action_and_set_draft_action", () => {
      vi.mocked(actionTemplateLoader.createActionFromTemplate).mockReturnValue(
        Ok(makeMockActionFull()),
      );
      const store = new LinkCreationStoreV3(makeDraftLink());
      const result = store.initializeCreateLinkActionFromTemplate();
      expect(result.isOk()).toBe(true);
      expect(store.draftAction).toBeDefined();
    });

    it("it_should_succeed_initialize_action_with_selected_assets_passed_to_loader", () => {
      vi.mocked(actionTemplateLoader.createActionFromTemplate).mockReturnValue(
        Ok(makeMockActionFull()),
      );
      const assetPrincipal = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");
      const assetInfo = [
        {
          asset: {
            address: assetPrincipal,
            network_fee: 500n,
            token_standard: SharedTokenStandard.ICRC1,
          },
          amount: 999n,
          label: "test",
        },
      ];
      const store = new LinkCreationStoreV3(
        makeDraftLink({
          asset_info: assetInfo,
          max_use: 3n,
        }),
      );
      const result = store.initializeCreateLinkActionFromTemplate();
      expect(result.isOk()).toBe(true);
      expect(
        actionTemplateLoader.createActionFromTemplate,
      ).toHaveBeenCalledWith(
        LinkType.SendTip,
        ActionType.CreateLink,
        expect.any(Principal),
        {
          assetInfo,
          gateCount: 0,
          maxUse: 3,
        },
      );
      const creatorArg = vi.mocked(
        actionTemplateLoader.createActionFromTemplate,
      ).mock.calls[0][2];
      expect(creatorArg.toText()).toBe(CREATOR_TEXT);
    });

    it("it_should_succeed_initialize_action_with_gate_context_passed_to_loader", () => {
      vi.mocked(actionTemplateLoader.createActionFromTemplate).mockReturnValue(
        Ok(makeMockActionFull()),
      );
      const store = new LinkCreationStoreV3(
        makeDraftLink({
          max_use: 5n,
        }),
      );
      store.pendingGateDraft = {
        type: GateType.PASSWORD,
        password: "secret",
      };

      const result = store.initializeCreateLinkActionFromTemplate();
      expect(result.isOk()).toBe(true);
      expect(
        actionTemplateLoader.createActionFromTemplate,
      ).toHaveBeenCalledWith(
        LinkType.SendTip,
        ActionType.CreateLink,
        expect.any(Principal),
        {
          assetInfo: [],
          gateCount: 1,
          maxUse: 5,
        },
      );
    });
  });

  describe("syncDraftLinkToStorage", () => {
    it("it_should_succeed_skip_sync_when_state_is_created", () => {
      const store = new LinkCreationStoreV3(
        makeDraftLink({ link_state: LinkState.Created }),
      );
      store.syncDraftLinkToStorage();
      expect(draftLinkService.update).not.toHaveBeenCalled();
    });

    it("it_should_succeed_skip_sync_when_no_store_id", () => {
      const store = new LinkCreationStoreV3(makeDraftLink({ id: "" }));
      store.syncDraftLinkToStorage();
      expect(draftLinkService.update).not.toHaveBeenCalled();
    });

    it("it_should_succeed_skip_sync_when_no_auth_account", () => {
      mockAuthState.account = undefined;
      const store = new LinkCreationStoreV3(makeDraftLink({ id: "test-id" }));
      store.syncDraftLinkToStorage();
      expect(draftLinkService.update).not.toHaveBeenCalled();
    });

    it("it_should_succeed_call_draft_link_service_update_with_correct_data", () => {
      const store = new LinkCreationStoreV3(
        makeDraftLink({
          id: "test-id",
          title: "My link",
          link_type: LinkType.SendTip,
        }),
      );
      store.syncDraftLinkToStorage();
      expect(draftLinkService.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "test-id",
          updateData: expect.objectContaining({
            title: "My link",
            linkType: LinkType.SendTip,
            state: LinkState.ChooseType,
          }),
          owner: CREATOR_TEXT,
        }),
      );
    });

    it("it_should_succeed_sync_with_add_asset_state", () => {
      const store = new LinkCreationStoreV3(
        makeDraftLink({ id: "test-id", link_state: LinkState.AddAsset }),
      );
      store.syncDraftLinkToStorage();
      expect(draftLinkService.update).toHaveBeenCalledWith(
        expect.objectContaining({
          updateData: expect.objectContaining({ state: LinkState.AddAsset }),
        }),
      );
    });

    it("it_should_succeed_sync_with_preview_state", () => {
      const store = new LinkCreationStoreV3(
        makeDraftLink({ id: "test-id", link_state: LinkState.Preview }),
      );
      store.syncDraftLinkToStorage();
      expect(draftLinkService.update).toHaveBeenCalledWith(
        expect.objectContaining({
          updateData: expect.objectContaining({ state: LinkState.Preview }),
        }),
      );
    });
  });
});
