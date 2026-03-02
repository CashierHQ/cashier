import { authState } from "$modules/auth/state/auth.svelte";
import { tempLinkRepository } from "$modules/creationLink/repositories/tempLinkRepository";
import type { LinkCreationStateV3 } from "$modules/creationLink/state/linkCreationStatesV3";
import { AddAssetStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/addAsset";
import { LinkCreatedStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/created";
import type { LinkCreationStoreV3 } from "$modules/creationLink/state/linkCreationStoreV3.svelte";
import { cashierBackendService } from "$modules/links/services/cashierBackend";
import { LinkStep } from "$modules/links/types/linkStep";

// State handler for Preview step in the link creation flow (V3)
export class PreviewStateV3 implements LinkCreationStateV3 {
  readonly step = LinkStep.PREVIEW;
  #linkStore: LinkCreationStoreV3;

  constructor(linkStore: LinkCreationStoreV3) {
    this.#linkStore = linkStore;
  }

  // Create the link using the backend service and move to the created state
  async goNext(): Promise<void> {
    if (!this.#linkStore.draftLink) {
      throw new Error("Link must be initialized to create");
    }

    const initializeActionResult =
      this.#linkStore.initializeCreateLinkActionFromTemplate();

    if (initializeActionResult.isErr()) {
      throw new Error(
        `Failed to initialize action from template: ${initializeActionResult.error.message}`,
      );
    }

    if (!this.#linkStore.draftAction) {
      throw new Error("Action must be initialized to create link");
    }

    console.log("Creating link with draft link and action:", {
      draftLink: this.#linkStore.draftLink,
      draftAction: this.#linkStore.draftAction,
    });

    // call backend API to create the link
    const result = await cashierBackendService.createLinkV3(
      this.#linkStore.draftLink,
      this.#linkStore.draftAction,
    );

    if (result.isErr()) {
      throw new Error(`Link creation failed: ${result.error.message}`);
    }

    console.log("Link created successfully with V3 API:", result.value);

    const createLinkResponse = result.unwrap();

    // delete draft link from local storage
    if (this.#linkStore.id)
      tempLinkRepository.delete(
        this.#linkStore.id,
        authState.account?.owner ?? "anon",
      );

    this.#linkStore.id = createLinkResponse.link.id;
    this.#linkStore.state = new LinkCreatedStateV3();
    this.#linkStore.backendLink = createLinkResponse.link;
    this.#linkStore.backendAction = createLinkResponse.action;
  }

  // Go back to the add asset state
  async goBack(): Promise<void> {
    this.#linkStore.state = new AddAssetStateV3(this.#linkStore);
  }
}
