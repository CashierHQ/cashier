import type { CreateLinkData } from "$modules/links/types/createLinkData";
import { calculateRequiredAssetAmount } from "$modules/links/utils/amountCalculator";
import { walletStore } from "$modules/token/state/walletStore.svelte";
import { Err, Ok, type Result } from "ts-results-es";

class ValidationService {
  /**
   * Validate the required amount of assets for a link creation
   * @param createLinkData
   * @returns
   */
  validateRequiredAmount(
    createLinkData: CreateLinkData,
  ): Result<boolean, Error> {
    if (!createLinkData.assets || createLinkData.assets.length === 0) {
      return Err(new Error("No assets provided for validation"));
    }

    if (!walletStore.query.data || walletStore.query.data.length === 0) {
      return Err(new Error("Wallet tokens data is not available"));
    }

    const requiredAmountsResult = calculateRequiredAssetAmount(
      createLinkData.assets,
      createLinkData.maxUse,
      walletStore.query.data,
    );

    if (requiredAmountsResult.isErr()) {
      return Err(new Error("Failed to calculate required asset amounts"));
    }

    const requiredAmounts = requiredAmountsResult.unwrap();

    // Validate each asset's amount against the required amounts
    for (const asset of createLinkData.assets) {
      const requiredAmount = requiredAmounts[asset.address];
      if (!requiredAmount) {
        return Err(
          new Error(`Missing required amount for asset ${asset.address}`),
        );
      }

      const tokenResult = walletStore.findTokenByAddress(asset.address);
      if (tokenResult.isErr()) {
        return Err(
          new Error(`Token with address ${asset.address} not found in wallet`),
        );
      }

      const token = tokenResult.unwrap();
      if (token.balance < requiredAmount) {
        return Err(
          new Error(
            `Insufficient amount for asset ${asset.address}, required: ${requiredAmount}, available: ${token.balance}`,
          ),
        );
      }
    }

    return Ok(true);
  }
}

export const validationService = new ValidationService();
