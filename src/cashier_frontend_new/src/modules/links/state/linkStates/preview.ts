import { cashierBackendService } from "$modules/links/services/cashierBackend";
import { CreateLinkData } from "$modules/links/types/createLinkData";
import { LinkStep } from "$modules/links/types/linkStep";
import type { LinkState } from ".";
import type { LinkStore } from "../linkStore.svelte";
import { AddAssetState } from "./addAsset";
import { LinkCreatedState } from "./created";
import Action from "../../types/action/action";

// State when the user is previewing the link before creation
export class PreviewState implements LinkState {
  readonly step = LinkStep.PREVIEW;
  #link: LinkStore;

  constructor(link: LinkStore) {
    this.#link = link;
  }

  // Create the link using the backend service and move to the created state
  async goNext(): Promise<void> {
    const data: CreateLinkData = new CreateLinkData({
      title: this.#link.title,
      linkType: this.#link.linkType,
      tipLink: this.#link.tipLink,
    });

    const result = await cashierBackendService.createLinkV2(data);

    if (result.isErr()) {
      throw new Error(`Link creation failed: ${result.error.message}`);
    }

    this.#link.state = new LinkCreatedState(this.#link);
    this.#link.id = result.value.link.id;
    this.#link.action = Action.fromBackendType(result.value.action);
  }

  // Go back to the add asset state
  async goBack(): Promise<void> {
    this.#link.state = new AddAssetState(this.#link);
  }
}
