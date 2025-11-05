import { cashierBackendService } from "$modules/links/services/cashierBackend";
import { LinkStep } from "$modules/links/types/linkStep";
import type { LinkCreationState } from ".";
import type { LinkCreationStore } from "../linkStore.svelte";
import { AddAssetState } from "./addAsset";
import { LinkCreatedState } from "./created";
import { ActionMapper } from "../../types/action/action";
import { LinkMapper } from "$modules/links/types/link/link";

// State when the user is previewing the link before creation
export class PreviewState implements LinkCreationState {
  readonly step = LinkStep.PREVIEW;
  #link: LinkCreationStore;

  constructor(link: LinkCreationStore) {
    this.#link = link;
  }

  // Create the link using the backend service and move to the created state
  async goNext(): Promise<void> {
    const result = await cashierBackendService.createLinkV2(
      this.#link.createLinkData,
    );

    if (result.isErr()) {
      throw new Error(`Link creation failed: ${result.error.message}`);
    }

    this.#link.state = new LinkCreatedState(this.#link);
    this.#link.id = result.value.link.id;
    this.#link.link = LinkMapper.fromBackendType(result.value.link);
    this.#link.action = ActionMapper.fromBackendType(result.value.action);
  }

  // Go back to the add asset state
  async goBack(): Promise<void> {
    this.#link.state = new AddAssetState(this.#link);
  }
}
