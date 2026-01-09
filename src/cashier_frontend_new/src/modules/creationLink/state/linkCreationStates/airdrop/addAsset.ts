import { validationService } from "$modules/links/services/validationService";
import { LinkStep } from "$modules/links/types/linkStep";
import { walletStore } from "$modules/token/state/walletStore.svelte";
import type { LinkCreationState } from "$modules/creationLink/state/linkCreationStates";
import type { LinkCreationStore } from "$modules/creationLink/state/linkCreationStore.svelte";
import { ChooseLinkTypeState } from "$modules/creationLink/state/linkCreationStates/chooseLinkType";
import { PreviewState } from "$modules/creationLink/state/linkCreationStates/preview";
import { parseBalanceUnits } from "$modules/shared/utils/converter";
import { formatNumber } from "$modules/shared/utils/formatNumber";
import { locale } from "$lib/i18n";

// State when the user is adding asset details for the airdrop link
export class AddAssetAirdropState implements LinkCreationState {
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

    // Airdrop links support only one asset
    if (this.#link.createLinkData.assets.length > 1) {
      throw new Error(
        locale.t("links.linkForm.addAsset.errors.onlyOneAssetSupported"),
      );
    }

    // Validate the asset
    const asset = this.#link.createLinkData.assets[0];
    if (asset.address.trim() === "") {
      throw new Error(
        locale.t("links.linkForm.addAsset.errors.addressRequired"),
      );
    }
    if (asset.useAmount <= 0n) {
      throw new Error(
        locale.t("links.linkForm.addAsset.errors.amountMustBeGreaterThanZero"),
      );
    }

    // Validate required amounts (for airdrop, this checks totalAmount = useAmount * maxUse)
    const validationResult = validationService.validateRequiredAmount(
      this.#link.createLinkData,
      walletStore.query.data || [],
    );

    if (validationResult.isErr()) {
      const errorMessage = validationResult.error.message;

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

    this.#link.state = new PreviewState(this.#link);
  }

  // Go back to the link type selection state
  async goBack(): Promise<void> {
    this.#link.state = new ChooseLinkTypeState(this.#link);
  }
}
