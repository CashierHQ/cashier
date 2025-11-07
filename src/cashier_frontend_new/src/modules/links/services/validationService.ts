import type { CreateLinkData } from "$modules/links/types/createLinkData";
import {
  calculateRequiredAssetAmount,
  maxAmountForAsset,
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
   * Get the maximum amount for asset for link creation
   * @param tokenAddress - The address of the token to calculate the max amount for
   * @param maxUse - The maximum number of times each asset can be used
   * @param walletTokens - The list of tokens in the user's wallet
   * @returns Result containing max amount or error
   */
  maxAmountForAsset(
    tokenAddress: string,
    maxUse: number,
    walletTokens: TokenWithPriceAndBalance[],
  ): Result<bigint, Error> {
    if (!walletTokens || walletTokens.length === 0) {
      return Err(new Error("Wallet tokens data is not available"));
    }

    return maxAmountForAsset(tokenAddress, maxUse, walletTokens);
  }
}

export const validationService = new ValidationService();
