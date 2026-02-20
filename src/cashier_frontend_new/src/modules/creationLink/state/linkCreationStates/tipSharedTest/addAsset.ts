import { authState } from "$modules/auth/state/auth.svelte";
import { validationService } from "$modules/links/services/validationService";
import { LinkStep } from "$modules/links/types/linkStep";
import { walletStore } from "$modules/token/state/walletStore.svelte";
import type { LinkCreationState } from "..";
import type { LinkCreationStore } from "$modules/creationLink/state/linkCreationStore.svelte";
import { ChooseLinkTypeState } from "../chooseLinkType";
import { PreviewState } from "../preview";
import { parseBalanceUnits } from "$modules/shared/utils/converter";
import { formatNumber } from "$modules/shared/utils/formatNumber";
import { locale } from "$lib/i18n";
import { TokenStandard } from "$shared";
import { actionStore } from "$modules/creationLink/state/actionStore.svelte";
import { LinkType } from "$modules/links/types/link/linkType";
import {
  ICP_LEDGER_CANISTER_ID,
  ICP_LEDGER_FEE,
} from "$modules/token/constants";
import { Principal } from "@dfinity/principal";

// State when the user is adding asset details for the tip link (shared package test)
export class AddAssetTipSharedTestState implements LinkCreationState {
  readonly step = LinkStep.ADD_ASSET;
  #link: LinkCreationStore;

  constructor(link: LinkCreationStore) {
    this.#link = link;

    // Initialize Action from template only if not already present (e.g. when going back from Preview we keep existing intents)
    if (!actionStore.action || actionStore.action.intents.length === 0) {
      try {
        const creatorPrincipal = authState.account?.owner
          ? Principal.fromText(authState.account.owner)
          : Principal.fromText("aaaaa-aa");
        const ok = actionStore.initializeFromTemplate(
          LinkType.TIP_SHARED_TEST,
          creatorPrincipal,
        );
        if (!ok) {
          console.warn("Could not initialize Action from template");
        }
      } catch (e) {
        console.warn("Could not initialize Action:", e);
      }
    }
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

    // Update first (asset) intent with actual selected asset data
    const creatorPrincipal = authState.account?.owner
      ? Principal.fromText(authState.account.owner)
      : Principal.fromText("aaaaa-aa");
    actionStore.updateCreator(creatorPrincipal);

    const tokens = walletStore.query.data ?? [];
    const assetAddressStr = this.#link.createLinkData.assets[0].address;
    const useAmount = this.#link.createLinkData.assets[0].useAmount;
    const assetToken = tokens.find((t) => t.address === assetAddressStr);
    const assetNetworkFee = assetToken?.fee ?? ICP_LEDGER_FEE;
    const tokenStandard =
      assetAddressStr === ICP_LEDGER_CANISTER_ID
        ? TokenStandard.ICRC2
        : TokenStandard.ICRC1;

    actionStore.updateAssetIntent({
      assetAddress: Principal.fromText(assetAddressStr),
      networkFee: assetNetworkFee,
      tokenStandard,
      amount: useAmount,
    });
    const icpToken = tokens.find((t) => t.address === ICP_LEDGER_CANISTER_ID);
    actionStore.updateFeeIntent(icpToken?.fee);

    this.#link.state = new PreviewState(this.#link);
  }

  // Go back to the link type selection state
  async goBack(): Promise<void> {
    this.#link.state = new ChooseLinkTypeState(this.#link);
  }
}
