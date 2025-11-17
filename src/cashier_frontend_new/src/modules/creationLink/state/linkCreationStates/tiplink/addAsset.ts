import { validationService } from "$modules/links/services/validationService";
import type { ProcessActionResult } from "$modules/links/types/action/action";
import { LinkStep } from "$modules/links/types/linkStep";
import { walletStore } from "../../../../../../../../token/state/walletStore.svelte";
import type { LinkCreationState } from "..";
import type { LinkCreationStore } from "../../linkCreationStore.svelte";
import { ChooseLinkTypeState } from "../chooseLinkType";
import { PreviewState } from "../preview";

// State when the user is adding asset details for the tip link
export class AddAssetTipLinkState implements LinkCreationState {
  readonly step = LinkStep.ADD_ASSET;
  #link: LinkCreationStore;

  constructor(link: LinkCreationStore) {
    this.#link = link;
  }

  // Validate the asset details and move to the preview state
  async goNext(): Promise<void> {
    if (
      !this.#link.createLinkData.assets ||
      this.#link.createLinkData.assets?.length === 0
    ) {
      throw new Error("Asset is required to proceed");
    }
    if (this.#link.createLinkData.assets.length > 1) {
      throw new Error("Only one asset is supported for tip links");
    }
    if (this.#link.createLinkData.assets[0].address.trim() === "") {
      throw new Error("Address is required to proceed");
    }
    if (this.#link.createLinkData.assets[0].useAmount <= 0n) {
      throw new Error("Amount must be greater than zero to proceed");
    }

    // validate required amounts
    const validationResult = validationService.validateRequiredAmount(
      this.#link.createLinkData,
      walletStore.query.data || [],
    );

    if (validationResult.isErr()) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    this.#link.state = new PreviewState(this.#link);
  }

  // Go back to the link type selection state
  async goBack(): Promise<void> {
    this.#link.state = new ChooseLinkTypeState(this.#link);
  }

  async processAction(actionId: string): Promise<ProcessActionResult> {
    throw new Error(
      "AddAssetTipLinkState does not support processing actions.",
    );
  }
}
