import { ChooseLinkTypeStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/chooseLinkType";
import { AddAssetStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/addAsset";
import type { LinkCreationStoreV3 } from "$modules/creationLink/state/linkCreationStoreV3.svelte";
import { LinkStep } from "$modules/links/types/linkStep";
import { LinkState, LinkType } from "$shared";
import { Principal } from "@dfinity/principal";
import { describe, expect, it, vi } from "vitest";

vi.mock("$lib/i18n", () => ({
  locale: { t: vi.fn((key: string) => key) },
}));

vi.mock("$modules/creationLink/state/linkCreationStatesV3/addAsset", () => ({
  AddAssetStateV3: class AddAssetStateV3 {
    readonly step = LinkStep.ADD_ASSET;
    constructor(_: unknown) {}
  },
}));

function makeStore(
  titleOverride?: string,
  linkTypeOverride?: LinkType,
  draftLinkUndefined?: boolean,
): LinkCreationStoreV3 {
  const store = {
    draftLink: draftLinkUndefined
      ? undefined
      : {
          id: "test-id",
          title: titleOverride ?? "My link",
          link_type: linkTypeOverride ?? LinkType.SendTip,
          link_state: LinkState.ChooseType,
          creator: Principal.anonymous(),
          asset_info: [],
          max_use: 1n,
          use_count: 0n,
        },
    state: undefined as unknown,
  };
  return store as unknown as LinkCreationStoreV3;
}

describe("ChooseLinkTypeStateV3", () => {
  describe("step", () => {
    it("it_should_succeed_have_choose_type_step", () => {
      const store = makeStore();
      const state = new ChooseLinkTypeStateV3(store);
      expect(state.step).toBe(LinkStep.CHOOSE_TYPE);
    });
  });

  describe("goNext", () => {
    it("it_should_fail_go_next_due_to_undefined_draft_link", async () => {
      const store = makeStore(undefined, undefined, true);
      const state = new ChooseLinkTypeStateV3(store);
      await expect(state.goNext()).rejects.toThrow(
        "Link shared data is required to proceed",
      );
    });

    it("it_should_fail_go_next_due_to_empty_title", async () => {
      const store = makeStore("");
      const state = new ChooseLinkTypeStateV3(store);
      await expect(state.goNext()).rejects.toThrow(
        "Title is required to proceed",
      );
    });

    it("it_should_fail_go_next_due_to_whitespace_only_title", async () => {
      const store = makeStore("   ");
      const state = new ChooseLinkTypeStateV3(store);
      await expect(state.goNext()).rejects.toThrow(
        "Title is required to proceed",
      );
    });

    it("it_should_fail_go_next_due_to_unsupported_link_type", async () => {
      const store = makeStore("My link", LinkType.ReceivePayment);
      const state = new ChooseLinkTypeStateV3(store);
      await expect(state.goNext()).rejects.toThrow(
        "Only Tip, Airdrop, and Token Basket link types are supported currently",
      );
    });

    it("it_should_succeed_go_next_for_send_tip_link_type", async () => {
      const store = makeStore("My tip", LinkType.SendTip);
      const state = new ChooseLinkTypeStateV3(store);
      await state.goNext();
      expect(store.state).toBeInstanceOf(AddAssetStateV3);
    });

    it("it_should_succeed_go_next_for_send_airdrop_link_type", async () => {
      const store = makeStore("My airdrop", LinkType.SendAirdrop);
      const state = new ChooseLinkTypeStateV3(store);
      await state.goNext();
      expect(store.state).toBeInstanceOf(AddAssetStateV3);
    });

    it("it_should_succeed_go_next_for_send_token_basket_link_type", async () => {
      const store = makeStore("My token basket", LinkType.SendTokenBasket);
      const state = new ChooseLinkTypeStateV3(store);
      await state.goNext();
      expect(store.state).toBeInstanceOf(AddAssetStateV3);
    });

    it("it_should_succeed_go_next_transition_to_add_asset_step", async () => {
      const store = makeStore("My tip", LinkType.SendTip);
      const state = new ChooseLinkTypeStateV3(store);
      await state.goNext();
      expect((store.state as AddAssetStateV3).step).toBe(LinkStep.ADD_ASSET);
    });
  });

  describe("goBack", () => {
    it("it_should_fail_go_back_always", async () => {
      const store = makeStore();
      const state = new ChooseLinkTypeStateV3(store);
      await expect(state.goBack()).rejects.toThrow(
        "No previous state from ChooseLinkType",
      );
    });
  });
});
