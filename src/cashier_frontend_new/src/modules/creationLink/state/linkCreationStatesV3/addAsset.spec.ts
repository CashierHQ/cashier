import { AddAssetStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/addAsset";
import { ChooseLinkTypeStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/chooseLinkType";
import { PreviewStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/preview";
import type { LinkCreationStoreV3 } from "$modules/creationLink/state/linkCreationStoreV3.svelte";
import { validationService } from "$modules/links/services/validationService";
import { LinkStep } from "$modules/links/types/linkStep";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import { LinkState, LinkType, TokenStandard, type AssetInfo } from "$shared";
import { Principal } from "@dfinity/principal";
import { Err, Ok } from "ts-results-es";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$lib/i18n", () => ({
  locale: { t: vi.fn((key: string) => key) },
}));

vi.mock("$modules/links/services/validationService", () => ({
  validationService: { validateRequiredAssetAmountV3: vi.fn() },
}));

const mockWalletStore = vi.hoisted(() => ({
  query: { data: undefined as TokenWithPriceAndBalance[] | undefined },
}));

vi.mock("$modules/token/state/walletStore.svelte", () => ({
  walletStore: mockWalletStore,
}));

const VALID_PRINCIPAL = Principal.fromText("aaaaa-aa");

const VALID_ASSET_INFO: AssetInfo[] = [
  {
    asset: {
      address: VALID_PRINCIPAL,
      network_fee: 100n,
      token_standard: TokenStandard.ICRC1,
    },
    label: "test-asset",
    amount: 1000n,
  },
];

const VALID_SECOND_ASSET_INFO: AssetInfo = {
  asset: {
    address: Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai"),
    network_fee: 10000n,
    token_standard: TokenStandard.ICRC2,
  },
  label: "second-asset",
  amount: 500n,
};

function makeStore(
  assetInfo?: AssetInfo[],
  draftLinkUndefined?: boolean,
  linkType: LinkType = LinkType.SendTip,
  maxUse: bigint = 1n,
): LinkCreationStoreV3 {
  const store = {
    draftLink: draftLinkUndefined
      ? undefined
      : {
          id: "test-id",
          title: "My link",
          link_type: linkType,
          link_state: LinkState.AddAsset,
          creator: Principal.anonymous(),
          asset_info: assetInfo ?? VALID_ASSET_INFO,
          max_use: maxUse,
          use_count: 0n,
        },
    state: undefined as unknown,
  };
  return store as unknown as LinkCreationStoreV3;
}

