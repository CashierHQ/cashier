import { AddAssetStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/addAsset";
import { ChooseLinkTypeStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/chooseLinkType";
import { PreviewStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/preview";
import type { LinkCreationStoreV3 } from "$modules/creationLink/state/linkCreationStoreV3.svelte";
import { LinkStep } from "$modules/links/types/linkStep";
import { LinkState, LinkType, TokenStandard, type AssetInfo } from "$shared";
import { Principal } from "@dfinity/principal";
import { describe, expect, it, vi } from "vitest";

vi.mock("$lib/i18n", () => ({
  locale: { t: vi.fn((key: string) => key) },
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
          max_use: 1n,
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

    it("it_should_succeed_go_next_for_send_token_basket_with_single_asset", async () => {
      const store = makeStore(VALID_ASSET_INFO, false, LinkType.SendTokenBasket);
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
      const store = makeStore(VALID_ASSET_INFO, false, LinkType.SendTokenBasket);
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
