import type { CreateLinkAsset } from "$modules/links/types/createLinkData";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import { Err, Ok, type Result } from "ts-results-es";

/**
 * Calculate the total required amount for each asset based on use amount and max uses
 * @param assets - The list of assets to calculate amounts for
 * @param maxUse - The maximum number of times each asset can be used
 * @param walletTokens - The list of tokens in the user's wallet
 * @returns A Result containing the required amounts or an error
 */
export function calculateRequiredAssetAmount(
  assets: CreateLinkAsset[],
  maxUse: number,
  walletTokens: TokenWithPriceAndBalance[],
): Result<Record<string, bigint>, Error> {
  const requiredAmounts: Record<string, bigint> = {};

  for (const asset of assets) {
    const totalAmount = asset.useAmount * BigInt(maxUse);
    const token = walletTokens.find((t) => t.address === asset.address);
    if (!token) {
      return Err(
        new Error(`Token with address ${asset.address} not found in wallet`),
      );
    }

    requiredAmounts[asset.address] =
      totalAmount + token.fee * (BigInt(1) + BigInt(maxUse));
  }

  return Ok(requiredAmounts);
}

/**
 * Calculate the maximum amount for asset based on wallet balances and fees
 * @param tokenAddress - The address of the token to calculate the max amount for
 * @param maxUse - The maximum number of times each asset can be used
 * @param walletTokens - The list of tokens in the user's wallet
 * @returns A Result containing the maximum amount or an error
 */
export function maxAmountForAsset(
  tokenAddress: string,
  maxUse: number,
  walletTokens: TokenWithPriceAndBalance[],
): Result<bigint, Error> {
  const token = walletTokens.find((t) => t.address === tokenAddress);
  if (!token) {
    return Err(
      new Error(`Token with address ${tokenAddress} not found in wallet`),
    );
  }

  const maxAmount =
    (token.balance - token.fee * (BigInt(1) + BigInt(maxUse))) / BigInt(maxUse);

  return Ok(maxAmount);
}
