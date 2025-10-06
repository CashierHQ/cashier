import { cashierBackendService } from "$modules/links/services/cashierBackend";
import { type CreateLinkData, LinkStep } from "$modules/links/types";
import { type LinkState } from ".";
import { LinkStore } from "../linkStore.svelte";
import { AddAssetState } from "./addAsset";
import { LinkCreatedState } from "./created";

export class PreviewState implements LinkState {
  readonly step = LinkStep.PREVIEW;
  #link: LinkStore;

  constructor(link: LinkStore) {
    this.#link = link;
  }

  async goNext(): Promise<void> {
    const data: CreateLinkData = {
      title: this.#link.title,
      linkType: this.#link.linkType,
      tipLink: this.#link.tipLink,
    };

    const result = await cashierBackendService.createLink(data);
    if (result.isOk()) {
      // creation succeeded — reset the form and return the created link
      this.#link.state = new LinkCreatedState(this.#link);
      this.#link.id = result.value.id;
    }
  }

  async goBack(): Promise<void> {
    this.#link.state = new AddAssetState(this.#link);
  }
}
