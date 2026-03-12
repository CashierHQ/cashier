import { LinkCreationStoreV3 } from "$modules/creationLink/state/linkCreationStoreV3.svelte";
import { ChooseLinkTypeStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/chooseLinkType";
import { AddAssetStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/addAsset";
import { PreviewStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/preview";
import { LinkCreatedStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/created";
import { actionTemplateLoader } from "$modules/actionTemplate/services/actionTemplateLoader";
import { draftLinkService } from "$modules/creationLink/services/draftLink";
import { walletStore } from "$modules/token/state/walletStore.svelte";
import { TokenStandard } from "$modules/token/types/tokenStandard";
import {
  ActionState,
  ActionType,
  AddressType,
  IntentState,
  IntentType,
  LinkState,
  LinkType,
  TokenStandard as SharedTokenStandard,
  type Action as SharedAction,
  type Intent,
  type Link as SharedLink,
} from "$shared";
import { Principal } from "@dfinity/principal";
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

vi.mock("$modules/shared/constants", () => ({
  CASHIER_BACKEND_CANISTER_ID: "aaaaa-aa",
  FEE_TREASURY_PRINCIPAL:
    "lx4gp-2tgox-deted-i72n3-az3f3-wjavu-kiems-ctavz-dgdxi-fhyqa-lae",
  LINK_CREATION_FEE: 10_000n,
}));

vi.mock("$modules/token/constants", () => ({
  ICP_LEDGER_CANISTER_ID: "ryjl3-tyaaa-aaaaa-aaaba-cai",
  ICP_LEDGER_FEE: 10_000n,
}));

vi.mock("$modules/links/services/cashierBackend", () => ({
  cashierBackendService: { createLinkV3: vi.fn() },
}));

vi.mock("$modules/creationLink/repositories/draftLinkRepository", () => ({
  draftLinkRepository: { delete: vi.fn() },
}));

vi.mock("$modules/creationLink/repositories/tempLinkRepository", () => ({
  tempLinkRepository: { delete: vi.fn() },
}));

// ── Fixtures ───────────────────────────────────────────────────────────────

const CREATOR_TEXT =
  "xybay-d2owu-tceww-zgxi4-fez55-626yd-knfze-rzeei-k2raw-6bng2-bae";
const CREATOR = Principal.fromText(CREATOR_TEXT);

function makeDraftLink(overrides?: Partial<SharedLink>): SharedLink {
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

function makeIntent(
  sourceType: (typeof AddressType)[keyof typeof AddressType],
  destType: (typeof AddressType)[keyof typeof AddressType],
  id: string,
): Intent {
  return {
    id,
    intent_type: IntentType.Send,
    asset: {
      address: CREATOR,
      network_fee: 100n,
      token_standard: SharedTokenStandard.ICRC2,
    },
    amount: 0n,
    source_address: CREATOR,
    source_address_type: sourceType,
    dest_address: CREATOR,
    dest_address_type: destType,
    dependencies: [],
    intent_state: IntentState.Created,
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
    intents: [
      makeIntent(AddressType.Creator, AddressType.Link, "asset-intent"),
      makeIntent(AddressType.Creator, AddressType.Treasury, "fee-intent"),
    ],
  };
}

const MOCK_ACTION_NO_INTENTS: SharedAction = {
  id: "action-id",
  creator: CREATOR,
  creator_address_type: AddressType.Creator,
  action_type: ActionType.CreateLink,
  action_state: ActionState.Created,
  intents: [],
};

const MOCK_ACTION_NO_TREASURY: SharedAction = {
  id: "action-id",
  creator: CREATOR,
  creator_address_type: AddressType.Creator,
  action_type: ActionType.CreateLink,
  action_state: ActionState.Created,
  intents: [makeIntent(AddressType.Creator, AddressType.Link, "asset-intent")],
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe("LinkCreationStoreV3", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState.account = { owner: CREATOR_TEXT };
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

    it("it_should_fail_initialize_action_due_to_no_creator_to_link_intent", () => {
      vi.mocked(actionTemplateLoader.createActionFromTemplate).mockReturnValue(
        Ok(MOCK_ACTION_NO_INTENTS),
      );
      const store = new LinkCreationStoreV3(makeDraftLink());
      const result = store.initializeCreateLinkActionFromTemplate();
      expect(result.isErr()).toBe(true);
      expect(result.isErr() && result.error.message).toContain(
        "Asset intent not found in action intents",
      );
    });

    it("it_should_fail_initialize_action_due_to_no_creator_to_treasury_intent", () => {
      vi.mocked(actionTemplateLoader.createActionFromTemplate).mockReturnValue(
        Ok(MOCK_ACTION_NO_TREASURY),
      );
      const store = new LinkCreationStoreV3(makeDraftLink());
      const result = store.initializeCreateLinkActionFromTemplate();
      expect(result.isErr()).toBe(true);
      expect(result.isErr() && result.error.message).toContain(
        "Fee intent not found in action intents",
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

    it("it_should_succeed_initialize_action_populate_fee_intent_with_icp_and_creation_fee", () => {
      vi.mocked(actionTemplateLoader.createActionFromTemplate).mockReturnValue(
        Ok(makeMockActionFull()),
      );
      const store = new LinkCreationStoreV3(makeDraftLink());
      store.initializeCreateLinkActionFromTemplate();
      const feeIntent = store.draftAction?.intents.find(
        (i) => i.dest_address_type === AddressType.Treasury,
      );
      expect(feeIntent).toBeDefined();
      expect(feeIntent!.amount).toBe(10_000n);
      expect(feeIntent!.asset.token_standard).toBe(SharedTokenStandard.ICRC2);
    });

    it("it_should_succeed_initialize_action_populate_asset_intent_from_draft_link", () => {
      vi.mocked(actionTemplateLoader.createActionFromTemplate).mockReturnValue(
        Ok(makeMockActionFull()),
      );
      const assetPrincipal = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");
      const store = new LinkCreationStoreV3(
        makeDraftLink({
          asset_info: [
            {
              asset: {
                address: assetPrincipal,
                network_fee: 500n,
                token_standard: SharedTokenStandard.ICRC1,
              },
              amount: 999n,
              label: "test",
            },
          ],
        }),
      );
      store.initializeCreateLinkActionFromTemplate();
      const assetIntent = store.draftAction?.intents.find(
        (i) => i.dest_address_type === AddressType.Link,
      );
      expect(assetIntent).toBeDefined();
      expect(assetIntent!.amount).toBe(999n);
      expect(assetIntent!.asset.address.toText()).toBe(
        "ryjl3-tyaaa-aaaaa-aaaba-cai",
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
