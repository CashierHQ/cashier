import type { ProcessActionResult } from "$modules/links/types/action/action";
import { LinkType } from "$modules/links/types/link/linkType";
import { LinkStep } from "$modules/links/types/linkStep";
import type { LinkCreationState } from ".";
import type { LinkCreationStore } from "../linkCreationStore.svelte";
import { AddAssetState } from "./addAsset";
import { AddAssetTipLinkState } from "./tiplink/addAsset";

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

    if (this.#link.createLinkData.linkType !== LinkType.TIP) {
      throw new Error("Only Tip link type is supported currently");
    }

    if (this.#link.createLinkData.linkType === LinkType.TIP) {
      this.#link.state = new AddAssetTipLinkState(this.#link);
    } else {
      this.#link.state = new AddAssetState(this.#link);
    }
  }

  // No previous state from the initial state
  async goBack(): Promise<void> {
    throw new Error("No previous state from ChooseLinkType");
  }

  async processAction(actionId: string): Promise<ProcessActionResult> {
    throw new Error("ChooseLinkTypeState does not support processing actions.");
  }
}
