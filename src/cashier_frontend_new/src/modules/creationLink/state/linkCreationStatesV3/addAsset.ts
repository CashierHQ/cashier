import { locale } from "$lib/i18n";
import type { LinkCreationStateV3 } from "$modules/creationLink/state/linkCreationStatesV3";
import { ChooseLinkTypeStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/chooseLinkType";
import { PreviewStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/preview";
import type { LinkCreationStoreV3 } from "$modules/creationLink/state/linkCreationStoreV3.svelte";
import { LinkStep } from "$modules/links/types/linkStep";

// Default state when user is adding asset details for the link
export class AddAssetStateV3 implements LinkCreationStateV3 {
  readonly step = LinkStep.ADD_ASSET;
  #linkStore: LinkCreationStoreV3;

  constructor(linkStore: LinkCreationStoreV3) {
    this.#linkStore = linkStore;
  }

  // Validate the asset details and move to the preview state
  async goNext(): Promise<void> {
    if (
      !this.#linkStore.draftLink ||
      !this.#linkStore.draftLink.asset_info ||
      this.#linkStore.draftLink.asset_info.length === 0
    ) {
      throw new Error(locale.t("links.linkForm.addAsset.errors.assetRequired"));
    }

    // Validate each asset
    for (let i = 0; i < this.#linkStore.draftLink.asset_info.length; i++) {
      const asset_info = this.#linkStore.draftLink.asset_info[i];
      if (asset_info.asset.address.toText() === "") {
        throw new Error(
          locale.t("links.linkForm.addAsset.errors.addressRequired"),
        );
      }
      if (asset_info.amount <= 0n) {
        throw new Error(
          locale.t(
            "links.linkForm.addAsset.errors.amountMustBeGreaterThanZero",
          ),
        );
      }
    }

    //TODO: validate asset amount

    this.#linkStore.state = new PreviewStateV3(this.#linkStore);
  }

  // Go back to the link type selection state
  async goBack(): Promise<void> {
    this.#linkStore.state = new ChooseLinkTypeStateV3(this.#linkStore);
  }
}
