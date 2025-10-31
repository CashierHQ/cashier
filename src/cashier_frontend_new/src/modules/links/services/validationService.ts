import type { CreateLinkData } from "$modules/links/types/createLinkData";
import {
  calculateRequiredAssetAmount,
  maxAmountPerAsset,
} from "$modules/links/utils/amountCalculator";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import { Err, Ok, type Result } from "ts-results-es";

class ValidationService {
  /**
   * Validate the required amount of assets for a link creation
   * @param createLinkData
   * @returns Result indicating success or error
   */
  validateRequiredAmount(
    createLinkData: CreateLinkData,
    walletTokens: TokenWithPriceAndBalance[],
  ): Result<boolean, Error> {
    if (!createLinkData.assets || createLinkData.assets.length === 0) {
      return Err(new Error("No assets provided for validation"));
    }

    if (!walletTokens || walletTokens.length === 0) {
      return Err(new Error("Wallet tokens data is not available"));
    }

    const requiredAmountsResult = calculateRequiredAssetAmount(
      createLinkData.assets,
      createLinkData.maxUse,
      walletTokens,
    );

    if (requiredAmountsResult.isErr()) {
      return requiredAmountsResult;
    }

    const requiredAmounts = requiredAmountsResult.unwrap();

    // Validate each asset's current balance against the required amounts
    for (const [address, amount] of Object.entries(requiredAmounts)) {
      const token = walletTokens.find((t) => t.address === address);
      if (!token) {
        return Err(
          new Error(`Token with address ${address} not found in wallet`),
        );
      }

      if (token.balance < amount) {
        return Err(
          new Error(
            `Insufficient amount for asset ${address}, required: ${amount}, available: ${token.balance}`,
          ),
        );
      }
    }

    return Ok(true);
  }

  /**
   * Get the maximum amount per asset for link creation
   * @param createLinkData
   * @returns Result containing max amounts or error
   */
  maxAmountPerAsset(
    createLinkData: CreateLinkData,
    walletTokens: TokenWithPriceAndBalance[],
  ): Result<Record<string, bigint>, Error> {
    if (!createLinkData.assets || createLinkData.assets.length === 0) {
      return Err(new Error("No assets provided for validation"));
    }

    if (!walletTokens || walletTokens.length === 0) {
      return Err(new Error("Wallet tokens data is not available"));
    }

    return maxAmountPerAsset(
      createLinkData.assets,
      createLinkData.maxUse,
      walletTokens,
    );
  }
}

export const validationService = new ValidationService();
