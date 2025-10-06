import { LinkStep, LinkType } from "$modules/links/types";
import { type LinkState } from ".";
import { LinkStore } from "../linkStore.svelte";
import { AddAssetState } from "./addAsset";

export class ChooseLinkTypeState implements LinkState {
  readonly step = LinkStep.CHOOSE_TYPE;
  #link: LinkStore;

  constructor(link: LinkStore) {
    this.#link = link;
  }

  async goNext(): Promise<void> {
    if (this.#link.title.trim() === "") {
      throw new Error("Title is required to proceed");
    }

    if (this.#link.linkType !== LinkType.TIP) {
      throw new Error("Only Tip link type is supported currently");
    }

    this.#link.state = new AddAssetState(this.#link);
  }

  async goBack(): Promise<void> {
    throw new Error("No previous state from ChooseLinkType");
  }
}