describe("AddAssetStateV3", () => {
  describe("step", () => {
    it("it_should_succeed_have_add_asset_step", () => {
      const store = makeStore();
      const state = new AddAssetStateV3(store);
      expect(state.step).toBe(LinkStep.ADD_ASSET);
    });
  });

  describe("goNext", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockWalletStore.query.data = [];
      vi.mocked(
        validationService.validateRequiredAssetAmountV3,
      ).mockReturnValue(Ok(true));
    });

    it("it_should_fail_go_next_due_to_undefined_draft_link", async () => {
      const store = makeStore(undefined, true);
      const state = new AddAssetStateV3(store);
      await expect(state.goNext()).rejects.toThrow(
        "links.linkForm.addAsset.errors.assetRequired",
      );
    });

    it("it_should_fail_go_next_due_to_empty_asset_info", async () => {
      const store = makeStore([]);
      const state = new AddAssetStateV3(store);
      await expect(state.goNext()).rejects.toThrow(
        "links.linkForm.addAsset.errors.assetRequired",
      );
    });

    it("it_should_fail_go_next_due_to_asset_with_empty_address", async () => {
      const store = makeStore([
        {
          asset: {
            address: { toText: () => "" } as unknown as Principal,
            network_fee: 100n,
            token_standard: TokenStandard.ICRC1,
          },
          label: "test",
          amount: 1000n,
        },
      ]);
      const state = new AddAssetStateV3(store);
      await expect(state.goNext()).rejects.toThrow(
        "links.linkForm.addAsset.errors.addressRequired",
      );
    });

    it("it_should_fail_go_next_due_to_asset_amount_zero", async () => {
      const store = makeStore([
        {
          asset: {
            address: VALID_PRINCIPAL,
            network_fee: 100n,
            token_standard: TokenStandard.ICRC1,
          },
          label: "test",
          amount: 0n,
        },
      ]);
      const state = new AddAssetStateV3(store);
      await expect(state.goNext()).rejects.toThrow(
        "links.linkForm.addAsset.errors.amountMustBeGreaterThanZero",
      );
    });

    it("it_should_fail_go_next_due_to_asset_amount_negative", async () => {
      const store = makeStore([
        {
          asset: {
            address: VALID_PRINCIPAL,
            network_fee: 100n,
            token_standard: TokenStandard.ICRC1,
          },
          label: "test",
          amount: -1n,
        },
      ]);
      const state = new AddAssetStateV3(store);
      await expect(state.goNext()).rejects.toThrow(
        "links.linkForm.addAsset.errors.amountMustBeGreaterThanZero",
      );
    });

    it("it_should_fail_go_next_due_to_max_use_less_than_or_equal_to_zero", async () => {
      const store = makeStore(VALID_ASSET_INFO, false, LinkType.SendTip, 0n);
      const state = new AddAssetStateV3(store);
      await expect(state.goNext()).rejects.toThrow(
        "links.linkForm.addAsset.errors.maxUseMustBeGreaterThanZero",
      );
    });

    it("it_should_fail_go_next_due_to_max_use_exceeds_once_for_send_tip", async () => {
      const store = makeStore(VALID_ASSET_INFO, false, LinkType.SendTip, 2n);
      const state = new AddAssetStateV3(store);
      await expect(state.goNext()).rejects.toThrow(
        "links.linkForm.addAsset.errors.maxUseCannotExceedOnce",
      );
    });

    it("it_should_fail_go_next_due_to_max_use_exceeds_once_for_send_token_basket", async () => {
      const store = makeStore(
        [VALID_ASSET_INFO[0], VALID_SECOND_ASSET_INFO],
        false,
        LinkType.SendTokenBasket,
        2n,
      );
      const state = new AddAssetStateV3(store);
      await expect(state.goNext()).rejects.toThrow(
        "links.linkForm.addAsset.errors.maxUseCannotExceedOnce",
      );
    });

    it("it_should_fail_go_next_due_to_validation_error", async () => {
      vi.mocked(
        validationService.validateRequiredAssetAmountV3,
      ).mockReturnValue(Err(new Error("Wallet tokens data is not available")));
      const store = makeStore(VALID_ASSET_INFO);
      const state = new AddAssetStateV3(store);
      await expect(state.goNext()).rejects.toThrow(
        "Validation failed: Wallet tokens data is not available",
      );
    });

    it("it_should_fail_go_next_due_to_insufficient_balance_formats_error_with_token_info", async () => {
      // Error matches the regex → code looks up token in walletStore and formats message via locale
      // locale.t is mocked to return the key, so the thrown message is the i18n key
      const tokenAddress = VALID_PRINCIPAL.toText();
      mockWalletStore.query.data = [
        {
          name: "Token",
          symbol: "TKN",
          address: tokenAddress,
          decimals: 8,
          enabled: true,
          fee: 100n,
          is_default: false,
          balance: 500_000n,
          priceUSD: 1.0,
        },
      ];
      vi.mocked(
        validationService.validateRequiredAssetAmountV3,
      ).mockReturnValue(
        Err(
          new Error(
            `Insufficient amount for asset ${tokenAddress}, required: 530000, available: 500000`,
          ),
        ),
      );
      const store = makeStore(VALID_ASSET_INFO);
      const state = new AddAssetStateV3(store);
      await expect(state.goNext()).rejects.toThrow(
        "links.linkForm.addAsset.errors.insufficientBalance",
      );
    });

    it("it_should_fail_go_next_due_to_insufficient_balance_falls_back_to_generic_error_when_token_not_in_wallet", async () => {
      // Error matches the regex but token is NOT in walletStore → falls through to generic error
      vi.mocked(
        validationService.validateRequiredAssetAmountV3,
      ).mockReturnValue(
        Err(
          new Error(
            `Insufficient amount for asset ${VALID_PRINCIPAL.toText()}, required: 530000, available: 500000`,
          ),
        ),
      );
      mockWalletStore.query.data = []; // token not found
      const store = makeStore(VALID_ASSET_INFO);
      const state = new AddAssetStateV3(store);
      await expect(state.goNext()).rejects.toThrow("Validation failed:");
    });

    it("it_should_succeed_go_next_for_send_tip_link_type", async () => {
      const store = makeStore(VALID_ASSET_INFO, false, LinkType.SendTip);
      const state = new AddAssetStateV3(store);
      await state.goNext();
      expect(store.state).toBeInstanceOf(PreviewStateV3);
    });

    it("it_should_succeed_go_next_for_send_airdrop_link_type", async () => {
      const store = makeStore(VALID_ASSET_INFO, false, LinkType.SendAirdrop);
      const state = new AddAssetStateV3(store);
      await state.goNext();
      expect(store.state).toBeInstanceOf(PreviewStateV3);
    });

    it("it_should_succeed_go_next_for_send_airdrop_when_max_use_greater_than_one", async () => {
      const store = makeStore(
        VALID_ASSET_INFO,
        false,
        LinkType.SendAirdrop,
        3n,
      );
      const state = new AddAssetStateV3(store);
      await state.goNext();
      expect(store.state).toBeInstanceOf(PreviewStateV3);
    });

    it("it_should_succeed_go_next_for_send_token_basket_with_single_asset", async () => {
      const store = makeStore(
        VALID_ASSET_INFO,
        false,
        LinkType.SendTokenBasket,
      );
      const state = new AddAssetStateV3(store);
      await state.goNext();
      expect(store.state).toBeInstanceOf(PreviewStateV3);
    });

    it("it_should_succeed_go_next_for_send_token_basket_with_multiple_assets", async () => {
      const store = makeStore(
        [VALID_ASSET_INFO[0], VALID_SECOND_ASSET_INFO],
        false,
        LinkType.SendTokenBasket,
      );
      const state = new AddAssetStateV3(store);
      await state.goNext();
      expect(store.state).toBeInstanceOf(PreviewStateV3);
    });

    it("it_should_succeed_go_next_transition_to_preview_step", async () => {
      const store = makeStore(VALID_ASSET_INFO);
      const state = new AddAssetStateV3(store);
      await state.goNext();
      expect((store.state as PreviewStateV3).step).toBe(LinkStep.PREVIEW);
    });
  });

  describe("goBack", () => {
    it("it_should_succeed_go_back_for_send_tip_link_type", async () => {
      const store = makeStore(VALID_ASSET_INFO, false, LinkType.SendTip);
      const state = new AddAssetStateV3(store);
      await state.goBack();
      expect(store.state).toBeInstanceOf(ChooseLinkTypeStateV3);
    });

    it("it_should_succeed_go_back_for_send_airdrop_link_type", async () => {
      const store = makeStore(VALID_ASSET_INFO, false, LinkType.SendAirdrop);
      const state = new AddAssetStateV3(store);
      await state.goBack();
      expect(store.state).toBeInstanceOf(ChooseLinkTypeStateV3);
    });

    it("it_should_succeed_go_back_for_send_token_basket_link_type", async () => {
      const store = makeStore(
        VALID_ASSET_INFO,
        false,
        LinkType.SendTokenBasket,
      );
      const state = new AddAssetStateV3(store);
      await state.goBack();
      expect(store.state).toBeInstanceOf(ChooseLinkTypeStateV3);
    });

    it("it_should_succeed_go_back_transition_to_choose_type_step", async () => {
      const store = makeStore();
      const state = new AddAssetStateV3(store);
      await state.goBack();
      expect((store.state as ChooseLinkTypeStateV3).step).toBe(
        LinkStep.CHOOSE_TYPE,
      );
    });
  });
});
