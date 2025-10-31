import type { CreateLinkAsset } from "$modules/links/types/createLinkData";
import { walletStore } from "$modules/token/state/walletStore.svelte";
import { Err, Ok, type Result } from "ts-results-es";

/**
 * Calculate the total required amount for each asset based on use amount and max uses
 * @param assets - The list of assets to calculate amounts for
 * @param maxUse - The maximum number of times each asset can be used
 * @returns A Result containing the required amounts or an error
 */
export function calculateRequiredAssetAmount(
  assets: CreateLinkAsset[],
  maxUse: number,
): Result<Record<string, bigint>, Error> {
  const requiredAmounts: Record<string, bigint> = {};

  for (const asset of assets) {
    const totalAmount = asset.useAmount * BigInt(maxUse);
    const tokenResult = walletStore.findTokenByAddress(asset.address);
    if (tokenResult.isErr()) {
      return Err(
        new Error(`Token with address ${asset.address} not found in wallet`),
      );
    }
    const token = tokenResult.unwrap();

    requiredAmounts[asset.address] =
      totalAmount + token.fee * (BigInt(1) + BigInt(maxUse));
  }

  return Ok(requiredAmounts);
}
