import type { LinkCreationStateV3 } from "$modules/creationLink/state/linkCreationStatesV3";
import { AddAssetStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/addAsset";
import type { LinkCreationStoreV3 } from "$modules/creationLink/state/linkCreationStoreV3.svelte";
import { LinkStep } from "$modules/links/types/linkStep";
import { LinkType as SharedLinkType } from "$shared";

// State when the user is choosing the type of link to create
export class ChooseLinkTypeStateV3 implements LinkCreationStateV3 {
  readonly step = LinkStep.CHOOSE_TYPE;
  #linkStore: LinkCreationStoreV3;

  // Initialize with the link store
  constructor(linkStore: LinkCreationStoreV3) {
    this.#linkStore = linkStore;
  }

  // Validate the title and link type, then move to the next state
  async goNext(): Promise<void> {
    if (this.#linkStore.draftLink === undefined) {
      throw new Error("Link shared data is required to proceed");
    }

    if (
      this.#linkStore.draftLink &&
      this.#linkStore.draftLink.title.trim() === ""
    ) {
      throw new Error("Title is required to proceed");
    }

    const currentType = this.#linkStore.draftLink.link_type;

    // TIP, AIRDROP, TOKEN_BASKET are supported
    if (
      currentType !== SharedLinkType.SendTip &&
      currentType !== SharedLinkType.SendAirdrop &&
      currentType !== SharedLinkType.SendTokenBasket
    ) {
      throw new Error(
        "Only Tip, Airdrop, and Token Basket link types are supported currently",
      );
    }

    this.#linkStore.state = new AddAssetStateV3(this.#linkStore);
  }

  // No previous state from the initial state
  async goBack(): Promise<void> {
    throw new Error("No previous state from ChooseLinkType");
  }
}
