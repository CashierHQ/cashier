import type { LinkCreationState } from "$modules/creationLink/state/linkCreationStates";
import { AddAssetAirdropState } from "$modules/creationLink/state/linkCreationStates/airdrop/addAsset";
import { AddAssetAirdropSharedTestState } from "$modules/creationLink/state/linkCreationStates/airdropSharedTest/addAsset";
import { AddAssetTipLinkState } from "$modules/creationLink/state/linkCreationStates/tiplink/addAsset";
import { AddAssetTipSharedTestState } from "$modules/creationLink/state/linkCreationStates/tipSharedTest/addAsset";
import { AddAssetTokenBasketState } from "$modules/creationLink/state/linkCreationStates/tokenbasket/addAsset";
import { AddAssetTokenBasketSharedTestState } from "$modules/creationLink/state/linkCreationStates/tokenbasketSharedTest/addAsset";
import type { LinkCreationStore } from "$modules/creationLink/state/linkCreationStore.svelte";
import { LinkType } from "$modules/links/types/link/linkType";
import { LinkStep } from "$modules/links/types/linkStep";

// State when the user is choosing the type of link to create
export class ChooseLinkTypeState implements LinkCreationState {
  readonly step = LinkStep.CHOOSE_TYPE;
  #link: LinkCreationStore;

  // Initialize with the link store
  constructor(link: LinkCreationStore) {
    this.#link = link;
  }

  // Validate the title and link type, then move to the next state
  async goNext(): Promise<void> {
    if (this.#link.createLinkData.title.trim() === "") {
      throw new Error("Title is required to proceed");
    }

    const currentType = this.#link.createLinkData.linkType;

    // TIP, AIRDROP, TOKEN_BASKET, and TIP_SHARED_TEST are supported
    if (
      currentType !== LinkType.TIP &&
      currentType !== LinkType.AIRDROP &&
      currentType !== LinkType.TOKEN_BASKET &&
      currentType !== LinkType.TIP_SHARED_TEST &&
      currentType !== LinkType.AIRDROP_SHARED_TEST &&
      currentType !== LinkType.TOKEN_BASKET_SHARED_TEST
    ) {
      throw new Error(
        "Only Tip, Airdrop, Token Basket, and Tip Shared Test link types are supported currently",
      );
    }

    if (currentType === LinkType.TIP) {
      this.#link.state = new AddAssetTipLinkState(this.#link);
    } else if (currentType === LinkType.AIRDROP) {
      this.#link.state = new AddAssetAirdropState(this.#link);
    } else if (currentType === LinkType.TOKEN_BASKET) {
      this.#link.state = new AddAssetTokenBasketState(this.#link);
    } else if (currentType === LinkType.TIP_SHARED_TEST) {
      this.#link.state = new AddAssetTipSharedTestState(this.#link);
    } else if (currentType === LinkType.AIRDROP_SHARED_TEST) {
      this.#link.state = new AddAssetAirdropSharedTestState(this.#link);
    } else if (currentType === LinkType.TOKEN_BASKET_SHARED_TEST) {
      this.#link.state = new AddAssetTokenBasketSharedTestState(this.#link);
    }
  }

  // No previous state from the initial state
  async goBack(): Promise<void> {
    throw new Error("No previous state from ChooseLinkType");
  }
}
