import { LinkStep } from "$modules/links/types/linkStep";
import type { LinkCreationState } from "$modules/creationLink/state/linkCreationStates";
import type { LinkCreationStore } from "$modules/creationLink/state/linkCreationStore.svelte";
import { ChooseLinkTypeState } from "$modules/creationLink/state/linkCreationStates/chooseLinkType";
import { PreviewState } from "$modules/creationLink/state/linkCreationStates/preview";
import { locale } from "$lib/i18n";

// Default state when user is adding asset details for the link
export class AddAssetState implements LinkCreationState {
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
      throw new Error(locale.t("links.linkForm.addAsset.errors.assetRequired"));
    }
    if (this.#link.createLinkData.assets.length > 1) {
      throw new Error(
        locale.t("links.linkForm.addAsset.errors.onlyOneAssetSupported"),
      );
    }
    if (this.#link.createLinkData.assets[0].address.trim() === "") {
      throw new Error(
        locale.t("links.linkForm.addAsset.errors.addressRequired"),
      );
    }
    if (this.#link.createLinkData.assets[0].useAmount <= 0n) {
      throw new Error(
        locale.t("links.linkForm.addAsset.errors.amountMustBeGreaterThanZero"),
      );
    }

    this.#link.state = new PreviewState(this.#link);
  }

  // Go back to the link type selection state
  async goBack(): Promise<void> {
    this.#link.state = new ChooseLinkTypeState(this.#link);
  }
}
