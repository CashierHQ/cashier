import { LinkStep } from "$modules/links/types";
import { type LinkState } from ".";
import { LinkStore } from "../linkStore.svelte";
import { ChooseLinkTypeState } from "./chooseLinkType";
import { PreviewState } from "./preview";

export class AddAssetState implements LinkState {
  readonly step = LinkStep.ADD_ASSET;
  #link: LinkStore;

  constructor(link: LinkStore) {
    this.#link = link;
  }

  async goNext(): Promise<void> {
    if (!this.#link.tipLink) {
      throw new Error("Tip link details are required to proceed");
    }
    if (this.#link.tipLink.asset.trim() === "") {
      throw new Error("Asset is required to proceed");
    }
    if (this.#link.tipLink.amount <= 0) {
      throw new Error("Amount must be greater than zero to proceed");
    }

    this.#link.state = new PreviewState(this.#link);
  }

  async goBack(): Promise<void> {
    this.#link.state = new ChooseLinkTypeState(this.#link);
  }
}
