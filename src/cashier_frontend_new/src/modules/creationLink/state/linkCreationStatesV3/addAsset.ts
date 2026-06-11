import { locale } from "$lib/i18n";
import type { LinkCreationStateV3 } from "$modules/creationLink/state/linkCreationStatesV3";
import { ChooseLinkTypeStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/chooseLinkType";
import { PreviewStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/preview";
import type { LinkCreationStoreV3 } from "$modules/creationLink/state/linkCreationStoreV3.svelte";
import { validationService } from "$modules/links/services/validationService";
import { LinkStep } from "$modules/links/types/linkStep";
import { parseBalanceUnits } from "$modules/shared/utils/converter";
import { formatNumber } from "$modules/shared/utils/formatNumber";
import { walletStore } from "$modules/token/state/walletStore.svelte";
import { LinkType as SharedLinkType } from "$shared";

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

    // validate max_use
    if (this.#linkStore.draftLink.max_use <= 0n) {
      throw new Error(
        locale.t("links.linkForm.addAsset.errors.maxUseMustBeGreaterThanZero"),
      );
    } else if (
      this.#linkStore.draftLink.max_use > 1n &&
      (this.#linkStore.draftLink.link_type === SharedLinkType.SendTip ||
        this.#linkStore.draftLink.link_type === SharedLinkType.SendTokenBasket)
    ) {
      throw new Error(
        locale.t("links.linkForm.addAsset.errors.maxUseCannotExceedOnce"),
      );
    }

    // Validate asset amount
    const validationAssetAmountResult =
      validationService.validateRequiredAssetAmountV3(
        this.#linkStore.draftLink,
        walletStore.query.data || [],
      );

    if (validationAssetAmountResult.isErr()) {
      const errorMessage = validationAssetAmountResult.error.message;

      // Check if it's an insufficient amount error
      const insufficientAmountMatch = errorMessage.match(
        /Insufficient amount for asset ([^,]+), required: (\d+), available: (\d+)/,
      );

      if (insufficientAmountMatch && walletStore.query.data) {
        const [, address, requiredStr, availableStr] = insufficientAmountMatch;
        const required = BigInt(requiredStr);
        const available = BigInt(availableStr);

        // Find the token to get symbol and decimals
        const token = walletStore.query.data.find((t) => t.address === address);

        if (token) {
          const requiredAmount = parseBalanceUnits(required, token.decimals);
          const availableAmount = parseBalanceUnits(available, token.decimals);

          // Format the error message using locale
          const template = locale.t(
            "links.linkForm.addAsset.errors.insufficientBalance",
          );
          const formattedMessage = template
            .replace("{{required}}", formatNumber(requiredAmount))
            .replace("{{tokenSymbol}}", token.symbol)
            .replace("{{available}}", formatNumber(availableAmount));

          throw new Error(formattedMessage);
        }
      }

      // For other errors, throw the original message
      throw new Error(`Validation failed: ${errorMessage}`);
    }

    this.#linkStore.state = new PreviewStateV3(this.#linkStore);
  }

  // Go back to the link type selection state
  async goBack(): Promise<void> {
    this.#linkStore.state = new ChooseLinkTypeStateV3(this.#linkStore);
  }
}
