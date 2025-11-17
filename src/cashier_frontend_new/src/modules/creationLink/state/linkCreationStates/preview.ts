import { authState } from "$modules/auth/state/auth.svelte";
import { tempLinkRepository } from "$modules/creationLink/repositories/tempLinkRepository";
import { cashierBackendService } from "$modules/links/services/cashierBackend";
import {
  ActionMapper,
  type ProcessActionResult,
} from "$modules/links/types/action/action";
import { LinkMapper } from "$modules/links/types/link/link";
import { LinkType } from "$modules/links/types/link/linkType";
import { LinkStep } from "$modules/links/types/linkStep";
import type { LinkCreationState } from ".";
import type { LinkCreationStore } from "../linkCreationStore.svelte";
import { AddAssetState } from "./addAsset";
import { LinkCreatedState } from "./created";
import { AddAssetTipLinkState } from "./tiplink/addAsset";

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

    // remove temp link from local storage
    if (this.#link.id)
      tempLinkRepository.delete(
        this.#link.id,
        authState.account?.owner ?? "anon",
      );

    // set id to backend link id
    this.#link.id = result.value.link.id;
    this.#link.state = new LinkCreatedState(this.#link);
    this.#link.link = LinkMapper.fromBackendType(result.value.link);
    this.#link.action = ActionMapper.fromBackendType(result.value.action);
  }

  // Go back to the add asset state
  async goBack(): Promise<void> {
    if (this.#link.createLinkData.linkType === LinkType.TIP) {
      this.#link.state = new AddAssetTipLinkState(this.#link);
    } else {
      this.#link.state = new AddAssetState(this.#link);
    }
  }

  async processAction(actionId: string): Promise<ProcessActionResult> {
    throw new Error("PreviewState does not support processing actions.");
  }
}
