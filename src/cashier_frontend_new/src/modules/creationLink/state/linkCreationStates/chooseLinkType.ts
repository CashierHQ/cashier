import { LinkType } from "$modules/links/types/link/linkType";
import { LinkStep } from "$modules/links/types/linkStep";
import type { LinkCreationState } from "$modules/creationLink/state/linkCreationStates";
import type { LinkCreationStore } from "$modules/creationLink/state/linkCreationStore.svelte";
import { AddAssetTipLinkState } from "$modules/creationLink/state/linkCreationStates/tiplink/addAsset";
import { AddAssetAirdropState } from "$modules/creationLink/state/linkCreationStates/airdrop/addAsset";
import { AddAssetState } from "$modules/creationLink/state/linkCreationStates/addAsset";

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

    // TIP, AIRDROP, and TOKEN_BASKET are supported
    if (
      currentType !== LinkType.TIP &&
      currentType !== LinkType.AIRDROP &&
      currentType !== LinkType.TOKEN_BASKET
    ) {
      throw new Error(
        "Only Tip, Airdrop, and Token Basket link types are supported currently",
      );
    }

    if (currentType === LinkType.TIP) {
      this.#link.state = new AddAssetTipLinkState(this.#link);
    } else if (currentType === LinkType.AIRDROP) {
      this.#link.state = new AddAssetAirdropState(this.#link);
    } else if (currentType === LinkType.TOKEN_BASKET) {
      this.#link.state = new AddAssetState(this.#link);
    }
  }

  // No previous state from the initial state
  async goBack(): Promise<void> {
    throw new Error("No previous state from ChooseLinkType");
  }
}
